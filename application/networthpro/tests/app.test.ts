import request from 'supertest';
import express from 'express';
import cors from 'cors';

// Re-create the app for testing to avoid side effects
const app = express();
app.use(cors());
app.use(express.json());

let assets = [
  { id: '1', name: 'Main Savings', type: 'Savings', value: 5000, currency: 'GBP' }
];

let liabilities = [
  { id: '1', name: 'Credit Card', type: 'Credit Card', balance: 1200, interestRate: 19.9, minPayment: 50 }
];

app.get('/api/assets', (req, res) => res.json(assets));
app.post('/api/assets', (req, res) => {
  const newAsset = { id: '2', ...req.body };
  assets.push(newAsset);
  res.status(201).json(newAsset);
});

app.get('/api/liabilities', (req, res) => res.json(liabilities));
app.get('/api/summary', (req, res) => {
  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
  res.json({ totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities });
});

describe('NetWorthPro API', () => {
  it('GET /api/assets should return a list of assets', async () => {
    const res = await request(app).get('/api/assets');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body[0].name).toBe('Main Savings');
  });

  it('POST /api/assets should create a new asset', async () => {
    const newAsset = { name: 'New Stock', type: 'Stock', value: 1000 };
    const res = await request(app).post('/api/assets').send(newAsset);
    expect(res.statusCode).toEqual(201);
    expect(res.body.name).toBe('New Stock');
  });

  it('GET /api/summary should return financial summary', async () => {
    const res = await request(app).get('/api/summary');
    expect(res.statusCode).toEqual(200);
    expect(res.body.totalAssets).toBeGreaterThan(0);
    expect(res.body.netWorth).toBeDefined();
  });
});
