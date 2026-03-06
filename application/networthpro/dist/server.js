import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// In-memory data store
let assets = [
    { id: '1', name: 'Main Savings', type: 'Savings', value: 5000, currency: 'GBP' },
    { id: '2', name: 'S&P 500 ETF', type: 'Stock', value: 12000, currency: 'GBP', ticker: 'VOO' },
    { id: '3', name: 'LISA', type: 'LISA', value: 4000, currency: 'GBP', bonus: 1000 }
];
let liabilities = [
    { id: '1', name: 'Student Loan (Plan 2)', type: 'Student Loan', balance: 45000, interestRate: 7.1, minPayment: 0 },
    { id: '2', name: 'Credit Card', type: 'Credit Card', balance: 1200, interestRate: 19.9, minPayment: 50 }
];
// --- API Routes ---
// Assets API
app.get('/api/assets', (req, res) => {
    res.json(assets);
});
app.get('/api/assets/:id', (req, res) => {
    const asset = assets.find(a => a.id === req.params.id);
    if (!asset)
        return res.status(404).json({ error: 'Asset not found' });
    res.json(asset);
});
app.post('/api/assets', (req, res) => {
    const { name, type, value, currency, bonus, ticker } = req.body;
    if (!name || !type || value === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const newAsset = {
        id: Date.now().toString(),
        name,
        type,
        value: Number(value),
        currency: currency || 'GBP',
        bonus: bonus ? Number(bonus) : undefined,
        ticker
    };
    assets.push(newAsset);
    res.status(201).json(newAsset);
});
// Liabilities API
app.get('/api/liabilities', (req, res) => {
    res.json(liabilities);
});
app.get('/api/liabilities/:id', (req, res) => {
    const liability = liabilities.find(l => l.id === req.params.id);
    if (!liability)
        return res.status(404).json({ error: 'Liability not found' });
    res.json(liability);
});
app.post('/api/liabilities', (req, res) => {
    const { name, type, balance, interestRate, minPayment } = req.body;
    if (!name || !type || balance === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const newLiability = {
        id: Date.now().toString(),
        name,
        type,
        balance: Number(balance),
        interestRate: Number(interestRate || 0),
        minPayment: Number(minPayment || 0)
    };
    liabilities.push(newLiability);
    res.status(201).json(newLiability);
});
// Summary API (Calculated data)
app.get('/api/summary', (req, res) => {
    const totalAssets = assets.reduce((sum, a) => sum + a.value + (a.bonus || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
    const netWorth = totalAssets - totalLiabilities;
    const allocation = {
        Cash: assets.filter(a => ['Savings', 'Current'].includes(a.type)).reduce((sum, a) => sum + a.value, 0),
        Investments: assets.filter(a => ['Stock', 'ISA', 'LISA'].includes(a.type)).reduce((sum, a) => sum + a.value + (a.bonus || 0), 0),
        Property: assets.filter(a => a.type === 'Property').reduce((sum, a) => sum + a.value, 0)
    };
    const monthlyDebtObligations = liabilities.reduce((sum, l) => sum + l.minPayment, 0);
    const liquidityRatio = allocation.Cash / (monthlyDebtObligations || 1);
    const debtToEquity = totalLiabilities / (netWorth || 1);
    res.json({
        totalAssets,
        totalLiabilities,
        netWorth,
        allocation,
        liquidityRatio,
        debtToEquity
    });
});
// Serve the SPA
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
