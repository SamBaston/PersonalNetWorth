const express = require('express');
const path = require('path');
const fs = require('fs').promises; // Use async promises built-in module

const app = express();
const PORT = process.env.PORT || 8080;
const dataPath = path.join(__dirname, '../data/data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Helper to read data
async function readData() {
    const raw = await fs.readFile(dataPath, 'utf8');
    return JSON.parse(raw);
}

// Helper to write data
async function writeData(data) {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf8');
}

// Function to fetch real-time stock prices
async function enrichWithStockPrices(data) {
    if (!data.assets || !data.assets.stock_portfolios) return data;
    
    for (let portfolio of data.assets.stock_portfolios) {
        if (portfolio.type === 'tickers' && portfolio.tickers) {
            let totalValue = 0;
            for (let ticker of portfolio.tickers) {
                try {
                    const response = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${ticker.symbol}`, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    
                    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
                    const json = await response.json();
                    
                    const meta = json.chart.result[0].meta;
                    const price = meta.regularMarketPrice;
                    ticker.current_price = price;
                    ticker.currency = meta.currency;
                    
                    const value = price * ticker.quantity;
                    ticker.value = value;
                    totalValue += value;
                } catch (err) {
                    console.error(`Failed to fetch price for ${ticker.symbol}:`, err.message);
                    ticker.current_price = 0;
                    ticker.value = 0;
                }
            }
            portfolio.balance = totalValue;
        }
    }
    return data;
}

// ─── Interest Accrual Logic ────────────────────────────────────────────────────

/**
 * UK Student Loan Plan 2 interest rate is RPI + up to 3%.
 * We store the rate on the record (user-supplied or default), so this simply
 * applies compound daily interest since the last accrual date.
 */
function accrueInterest(debt) {
    const now = new Date();
    const lastAccrual = debt.last_accrual_date ? new Date(debt.last_accrual_date) : now;
    const daysDiff = Math.max(0, (now - lastAccrual) / (1000 * 60 * 60 * 24));

    if (daysDiff < 1 || !debt.annual_interest_rate || debt.annual_interest_rate <= 0) {
        return { ...debt };
    }

    const dailyRate = debt.annual_interest_rate / 100 / 365;
    const newBalance = parseFloat((debt.balance * Math.pow(1 + dailyRate, daysDiff)).toFixed(2));
    const accruedInterest = parseFloat((newBalance - debt.balance).toFixed(2));

    return {
        ...debt,
        balance: newBalance,
        last_accrual_date: now.toISOString(),
        accrued_since_last_update: accruedInterest
    };
}

/**
 * Apply accrual to every debt in every category and persist the result.
 */
async function accrueAllDebts(data) {
    if (!data.liabilities) return data;
    const categories = ['student_loans', 'credit_cards', 'personal_loans', 'mortgages'];
    for (const cat of categories) {
        if (Array.isArray(data.liabilities[cat])) {
            data.liabilities[cat] = data.liabilities[cat].map(debt => accrueInterest(debt));
        }
    }
    return data;
}

// ─── Validation Helpers ───────────────────────────────────────────────────────

const DEBT_CATEGORIES = ['student_loans', 'credit_cards', 'personal_loans', 'mortgages'];

function validateDebt(category, body) {
    const errors = [];

    if (!body.name || body.name.trim() === '') errors.push('Name is required.');

    const balance = parseFloat(body.balance);
    if (isNaN(balance) || balance < 0) errors.push('Balance must be a non-negative number.');

    const rate = parseFloat(body.annual_interest_rate);
    if (isNaN(rate) || rate < 0 || rate > 100) errors.push('Annual interest rate must be between 0 and 100.');

    if (category === 'student_loans') {
        const valid = ['plan1', 'plan2', 'plan4', 'plan5', 'postgrad'];
        if (!valid.includes(body.plan_type)) errors.push('Invalid student loan plan type.');
    }

    if (['credit_cards', 'personal_loans', 'mortgages'].includes(category)) {
        const minPayment = parseFloat(body.minimum_monthly_payment);
        if (isNaN(minPayment) || minPayment < 0) errors.push('Minimum monthly payment must be a non-negative number.');
    }

    if (category === 'credit_cards') {
        const limit = parseFloat(body.credit_limit);
        if (!isNaN(limit) && limit < 0) errors.push('Credit limit cannot be negative.');
        if (!isNaN(limit) && !isNaN(balance) && balance > limit) errors.push('Balance cannot exceed credit limit.');
    }

    if (category === 'mortgages') {
        const propVal = parseFloat(body.property_value);
        if (!isNaN(propVal) && propVal < 0) errors.push('Property value cannot be negative.');
    }

    return errors;
}

// ─── Wealth API ───────────────────────────────────────────────────────────────

// GET all wealth data (with stock prices + accrued interest)
app.get('/api/wealth', async (req, res) => {
    try {
        let parsedData = await readData();
        parsedData = await enrichWithStockPrices(parsedData);
        parsedData = await accrueAllDebts(parsedData);
        // Persist the accrued balances so history stays accurate
        await writeData(parsedData);
        res.json(parsedData);
    } catch (err) {
        console.error('Error serving wealth data:', err);
        res.status(500).json({ error: 'Failed to process wealth data' });
    }
});

// ─── Asset CRUD ───────────────────────────────────────────────────────────────

// CREATE asset
app.post('/api/assets/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const data = await readData();
        if (!data.assets[category]) data.assets[category] = [];
        
        const newAsset = {
            id: Date.now().toString(),
            ...req.body,
            history: [{ date: new Date().toISOString(), ...req.body }] // Track initial state
        };
        
        data.assets[category].push(newAsset);
        await writeData(data);
        res.json({ success: true, asset: newAsset });
    } catch (err) {
        console.error('Save error:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE asset
app.put('/api/assets/:category/:id', async (req, res) => {
    try {
        const { category, id } = req.params;
        const data = await readData();
        const list = data.assets[category];
        if (!list) return res.status(404).json({ error: 'Category not found' });
        
        const index = list.findIndex(a => a.id === id);
        if (index === -1) return res.status(404).json({ error: 'Asset not found' });
        
        const updatedAsset = { ...list[index], ...req.body };
        
        // Track the historical value over time when an edit occurs
        if (!updatedAsset.history) updatedAsset.history = [];
        const historySnapshot = { date: new Date().toISOString() };
        if (category === 'lisas') {
            historySnapshot.base_balance = updatedAsset.base_balance;
            historySnapshot.pending_bonus = updatedAsset.pending_bonus;
        } else {
            historySnapshot.balance = updatedAsset.balance;
        }
        updatedAsset.history.push(historySnapshot);
        
        data.assets[category][index] = updatedAsset;
        await writeData(data);
        res.json({ success: true, asset: updatedAsset });
    } catch (err) {
        console.error('Update error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE asset
app.delete('/api/assets/:category/:id', async (req, res) => {
    try {
        const { category, id } = req.params;
        const data = await readData();
        if (!data.assets[category]) return res.status(404).json({ error: 'Category not found' });
        
        data.assets[category] = data.assets[category].filter(a => a.id !== id);
        await writeData(data);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Debt CRUD ────────────────────────────────────────────────────────────────

// CREATE debt
app.post('/api/debts/:category', async (req, res) => {
    try {
        const { category } = req.params;
        if (!DEBT_CATEGORIES.includes(category)) {
            return res.status(400).json({ error: 'Invalid debt category.' });
        }

        const errors = validateDebt(category, req.body);
        if (errors.length > 0) return res.status(400).json({ errors });

        const data = await readData();
        if (!data.liabilities[category]) data.liabilities[category] = [];

        const now = new Date().toISOString();
        const newDebt = {
            id: Date.now().toString(),
            ...req.body,
            balance: parseFloat(req.body.balance),
            annual_interest_rate: parseFloat(req.body.annual_interest_rate) || 0,
            last_accrual_date: now,
            history: [{
                date: now,
                balance: parseFloat(req.body.balance),
                accrued_interest: 0
            }]
        };

        data.liabilities[category].push(newDebt);
        await writeData(data);
        res.json({ success: true, debt: newDebt });
    } catch (err) {
        console.error('Debt create error:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE debt
app.put('/api/debts/:category/:id', async (req, res) => {
    try {
        const { category, id } = req.params;
        if (!DEBT_CATEGORIES.includes(category)) {
            return res.status(400).json({ error: 'Invalid debt category.' });
        }

        const errors = validateDebt(category, req.body);
        if (errors.length > 0) return res.status(400).json({ errors });

        const data = await readData();
        const list = data.liabilities[category];
        if (!list) return res.status(404).json({ error: 'Category not found' });

        const index = list.findIndex(d => d.id === id);
        if (index === -1) return res.status(404).json({ error: 'Debt not found' });

        const existing = list[index];
        const newBalance = parseFloat(req.body.balance);

        const updatedDebt = {
            ...existing,
            ...req.body,
            balance: newBalance,
            annual_interest_rate: parseFloat(req.body.annual_interest_rate) || 0,
            last_accrual_date: new Date().toISOString()
        };

        // Push a history snapshot whenever the balance is manually updated
        if (!updatedDebt.history) updatedDebt.history = [];
        updatedDebt.history.push({
            date: new Date().toISOString(),
            balance: newBalance,
            accrued_interest: 0,
            manual_update: true
        });

        data.liabilities[category][index] = updatedDebt;
        await writeData(data);
        res.json({ success: true, debt: updatedDebt });
    } catch (err) {
        console.error('Debt update error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE debt
app.delete('/api/debts/:category/:id', async (req, res) => {
    try {
        const { category, id } = req.params;
        if (!DEBT_CATEGORIES.includes(category)) {
            return res.status(400).json({ error: 'Invalid debt category.' });
        }

        const data = await readData();
        if (!data.liabilities[category]) return res.status(404).json({ error: 'Category not found' });

        data.liabilities[category] = data.liabilities[category].filter(d => d.id !== id);
        await writeData(data);
        res.json({ success: true });
    } catch (err) {
        console.error('Debt delete error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running! Access the app at http://localhost:${PORT}`);
});
