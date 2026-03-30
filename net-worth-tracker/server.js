import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// In-memory data storage (for assessment purposes)
let assets = [
  { id: '1', name: 'Barclays Current', type: 'Cash', subtype: 'Current', value: 2500, currency: 'GBP' },
  { id: '2', name: 'Nutmeg ISA', type: 'Investment', subtype: 'ISA', value: 12000, currency: 'GBP' },
  { id: '3', name: 'LISA Savings', type: 'Investment', subtype: 'LISA', value: 4000, currency: 'GBP', lisaBonusPending: 1000 }
];

let liabilities = [
  { id: '1', name: 'Student Loan Plan 2', type: 'Student Loan', planType: 'Plan 2', balance: 45000, interestRate: 7.3, minPayment: 150 },
  { id: '2', name: 'Amex Credit Card', type: 'Credit Card', balance: 1200, interestRate: 22.9, minPayment: 40 }
];

// Historical data for trendline (mocked for initial load)
let history = [
  { date: '2025-01-01', netWorth: -25000 },
  { date: '2025-02-01', netWorth: -24500 },
  { date: '2025-03-01', netWorth: -23800 },
  { date: '2025-04-01', netWorth: -23000 },
  { date: '2025-05-01', netWorth: -22000 },
  { date: '2025-06-01', netWorth: -21000 },
  { date: '2025-07-01', netWorth: -20500 },
  { date: '2025-08-01', netWorth: -19800 },
  { date: '2025-09-01', netWorth: -19000 },
  { date: '2025-10-01', netWorth: -18200 },
  { date: '2025-11-01', netWorth: -17500 },
  { date: '2025-12-01', netWorth: -16800 }
];

// --- API Endpoints ---

// Assets
app.get('/api/assets', (req, res) => {
  res.json(assets);
});

app.post('/api/assets', (req, res) => {
  const asset = { ...req.body, id: Date.now().toString() };
  // LISA Logic: Auto-calculate 25% bonus if LISA
  if (asset.subtype === 'LISA') {
    asset.lisaBonusPending = asset.value * 0.25;
  }
  assets.push(asset);
  res.status(201).json(asset);
});

app.delete('/api/assets/:id', (req, res) => {
  assets = assets.filter(a => a.id !== req.params.id);
  res.status(204).send();
});

// Liabilities
app.get('/api/liabilities', (req, res) => {
  res.json(liabilities);
});

app.post('/api/liabilities', (req, res) => {
  const liability = { ...req.body, id: Date.now().toString() };
  liabilities.push(liability);
  res.status(201).json(liability);
});

app.delete('/api/liabilities/:id', (req, res) => {
  liabilities = liabilities.filter(l => l.id !== req.params.id);
  res.status(204).send();
});

// Summary & Projections
app.get('/api/summary', (req, res) => {
  const totalAssets = assets.reduce((sum, a) => sum + Number(a.value) + (Number(a.lisaBonusPending) || 0), 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + Number(l.balance), 0);
  const netWorth = totalAssets - totalLiabilities;

  // Allocation
  const allocation = {
    Cash: assets.filter(a => a.type === 'Cash').reduce((sum, a) => sum + Number(a.value), 0),
    Investments: assets.filter(a => a.type === 'Investment').reduce((sum, a) => sum + Number(a.value) + (Number(a.lisaBonusPending) || 0), 0),
    Property: assets.filter(a => a.type === 'Property').reduce((sum, a) => sum + Number(a.value), 0)
  };

  // Ratios
  const debtToEquity = totalAssets > 0 ? (totalLiabilities / totalAssets).toFixed(2) : 'N/A';
  const cashOnHand = allocation.Cash;
  const monthlyDebtObligations = liabilities.reduce((sum, l) => sum + (Number(l.minPayment) || 0), 0);
  const liquidityRatio = monthlyDebtObligations > 0 ? (cashOnHand / monthlyDebtObligations).toFixed(2) : 'N/A';

  // Projections (Simple linear for demo)
  const growthRate = 0.07; // 7% default
  const projections = [1, 5, 10].map(years => ({
    years,
    projectedNetWorth: Math.round(netWorth * Math.pow(1 + growthRate, years))
  }));

  res.json({
    totalAssets,
    totalLiabilities,
    netWorth,
    allocation,
    ratios: {
      debtToEquity,
      liquidityRatio
    },
    projections,
    history
  });
});

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
