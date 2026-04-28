const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

const DATA_PATH = path.join(__dirname, '../data/data.json');
const FX_RATE_USD_TO_GBP = 0.79;

// Helper: Convert to GBP
function toGBP(amount, currency) {
  if (amount === undefined) return 0;
  return currency === 'USD' ? amount * FX_RATE_USD_TO_GBP : amount;
}

// Helper: Read Data
async function readData() {
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  return JSON.parse(raw);
}

// Helper: Write Data
async function writeData(data) {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Logic: Calculate Summary & Predictions
async function getFinancialInsights(data) {
  let totalAssets = 0;
  let totalLiabilities = 0;
  let scoreLiabilities = 0;

  // Process Stock Tickers in portfolios
  for (const portfolio of data.assets.stock_portfolios) {
    if (portfolio.type === 'tickers' && portfolio.tickers) {
      let portfolioBalance = 0;
      for (const ticker of portfolio.tickers) {
        ticker.value = ticker.quantity * ticker.current_price;
        portfolioBalance += ticker.value;
      }
      portfolio.balance = portfolioBalance;
    }
  }

  // Assets calculation
  Object.values(data.assets).forEach(category => {
    category.forEach(asset => {
      const balance = (asset.balance ?? 0) + (asset.base_balance ?? 0) + (asset.pending_bonus ?? 0);
      totalAssets += toGBP(balance, asset.currency);
    });
  });

  // Accrue Interest for Liabilities
  const now = new Date();
  Object.entries(data.liabilities).forEach(([key, category]) => {
    category.forEach(liability => {
      const lastAccrual = liability.last_accrual_date ? new Date(liability.last_accrual_date) : now;
      const daysDiff = (now - lastAccrual) / (1000 * 60 * 60 * 24);
      
      if (daysDiff >= 1 && liability.annual_interest_rate > 0) {
        const dailyRate = liability.annual_interest_rate / 100 / 365;
        const newBalance = liability.balance * Math.pow(1 + dailyRate, daysDiff);
        liability.accrued_since_last_update = (liability.accrued_since_last_update || 0) + (newBalance - liability.balance);
        liability.balance = parseFloat(newBalance.toFixed(2));
        liability.last_accrual_date = now.toISOString();
      }
      const val = toGBP(liability.balance, liability.currency);
      totalLiabilities += val;
      // Exclude student loans from responsibility score
      if (key !== 'student_loans') {
        scoreLiabilities += val;
      }
    });
  });
  
  await writeData(data); // Save accrued/ticker-updated data

  const netWorth = totalAssets - totalLiabilities;
  const ltv = totalAssets > 0 ? scoreLiabilities / totalAssets : 0;
  // Score: 100 when no debt, decreases as LTV increases, can go negative
  const responsibilityScore = Math.min(100, 100 * (1 - ltv));

  // Simple Asset Distribution
  const distribution = [
    { name: 'Cash', value: 0 },
    { name: 'Investment', value: 0 },
    { name: 'Property', value: 0 }
  ];

  Object.entries(data.assets).forEach(([key, items]) => {
     items.forEach(item => {
        const val = toGBP((item.balance ?? 0) + (item.base_balance ?? 0) + (item.pending_bonus ?? 0), item.currency);
        if (key === 'bank_accounts' || key === 'lisas') distribution[0].value += val;
        else if (key === 'properties') distribution[2].value += val;
        else distribution[1].value += val;
     });
  });

  // Predictions & History (12 months back, 36 months forward)
  const predictions = [];
  
  for (let i = -12; i <= 36; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + i);
    
    let pAssets = 0;
    let pLiabilities = 0;

    // Asset growth simulation
    Object.values(data.assets).forEach(cat => cat.forEach(a => {
        const start = (a.balance ?? 0) + (a.base_balance ?? 0) + (a.pending_bonus ?? 0);
        // Properties grow at 4%, Stocks 7%, Cash 2%
        let rate = 0.02;
        if (a.type.toLowerCase().includes('stock')) rate = 0.07;
        if (Object.keys(data.assets).find(k => data.assets[k].includes(a)) === 'properties') rate = 0.04;
        
        // Reverse growth for history
        const val = start * Math.pow(1 + (rate/12), i);
        pAssets += toGBP(val, a.currency);
    }));

    // Debt decay simulation
    Object.entries(data.liabilities).forEach(([key, cat]) => cat.forEach(l => {
        let bal = l.balance;
        const rate = (l.annual_interest_rate / 100) / 12;
        const pay = l.minimum_monthly_payment ?? 0;
        
        if (i >= 0) {
            for (let m = 0; m < i; m++) {
                bal = Math.max(0, bal + (bal * rate) - pay);
            }
        } else {
            // Simple reverse approximation for history
            for (let m = 0; m < Math.abs(i); m++) {
                bal = (bal + pay) / (1 + rate);
            }
        }
        pLiabilities += toGBP(bal, l.currency);
    }));

    predictions.push({
      date: d.toISOString(),
      netWorth: parseFloat((pAssets - pLiabilities).toFixed(2)),
      isPredicted: i > 0
    });
  }

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    responsibilityScore,
    ltv,
    distribution: distribution.filter(d => d.value > 0),
    predictions
  };
}

// API Routes
app.get('/api/wealth', async (req, res) => {
  try {
    const data = await readData();
    const insights = await getFinancialInsights(data);
    res.json({ ...data, summary: insights });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create/Update Asset
app.post('/api/assets/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const data = await readData();
    const asset = req.body;
    if (!data.assets[category]) data.assets[category] = [];
    const index = data.assets[category].findIndex(a => a.id === asset.id);
    if (index > -1) { data.assets[category][index] = { ...data.assets[category][index], ...asset }; }
    else { asset.id = Date.now().toString(); data.assets[category].push(asset); }
    await writeData(data);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete Asset
app.delete('/api/assets/:category/:id', async (req, res) => {
  try {
    const { category, id } = req.params;
    const data = await readData();
    if (data.assets[category]) {
      data.assets[category] = data.assets[category].filter(a => a.id !== id);
      await writeData(data);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create/Update Liability
app.post('/api/liabilities/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const data = await readData();
    const liability = req.body;
    if (!data.liabilities[category]) data.liabilities[category] = [];
    const index = data.liabilities[category].findIndex(l => l.id === liability.id);
    if (index > -1) { data.liabilities[category][index] = { ...data.liabilities[category][index], ...liability }; }
    else { liability.id = Date.now().toString(); data.liabilities[category].push(liability); }
    await writeData(data);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete Liability
app.delete('/api/liabilities/:category/:id', async (req, res) => {
  try {
    const { category, id } = req.params;
    const data = await readData();
    if (data.liabilities[category]) {
      data.liabilities[category] = data.liabilities[category].filter(l => l.id !== id);
      await writeData(data);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
