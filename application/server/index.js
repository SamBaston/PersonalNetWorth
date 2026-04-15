const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const DATA_PATH = path.join(__dirname, '../data/data.json');

// ─── Data Helpers ────────────────────────────────────────────────────────────

function readData() {
    try {
        return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    } catch (e) {
        console.error('Error reading data:', e.message);
        throw e;
    }
}

function writeData(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function generateId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Wealth Data ─────────────────────────────────────────────────────────────

app.get('/api/wealth', (req, res) => {
    try {
        res.json(readData());
    } catch (e) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

app.post('/api/wealth', (req, res) => {
    try {
        writeData(req.body);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// ─── Bank Accounts ───────────────────────────────────────────────────────────

app.post('/api/bank', (req, res) => {
    try {
        const data = readData();
        const account = { id: generateId('ba'), ...req.body };
        if (!account.name || !account.type || account.balance === undefined) {
            return res.status(400).json({ error: 'name, type and balance are required' });
        }
        data.bankAccounts.push(account);
        writeData(data);
        res.json(account);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/bank/:id', (req, res) => {
    try {
        const data = readData();
        const idx = data.bankAccounts.findIndex(a => a.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Account not found' });
        data.bankAccounts[idx] = { ...data.bankAccounts[idx], ...req.body, id: req.params.id };
        writeData(data);
        res.json(data.bankAccounts[idx]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/bank/:id', (req, res) => {
    try {
        const data = readData();
        data.bankAccounts = data.bankAccounts.filter(a => a.id !== req.params.id);
        writeData(data);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── ISA Accounts ────────────────────────────────────────────────────────────

app.post('/api/isa', (req, res) => {
    try {
        const data = readData();
        const account = { id: generateId('isa'), annualLimit: 20000, currency: 'GBP', ...req.body };
        data.isaAccounts.push(account);
        writeData(data);
        res.json(account);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/isa/:id', (req, res) => {
    try {
        const data = readData();
        const idx = data.isaAccounts.findIndex(a => a.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'ISA not found' });
        data.isaAccounts[idx] = { ...data.isaAccounts[idx], ...req.body, id: req.params.id };
        writeData(data);
        res.json(data.isaAccounts[idx]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/isa/:id', (req, res) => {
    try {
        const data = readData();
        data.isaAccounts = data.isaAccounts.filter(a => a.id !== req.params.id);
        writeData(data);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── LISA Accounts ───────────────────────────────────────────────────────────

app.post('/api/lisa', (req, res) => {
    try {
        const data = readData();
        const account = {
            id: generateId('lisa'),
            currency: 'GBP',
            bonusPending: 0,
            bonusReceived: 0,
            ...req.body
        };
        // Auto-calculate pending bonus: 25% of yearContribution, capped at £1000
        if (account.yearContribution !== undefined && account.bonusPending === 0) {
            account.bonusPending = Math.min(account.yearContribution * 0.25, 1000);
        }
        data.lisaAccounts.push(account);
        writeData(data);
        res.json(account);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/lisa/:id', (req, res) => {
    try {
        const data = readData();
        const idx = data.lisaAccounts.findIndex(a => a.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'LISA not found' });
        data.lisaAccounts[idx] = { ...data.lisaAccounts[idx], ...req.body, id: req.params.id };
        writeData(data);
        res.json(data.lisaAccounts[idx]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/lisa/:id', (req, res) => {
    try {
        const data = readData();
        data.lisaAccounts = data.lisaAccounts.filter(a => a.id !== req.params.id);
        writeData(data);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Stock Holdings ──────────────────────────────────────────────────────────

app.post('/api/stock', async (req, res) => {
    try {
        const data = readData();
        const { ticker, shares, manualPrice } = req.body;
        if (!ticker || !shares) return res.status(400).json({ error: 'ticker and shares required' });

        const holding = {
            id: generateId('sh'),
            ticker: ticker.toUpperCase(),
            shares: parseFloat(shares),
            name: ticker.toUpperCase(),
            lastPrice: manualPrice ? parseFloat(manualPrice) : null,
            currency: 'USD',
            change: null,
            changePercent: null,
            lastFetched: null
        };

        // Try to fetch live price
        try {
            const priceData = await fetchStockPrice(ticker);
            holding.name = priceData.shortName || ticker.toUpperCase();
            holding.lastPrice = priceData.price;
            holding.currency = priceData.currency;
            holding.change = priceData.change;
            holding.changePercent = priceData.changePercent;
            holding.lastFetched = priceData.fetchedAt;
        } catch (e) {
            console.warn(`Could not fetch price for ${ticker}:`, e.message);
            if (manualPrice) holding.lastPrice = parseFloat(manualPrice);
        }

        data.stockHoldings.push(holding);
        writeData(data);
        res.json(holding);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/stock/:id', (req, res) => {
    try {
        const data = readData();
        const idx = data.stockHoldings.findIndex(h => h.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Holding not found' });
        data.stockHoldings[idx] = { ...data.stockHoldings[idx], ...req.body, id: req.params.id };
        writeData(data);
        res.json(data.stockHoldings[idx]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/stock/:id', (req, res) => {
    try {
        const data = readData();
        data.stockHoldings = data.stockHoldings.filter(h => h.id !== req.params.id);
        writeData(data);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Refresh all stock prices
app.post('/api/stocks/refresh', async (req, res) => {
    try {
        const data = readData();
        if (!data.stockHoldings || data.stockHoldings.length === 0) {
            return res.json({ updated: 0, holdings: [] });
        }

        const results = await Promise.allSettled(
            data.stockHoldings.map(h => fetchStockPrice(h.ticker))
        );

        let updated = 0;
        results.forEach((result, i) => {
            if (result.status === 'fulfilled') {
                const p = result.value;
                data.stockHoldings[i].lastPrice = p.price;
                data.stockHoldings[i].name = p.shortName || data.stockHoldings[i].ticker;
                data.stockHoldings[i].currency = p.currency;
                data.stockHoldings[i].change = p.change;
                data.stockHoldings[i].changePercent = p.changePercent;
                data.stockHoldings[i].lastFetched = p.fetchedAt;
                updated++;
            } else {
                console.warn(`Failed to refresh ${data.stockHoldings[i].ticker}:`, result.reason.message);
            }
        });

        writeData(data);
        res.json({ updated, holdings: data.stockHoldings });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Single ticker price lookup
app.get('/api/stock/price/:ticker', async (req, res) => {
    try {
        const priceData = await fetchStockPrice(req.params.ticker);
        res.json(priceData);
    } catch (e) {
        res.status(404).json({ error: e.message });
    }
});

// ─── Yahoo Finance Helper ─────────────────────────────────────────────────────

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || 'd7fnqvpr01qpjqqlgcj0d7fnqvpr01qpjqqlgcjg';

async function fetchStockPrice(ticker) {
    return new Promise((resolve, reject) => {
        // Finnhub uses different symbols for LSE: LGEN.L → LGEN.L
        const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker.toUpperCase())}&token=${FINNHUB_KEY}`;
        
        https.get(url, (response) => {
            let raw = '';
            response.on('data', chunk => raw += chunk);
            response.on('end', () => {
                try {
                    const data = JSON.parse(raw);
                    if (data.error) return reject(new Error(data.error));
                    if (data.c === 0) return reject(new Error(`No data for ${ticker}`));
                    
                    resolve({
                        ticker: ticker.toUpperCase(),
                        shortName: ticker.toUpperCase(), // Finnhub quote doesn't include name
                        price: data.c,           // Current price
                        previousClose: data.pc,  // Previous close
                        currency: 'USD',         // Finnhub quote doesn't include currency
                        change: data.d,          // Change
                        changePercent: data.dp,  // Change percent
                        fetchedAt: new Date().toISOString()
                    });
                } catch (e) {
                    reject(new Error(`Failed to parse data for ${ticker}`));
                }
            });
        }).on('error', err => reject(new Error(`Network error: ${err.message}`)));
    });
}

// ─── Liabilities ─────────────────────────────────────────────────────────────

app.post('/api/liability', (req, res) => {
    try {
        const data = readData();
        const liability = { id: generateId('li'), currency: 'GBP', ...req.body };
        data.liabilities.push(liability);
        writeData(data);
        res.json(liability);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/liability/:id', (req, res) => {
    try {
        const data = readData();
        const idx = data.liabilities.findIndex(l => l.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Liability not found' });
        data.liabilities[idx] = { ...data.liabilities[idx], ...req.body, id: req.params.id };
        writeData(data);
        res.json(data.liabilities[idx]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/liability/:id', (req, res) => {
    try {
        const data = readData();
        data.liabilities = data.liabilities.filter(l => l.id !== req.params.id);
        writeData(data);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`Wealth Tracker running → http://localhost:${PORT}`);
});
