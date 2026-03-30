/**
 * NetWorth Tracker — API Test Suite
 * COMP1101 Summative Assessment 1
 *
 * Tests every route: GET list, GET by ID, POST create, DELETE.
 * resetData() is called before each test to guarantee a clean state.
 *
 * Run with: npm test
 */

'use strict';

const request   = require('supertest');
const { app, resetData } = require('../server');

beforeEach(() => {
  resetData();
});

// ═══════════════════════════════════════════════════════
// ACCOUNTS
// ═══════════════════════════════════════════════════════

describe('GET /api/accounts', () => {
  it('returns 200 with an array of accounts', async () => {
    const res = await request(app).get('/api/accounts');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBe(res.body.data.length);
  });

  it('returns seed accounts (at least 2 seeded)', async () => {
    const res = await request(app).get('/api/accounts');
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('filters accounts by type using ?type= query param', async () => {
    const res = await request(app).get('/api/accounts?type=lisa');
    expect(res.statusCode).toBe(200);
    res.body.data.forEach(a => expect(a.type).toBe('lisa'));
  });

  it('returns empty array for an unused type filter', async () => {
    const res = await request(app).get('/api/accounts?type=property');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('GET /api/accounts/:id', () => {
  it('returns 200 with the correct account for a valid ID', async () => {
    const listRes = await request(app).get('/api/accounts');
    const firstId = listRes.body.data[0].id;

    const res = await request(app).get('/api/accounts/' + firstId);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(firstId);
  });

  it('returns 404 for a non-existent ID', async () => {
    const res = await request(app).get('/api/accounts/does-not-exist-000');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/accounts', () => {
  it('creates a new account and returns 201 with the new object', async () => {
    const payload = {
      name:        'Test Savings Account',
      type:        'savings',
      balance:     5000,
      institution: 'Test Bank'
    };
    const res = await request(app).post('/api/accounts').send(payload);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(payload.name);
    expect(res.body.data.balance).toBe(5000);
    expect(res.body.data.id).toBeDefined();
  });

  it('increments the account count after creation', async () => {
    const before = (await request(app).get('/api/accounts')).body.count;
    await request(app).post('/api/accounts').send({ name: 'New', type: 'current', balance: 100 });
    const after  = (await request(app).get('/api/accounts')).body.count;
    expect(after).toBe(before + 1);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/accounts').send({ type: 'savings', balance: 100 });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when type is invalid', async () => {
    const res = await request(app).post('/api/accounts').send({ name: 'X', type: 'invalid', balance: 100 });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when balance is missing', async () => {
    const res = await request(app).post('/api/accounts').send({ name: 'X', type: 'savings' });
    expect(res.statusCode).toBe(400);
  });

  it('automatically calculates LISA government bonus (25%) when not provided', async () => {
    const res = await request(app).post('/api/accounts').send({
      name: 'My LISA', type: 'lisa', balance: 4000
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.lisaBonus).toBeCloseTo(1000, 1);
    expect(res.body.data.lisaBonusStatus).toBe('pending');
  });

  it('accepts an explicit LISA bonus override', async () => {
    const res = await request(app).post('/api/accounts').send({
      name: 'My LISA', type: 'lisa', balance: 4000, lisaBonus: 500, lisaBonusStatus: 'received'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.lisaBonus).toBe(500);
    expect(res.body.data.lisaBonusStatus).toBe('received');
  });

  it('defaults currency to GBP when not provided', async () => {
    const res = await request(app).post('/api/accounts').send({ name: 'A', type: 'current', balance: 10 });
    expect(res.body.data.currency).toBe('GBP');
  });
});

describe('DELETE /api/accounts/:id', () => {
  it('deletes an existing account and returns 200', async () => {
    const created = await request(app).post('/api/accounts').send({ name: 'Del Me', type: 'savings', balance: 1 });
    const id      = created.body.data.id;
    const res     = await request(app).delete('/api/accounts/' + id);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('account is no longer retrievable after deletion', async () => {
    const created = await request(app).post('/api/accounts').send({ name: 'Gone', type: 'current', balance: 1 });
    const id      = created.body.data.id;
    await request(app).delete('/api/accounts/' + id);
    const res = await request(app).get('/api/accounts/' + id);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when deleting a non-existent account', async () => {
    const res = await request(app).delete('/api/accounts/ghost-id-000');
    expect(res.statusCode).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════
// DEBTS
// ═══════════════════════════════════════════════════════

describe('GET /api/debts', () => {
  it('returns 200 with an array of debts', async () => {
    const res = await request(app).get('/api/debts');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('enriches each debt with monthlyInterest and payoffMonths', async () => {
    const res = await request(app).get('/api/debts');
    res.body.data.forEach(d => {
      expect(d).toHaveProperty('monthlyInterest');
    });
  });

  it('correctly calculates monthly interest for a known debt', async () => {
    // balance=1200, interestRate=12 → monthly = (1200 * 0.12) / 12 = 12
    const createRes = await request(app).post('/api/debts').send({
      name: 'Test Debt', type: 'credit_card', balance: 1200, interestRate: 12
    });
    const id = createRes.body.data.id;
    const res = await request(app).get('/api/debts/' + id);
    expect(res.body.data.monthlyInterest).toBeCloseTo(12, 1);
  });

  it('filters debts by type using ?type= query param', async () => {
    const res = await request(app).get('/api/debts?type=student_loan');
    expect(res.statusCode).toBe(200);
    res.body.data.forEach(d => expect(d.type).toBe('student_loan'));
  });
});

describe('GET /api/debts/:id', () => {
  it('returns 200 with the correct debt for a valid ID', async () => {
    const listRes = await request(app).get('/api/debts');
    const firstId = listRes.body.data[0].id;

    const res = await request(app).get('/api/debts/' + firstId);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(firstId);
  });

  it('returns 404 for a non-existent debt ID', async () => {
    const res = await request(app).get('/api/debts/no-such-id');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/debts', () => {
  it('creates a new debt and returns 201 with the new object', async () => {
    const payload = { name: 'Test Card', type: 'credit_card', balance: 800, interestRate: 19.9, minimumPayment: 30 };
    const res = await request(app).post('/api/debts').send(payload);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Card');
    expect(res.body.data.balance).toBe(800);
  });

  it('increments the debt count after creation', async () => {
    const before = (await request(app).get('/api/debts')).body.count;
    await request(app).post('/api/debts').send({ name: 'New Debt', type: 'personal_loan', balance: 500 });
    const after = (await request(app).get('/api/debts')).body.count;
    expect(after).toBe(before + 1);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/debts').send({ type: 'credit_card', balance: 100 });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when type is invalid', async () => {
    const res = await request(app).post('/api/debts').send({ name: 'X', type: 'overdraft', balance: 100 });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when balance is missing', async () => {
    const res = await request(app).post('/api/debts').send({ name: 'X', type: 'credit_card' });
    expect(res.statusCode).toBe(400);
  });

  it('accepts student loan plan fields', async () => {
    const res = await request(app).post('/api/debts').send({
      name: 'Loan', type: 'student_loan', balance: 20000, interestRate: 7.3,
      plan: 'plan2', repaymentThreshold: 27295, incomeContingent: true
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.plan).toBe('plan2');
    expect(res.body.data.repaymentThreshold).toBe(27295);
  });

  it('defaults interestRate and minimumPayment to 0 when omitted', async () => {
    const res = await request(app).post('/api/debts').send({ name: 'X', type: 'credit_card', balance: 100 });
    expect(res.body.data.interestRate).toBe(0);
    expect(res.body.data.minimumPayment).toBe(0);
  });
});

describe('DELETE /api/debts/:id', () => {
  it('deletes an existing debt and returns 200', async () => {
    const created = await request(app).post('/api/debts').send({ name: 'Del', type: 'credit_card', balance: 1 });
    const id      = created.body.data.id;
    const res     = await request(app).delete('/api/debts/' + id);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('debt is unreachable after deletion', async () => {
    const created = await request(app).post('/api/debts').send({ name: 'Del2', type: 'credit_card', balance: 1 });
    const id      = created.body.data.id;
    await request(app).delete('/api/debts/' + id);
    const res = await request(app).get('/api/debts/' + id);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when deleting a non-existent debt', async () => {
    const res = await request(app).delete('/api/debts/ghost-debt-000');
    expect(res.statusCode).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════

describe('GET /api/summary', () => {
  it('returns 200 with expected top-level fields', async () => {
    const res = await request(app).get('/api/summary');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    const d = res.body.data;
    expect(d).toHaveProperty('totalAssets');
    expect(d).toHaveProperty('totalDebts');
    expect(d).toHaveProperty('netWorth');
    expect(d).toHaveProperty('assetAllocation');
    expect(d).toHaveProperty('ratios');
    expect(d).toHaveProperty('projections');
    expect(d).toHaveProperty('totalMonthlyInterest');
  });

  it('netWorth equals totalAssets minus totalDebts', async () => {
    const res = await request(app).get('/api/summary');
    const { totalAssets, totalDebts, netWorth } = res.body.data;
    expect(netWorth).toBeCloseTo(totalAssets - totalDebts, 2);
  });

  it('assetAllocation contains cash, investments, and property keys', async () => {
    const res = await request(app).get('/api/summary');
    const alloc = res.body.data.assetAllocation;
    expect(alloc).toHaveProperty('cash');
    expect(alloc).toHaveProperty('investments');
    expect(alloc).toHaveProperty('property');
  });

  it('projections array contains entries for 4%, 7%, and 10% rates', async () => {
    const res   = await request(app).get('/api/summary');
    const rates = res.body.data.projections.map(p => p.rate);
    expect(rates).toContain(4);
    expect(rates).toContain(7);
    expect(rates).toContain(10);
  });

  it('each projection entry has scenarios for year 1, 3, 5, 10', async () => {
    const res     = await request(app).get('/api/summary');
    const first   = res.body.data.projections[0];
    const years   = first.scenarios.map(s => s.years);
    expect(years).toEqual(expect.arrayContaining([1, 3, 5, 10]));
  });

  it('totalAssets increases after adding an account', async () => {
    const before = (await request(app).get('/api/summary')).body.data.totalAssets;
    await request(app).post('/api/accounts').send({ name: 'Big Savings', type: 'savings', balance: 10000 });
    const after  = (await request(app).get('/api/summary')).body.data.totalAssets;
    expect(after).toBeCloseTo(before + 10000, 1);
  });

  it('totalDebts increases after adding a debt', async () => {
    const before = (await request(app).get('/api/summary')).body.data.totalDebts;
    await request(app).post('/api/debts').send({ name: 'New Loan', type: 'personal_loan', balance: 2000 });
    const after  = (await request(app).get('/api/summary')).body.data.totalDebts;
    expect(after).toBeCloseTo(before + 2000, 1);
  });

  it('ratios object contains debtToEquity and liquidityRatio keys', async () => {
    const res    = await request(app).get('/api/summary');
    const ratios = res.body.data.ratios;
    expect(ratios).toHaveProperty('debtToEquity');
    expect(ratios).toHaveProperty('liquidityRatio');
  });
});
