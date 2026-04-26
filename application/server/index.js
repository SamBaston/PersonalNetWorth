const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 8080;
const dataPath = path.join(__dirname, '../data/data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── Helpers ──────────────────────────────────────────────────────────────────

async function readData() {
    const raw = await fs.readFile(dataPath, 'utf8');
    return JSON.parse(raw);
}

async function writeData(data) {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf8');
}

// ── Stock price enrichment ────────────────────────────────────────────────────

async function enrichWithStockPrices(data) {
    if (!data.assets || !data.assets.stock_portfolios) return data;

    for (const portfolio of data.assets.stock_portfolios) {
        if (portfolio.type === 'tickers' && portfolio.tickers) {
            let totalValue = 0;
            for (const ticker of portfolio.tickers) {
                try {
                    const response = await fetch(
                        `https://query2.finance.yahoo.com/v8/finance/chart/${ticker.symbol}`,
                        { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }
                    );
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const json = await response.json();
                    const meta = json.chart.result[0].meta;
                    ticker.current_price = meta.regularMarketPrice;
                    ticker.currency = meta.currency;
                    ticker.value = ticker.current_price * ticker.quantity;
                    totalValue += ticker.value;
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

// ── Interest accrual ─────────────────────────────────────────────────────────

/**
 * Calculates simple daily interest accrued since `lastUpdated`.
 * Uses the standard actuarial 365-day basis.
 *
 * @param {number} balance        - Current outstanding balance
 * @param {number} annualRatePct  - Annual interest rate as a percentage (e.g. 7.3)
 * @param {string} lastUpdated    - ISO date string of last balance update
 * @returns {number} Accrued interest in the same currency as balance
 */
function calcAccruedInterest(balance, annualRatePct, lastUpdated) {
    if (!lastUpdated || !annualRatePct || balance <= 0) return 0;
    const daysDiff = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff <= 0) return 0;
    const dailyRate = annualRatePct / 100 / 365;
    return balance * dailyRate * daysDiff;
}

/**
 * Applies interest accrual in-place to all student loans and general debts.
 * Updates balance and last_updated; does NOT push to history (history is
 * reserved for manual balance edits so it remains meaningful).
 */
function applyInterestAccrual(data) {
    if (!data.liabilities) return data;

    const processItem = (item) => {
        if (!item.interest_rate || !item.last_updated) return;
        const accrued = calcAccruedInterest(item.balance, item.interest_rate, item.last_updated);
        if (accrued > 0.001) {
            item.balance = parseFloat((item.balance + accrued).toFixed(2));
            item.last_updated = new Date().toISOString();
        }
    };

    (data.liabilities.student_loans || []).forEach(processItem);
    (data.liabilities.general_debts  || []).forEach(processItem);

    return data;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET all wealth data (assets + liabilities with live interest)
app.get('/api/wealth', async (req, res) => {
    try {
        let data = await readData();
        data = await enrichWithStockPrices(data);
        data = applyInterestAccrual(data);
        // Persist updated balances so accrual doesn't re-compound on the next
        // request from the same "origin" date.
        await writeData(data);
        res.json(data);
    } catch (err) {
        console.error('Error serving wealth data:', err);
        res.status(500).json({ error: 'Failed to process wealth data' });
    }
});

// ── Asset CRUD ────────────────────────────────────────────────────────────────

app.post('/api/assets/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const data = await readData();
        if (!data.assets[category]) data.assets[category] = [];

        const newAsset = {
            id: Date.now().toString(),
            ...req.body,
            history: [{ date: new Date().toISOString(), ...req.body }]
        };

        data.assets[category].push(newAsset);
        await writeData(data);
        res.json({ success: true, asset: newAsset });
    } catch (err) {
        console.error('Asset create error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/assets/:category/:id', async (req, res) => {
    try {
        const { category, id } = req.params;
        const data = await readData();
        const list = data.assets[category];
        if (!list) return res.status(404).json({ error: 'Category not found' });

        const index = list.findIndex(a => a.id === id);
        if (index === -1) return res.status(404).json({ error: 'Asset not found' });

        const updatedAsset = { ...list[index], ...req.body };
        if (!updatedAsset.history) updatedAsset.history = [];

        const snapshot = { date: new Date().toISOString() };
        if (category === 'lisas') {
            snapshot.base_balance = updatedAsset.base_balance;
            snapshot.pending_bonus = updatedAsset.pending_bonus;
        } else {
            snapshot.balance = updatedAsset.balance;
        }
        updatedAsset.history.push(snapshot);

        data.assets[category][index] = updatedAsset;
        await writeData(data);
        res.json({ success: true, asset: updatedAsset });
    } catch (err) {
        console.error('Asset update error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/assets/:category/:id', async (req, res) => {
    try {
        const { category, id } = req.params;
        const data = await readData();
        if (!data.assets[category]) return res.status(404).json({ error: 'Category not found' });

        data.assets[category] = data.assets[category].filter(a => a.id !== id);
        await writeData(data);
        res.json({ success: true });
    } catch (err) {
        console.error('Asset delete error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── Liability CRUD ────────────────────────────────────────────────────────────
// Categories: "student_loans" | "general_debts"

app.post('/api/liabilities/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const data = await readData();
        if (!data.liabilities[category]) data.liabilities[category] = [];

        const now = new Date().toISOString();
        const newLiability = {
            id: Date.now().toString(),
            ...req.body,
            last_updated: now,
            history: [{ date: now, balance: req.body.balance }]
        };

        data.liabilities[category].push(newLiability);
        await writeData(data);
        res.json({ success: true, liability: newLiability });
    } catch (err) {
        console.error('Liability create error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/liabilities/:category/:id', async (req, res) => {
    try {
        const { category, id } = req.params;
        const data = await readData();
        const list = data.liabilities[category];
        if (!list) return res.status(404).json({ error: 'Category not found' });

        const index = list.findIndex(l => l.id === id);
        if (index === -1) return res.status(404).json({ error: 'Liability not found' });

        const now = new Date().toISOString();
        const updated = { ...list[index], ...req.body, last_updated: now };

        if (!updated.history) updated.history = [];
        updated.history.push({ date: now, balance: updated.balance });

        data.liabilities[category][index] = updated;
        await writeData(data);
        res.json({ success: true, liability: updated });
    } catch (err) {
        console.error('Liability update error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/liabilities/:category/:id', async (req, res) => {
    try {
        const { category, id } = req.params;
        const data = await readData();
        if (!data.liabilities[category]) return res.status(404).json({ error: 'Category not found' });

        data.liabilities[category] = data.liabilities[category].filter(l => l.id !== id);
        await writeData(data);
        res.json({ success: true });
    } catch (err) {
        console.error('Liability delete error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
