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

// GET all wealth data
app.get('/api/wealth', async (req, res) => {
    try {
        let parsedData = await readData();
        // Enrich the data with external stock prices
        parsedData = await enrichWithStockPrices(parsedData);
        res.json(parsedData);
    } catch (err) {
        console.error('Error serving wealth data:', err);
        res.status(500).json({ error: 'Failed to process wealth data' });
    }
});

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

app.listen(PORT, () => {
    console.log(`Server is running! Access the app at http://localhost:${PORT}`);
});
