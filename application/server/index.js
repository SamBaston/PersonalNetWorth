const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = 3000; // Hardcoded to 3000 as per environment constraints
const dataPath = path.join(__dirname, '../data/data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

async function readData() {
    try {
        const raw = await fs.readFile(dataPath, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        console.error('Error reading data:', err);
        return { assets: {}, liabilities: [] };
    }
}

async function writeData(data) {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf8');
}

async function enrichWithStockPrices(data) {
    if (!data.assets || !data.assets.stock_portfolios) return data;
    
    for (let portfolio of data.assets.stock_portfolios) {
        if (portfolio.type === 'tickers' && portfolio.tickers) {
            let totalValue = 0;
            for (let ticker of portfolio.tickers) {
                try {
                    const response = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${ticker.symbol}`, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0'
                        }
                    });
                    
                    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
                    const json = await response.json();
                    
                    if (json.chart && json.chart.result && json.chart.result[0]) {
                        const meta = json.chart.result[0].meta;
                        const price = meta.regularMarketPrice;
                        ticker.current_price = price;
                        ticker.currency = meta.currency;
                        
                        const value = price * ticker.quantity;
                        ticker.value = value;
                        totalValue += value;
                    }
                } catch (err) {
                    console.error(`Failed to fetch price for ${ticker.symbol}:`, err.message);
                    ticker.current_price = ticker.current_price || 0;
                    ticker.value = ticker.value || 0;
                }
            }
            portfolio.balance = totalValue;
        }
    }
    return data;
}

app.get('/api/wealth', async (req, res) => {
    try {
        let parsedData = await readData();
        parsedData = await enrichWithStockPrices(parsedData);
        res.json(parsedData);
    } catch (err) {
        console.error('Error serving wealth data:', err);
        res.status(500).json({ error: 'Failed to process wealth data' });
    }
});

// Assets CRUD
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
        res.status(500).json({ error: err.message });
    }
});

// Liabilities CRUD
app.post('/api/liabilities', async (req, res) => {
    try {
        const data = await readData();
        if (!data.liabilities) data.liabilities = [];
        
        const newLiability = {
            id: Date.now().toString(),
            ...req.body,
            history: [{ date: new Date().toISOString(), balance: req.body.balance }]
        };
        
        data.liabilities.push(newLiability);
        await writeData(data);
        res.json({ success: true, liability: newLiability });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/liabilities/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readData();
        const index = data.liabilities.findIndex(l => l.id === id);
        if (index === -1) return res.status(404).json({ error: 'Liability not found' });
        
        const updatedLiability = { ...data.liabilities[index], ...req.body };
        if (!updatedLiability.history) updatedLiability.history = [];
        
        updatedLiability.history.push({
            date: new Date().toISOString(),
            balance: updatedLiability.balance
        });
        
        data.liabilities[index] = updatedLiability;
        await writeData(data);
        res.json({ success: true, liability: updatedLiability });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/liabilities/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readData();
        data.liabilities = data.liabilities.filter(l => l.id !== id);
        await writeData(data);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
