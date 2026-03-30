/**
 * NetWorth Tracker — REST API Server
 * COMP1101 Summative Assessment 1
 *
 * Entities: accounts (assets), debts (liabilities)
 * Provides JSON via a REST API consumed by the SPA frontend via AJAX.
 */

'use strict';

const express = require('express');
const cors    = require('cors');
const { v4: uuidv4 } = require('uuid');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Seed Data Factories ────────────────────────────────────────────────────
// Wrapped in a function so tests can call resetData() for a clean state.

function buildSeedAccounts() {
  return [
    {
      id: uuidv4(),
      name: 'Barclays Current Account',
      type: 'current',
      balance: 4250.00,
      currency: 'GBP',
      institution: 'Barclays',
      notes: 'Main spending account',
      lisaBonus: null,
      lisaBonusStatus: null,
      createdAt: new Date('2024-01-15').toISOString(),
      updatedAt: new Date('2024-01-15').toISOString()
    },
    {
      id: uuidv4(),
      name: 'Marcus Savings Account',
      type: 'savings',
      balance: 12500.00,
      currency: 'GBP',
      institution: 'Goldman Sachs (Marcus)',
      notes: 'Emergency fund — target 6 months expenses',
      lisaBonus: null,
      lisaBonusStatus: null,
      createdAt: new Date('2024-02-01').toISOString(),
      updatedAt: new Date('2024-02-01').toISOString()
    },
    {
      id: uuidv4(),
      name: 'Vanguard Stocks & Shares ISA',
      type: 'isa',
      balance: 8750.00,
      currency: 'GBP',
      institution: 'Vanguard',
      notes: 'VWRL — Global All Cap ETF',
      lisaBonus: null,
      lisaBonusStatus: null,
      createdAt: new Date('2023-04-06').toISOString(),
      updatedAt: new Date('2024-01-15').toISOString()
    },
    {
      id: uuidv4(),
      name: 'Moneybox LISA',
      type: 'lisa',
      balance: 5000.00,
      currency: 'GBP',
      institution: 'Moneybox',
      notes: 'Lifetime ISA — saving for first home purchase',
      lisaBonus: 1250.00,
      lisaBonusStatus: 'received',
      createdAt: new Date('2023-04-06').toISOString(),
      updatedAt: new Date('2024-01-15').toISOString()
    }
  ];
}

function buildSeedDebts() {
  return [
    {
      id: uuidv4(),
      name: 'Student Loan Plan 2',
      type: 'student_loan',
      balance: 38500.00,
      interestRate: 7.3,
      minimumPayment: 0,
      currency: 'GBP',
      plan: 'plan2',
      repaymentThreshold: 27295,
      upperThreshold: 49130,
      incomeContingent: true,
      notes: '9% of income above £27,295. Written off after 30 years.',
      createdAt: new Date('2021-09-01').toISOString()
    },
    {
      id: uuidv4(),
      name: 'Monzo Flex Credit Card',
      type: 'credit_card',
      balance: 650.00,
      interestRate: 24.9,
      minimumPayment: 25,
      currency: 'GBP',
      plan: null,
      repaymentThreshold: null,
      upperThreshold: null,
      incomeContingent: false,
      notes: '',
      createdAt: new Date('2024-01-01').toISOString()
    }
  ];
}

// Live in-memory stores
let accounts = buildSeedAccounts();
let debts    = buildSeedDebts();

/**
 * Restore both stores to seed state.
 * Called by tests in beforeEach to ensure isolation.
 */
function resetData() {
  accounts = buildSeedAccounts();
  debts    = buildSeedDebts();
}

// ─── Domain Helpers ─────────────────────────────────────────────────────────

/**
 * Calculate monthly interest for a debt.
 * @param {object} debt
 * @returns {number}
 */
function calcMonthlyInterest(debt) {
  return parseFloat(((debt.balance * (debt.interestRate / 100)) / 12).toFixed(2));
}

/**
 * Estimate months until a debt is cleared given a fixed monthly payment.
 * Returns null if payment cannot cover the interest.
 * @param {number} balance
 * @param {number} annualRate  — percentage, e.g. 24.9
 * @param {number} monthlyPayment
 * @returns {number|null}
 */
function estimatePayoffMonths(balance, annualRate, monthlyPayment) {
  if (monthlyPayment <= 0) return null;
  const r = annualRate / 100 / 12;
  if (r === 0) return Math.ceil(balance / monthlyPayment);
  if (monthlyPayment <= balance * r) return null; // payment swallowed by interest
  return Math.ceil(Math.log(monthlyPayment / (monthlyPayment - balance * r)) / Math.log(1 + r));
}

// ─── Input Validation ───────────────────────────────────────────────────────

const ACCOUNT_TYPES = ['current', 'savings', 'isa', 'lisa', 'stocks', 'property'];
const DEBT_TYPES    = ['student_loan', 'credit_card', 'mortgage', 'personal_loan'];

function validateAccount(body) {
  const errors = [];
  if (!body.name || String(body.name).trim() === '') errors.push('name is required');
  if (!body.type || !ACCOUNT_TYPES.includes(body.type))
    errors.push(`type must be one of: ${ACCOUNT_TYPES.join(', ')}`);
  if (body.balance === undefined || isNaN(parseFloat(body.balance)))
    errors.push('balance must be a valid number');
  return errors;
}

function validateDebt(body) {
  const errors = [];
  if (!body.name || String(body.name).trim() === '') errors.push('name is required');
  if (!body.type || !DEBT_TYPES.includes(body.type))
    errors.push(`type must be one of: ${DEBT_TYPES.join(', ')}`);
  if (body.balance === undefined || isNaN(parseFloat(body.balance)))
    errors.push('balance must be a valid number');
  return errors;
}

// ─── Account Routes ─────────────────────────────────────────────────────────

/**
 * GET /api/accounts
 * Returns all accounts. Optional query param ?type= to filter by account type.
 */
app.get('/api/accounts', (req, res) => {
  try {
    const { type } = req.query;
    const result = type ? accounts.filter(a => a.type === type) : accounts;
    res.json({ success: true, data: result, count: result.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/accounts/:id
 * Returns a single account by ID.
 */
app.get('/api/accounts/:id', (req, res) => {
  try {
    const account = accounts.find(a => a.id === req.params.id);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
    res.json({ success: true, data: account });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/accounts
 * Creates a new account. LISA accounts automatically get government bonus fields.
 * Body: { name, type, balance, currency?, institution?, notes?, lisaBonus?, lisaBonusStatus? }
 */
app.post('/api/accounts', (req, res) => {
  try {
    const errors = validateAccount(req.body);
    if (errors.length) return res.status(400).json({ success: false, errors });

    const { name, type, balance, currency, institution, notes, lisaBonus, lisaBonusStatus } = req.body;

    const newAccount = {
      id:             uuidv4(),
      name:           name.trim(),
      type,
      balance:        parseFloat(balance),
      currency:       currency || 'GBP',
      institution:    institution || '',
      notes:          notes || '',
      lisaBonus:      null,
      lisaBonusStatus: null,
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString()
    };

    if (type === 'lisa') {
      // Government bonus is 25% of contributions, tracked separately
      newAccount.lisaBonus       = lisaBonus != null ? parseFloat(lisaBonus) : parseFloat((balance * 0.25).toFixed(2));
      newAccount.lisaBonusStatus = lisaBonusStatus || 'pending';
    }

    accounts.push(newAccount);
    res.status(201).json({ success: true, data: newAccount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/accounts/:id
 * Removes an account permanently.
 */
app.delete('/api/accounts/:id', (req, res) => {
  try {
    const idx = accounts.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Account not found' });
    accounts.splice(idx, 1);
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Debt Routes ─────────────────────────────────────────────────────────────

/**
 * GET /api/debts
 * Returns all debts, enriched with calculated monthly interest and payoff estimate.
 * Optional query param ?type= to filter.
 */
app.get('/api/debts', (req, res) => {
  try {
    const { type } = req.query;
    const result   = type ? debts.filter(d => d.type === type) : debts;
    const enriched = result.map(d => ({
      ...d,
      monthlyInterest: calcMonthlyInterest(d),
      payoffMonths:    estimatePayoffMonths(d.balance, d.interestRate, d.minimumPayment)
    }));
    res.json({ success: true, data: enriched, count: enriched.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/debts/:id
 * Returns a single debt by ID, enriched with calculated fields.
 */
app.get('/api/debts/:id', (req, res) => {
  try {
    const debt = debts.find(d => d.id === req.params.id);
    if (!debt) return res.status(404).json({ success: false, error: 'Debt not found' });
    res.json({
      success: true,
      data: {
        ...debt,
        monthlyInterest: calcMonthlyInterest(debt),
        payoffMonths:    estimatePayoffMonths(debt.balance, debt.interestRate, debt.minimumPayment)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/debts
 * Creates a new debt/liability.
 * Body: { name, type, balance, interestRate?, minimumPayment?, currency?,
 *         plan?, repaymentThreshold?, upperThreshold?, incomeContingent?, notes? }
 */
app.post('/api/debts', (req, res) => {
  try {
    const errors = validateDebt(req.body);
    if (errors.length) return res.status(400).json({ success: false, errors });

    const {
      name, type, balance, interestRate, minimumPayment,
      currency, plan, repaymentThreshold, upperThreshold, incomeContingent, notes
    } = req.body;

    const newDebt = {
      id:                 uuidv4(),
      name:               name.trim(),
      type,
      balance:            parseFloat(balance),
      interestRate:       parseFloat(interestRate) || 0,
      minimumPayment:     parseFloat(minimumPayment) || 0,
      currency:           currency || 'GBP',
      plan:               plan || null,
      repaymentThreshold: repaymentThreshold ? parseFloat(repaymentThreshold) : null,
      upperThreshold:     upperThreshold     ? parseFloat(upperThreshold)     : null,
      incomeContingent:   incomeContingent   || false,
      notes:              notes              || '',
      createdAt:          new Date().toISOString()
    };

    debts.push(newDebt);
    res.status(201).json({ success: true, data: newDebt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/debts/:id
 */
app.delete('/api/debts/:id', (req, res) => {
  try {
    const idx = debts.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Debt not found' });
    debts.splice(idx, 1);
    res.json({ success: true, message: 'Debt deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Summary Route ────────────────────────────────────────────────────────────

/**
 * GET /api/summary
 * Aggregated financial overview: totals, ratios, asset allocation, and projections.
 */
app.get('/api/summary', (req, res) => {
  try {
    const totalAssets = accounts.reduce((s, a) => s + a.balance, 0);
    const totalDebts  = debts.reduce((s, d) => s + d.balance, 0);
    const netWorth    = totalAssets - totalDebts;

    // Asset allocation buckets
    const cash        = accounts.filter(a => ['current','savings'].includes(a.type))
                                .reduce((s, a) => s + a.balance, 0);
    const investments = accounts.filter(a => ['isa','lisa','stocks'].includes(a.type))
                                .reduce((s, a) => s + a.balance, 0);
    const property    = accounts.filter(a => a.type === 'property')
                                .reduce((s, a) => s + a.balance, 0);

    // Ratios
    const monthlyDebtObligations = debts.reduce((s, d) => s + (d.minimumPayment || 0), 0);
    const liquidityRatio         = monthlyDebtObligations > 0
      ? parseFloat((cash / monthlyDebtObligations).toFixed(2)) : null;
    const debtToEquity           = totalAssets > 0
      ? parseFloat((totalDebts / totalAssets).toFixed(4)) : null;

    // Total monthly interest accruing across all debts
    const totalMonthlyInterest = parseFloat(
      debts.reduce((s, d) => s + calcMonthlyInterest(d), 0).toFixed(2)
    );

    // Forward projections: 3 return rates × 4 horizons
    const rates       = [0.04, 0.07, 0.10];
    const horizons    = [1, 3, 5, 10];
    const projections = rates.map(rate => ({
      rate: Math.round(rate * 100),
      scenarios: horizons.map(y => ({
        years:               y,
        projectedNetWorth:   parseFloat((netWorth    * Math.pow(1 + rate, y)).toFixed(2)),
        projectedInvestments:parseFloat((investments * Math.pow(1 + rate, y)).toFixed(2))
      }))
    }));

    res.json({
      success: true,
      data: {
        totalAssets:         parseFloat(totalAssets.toFixed(2)),
        totalDebts:          parseFloat(totalDebts.toFixed(2)),
        netWorth:            parseFloat(netWorth.toFixed(2)),
        assetAllocation:     {
          cash:        parseFloat(cash.toFixed(2)),
          investments: parseFloat(investments.toFixed(2)),
          property:    parseFloat(property.toFixed(2))
        },
        ratios:              { debtToEquity, liquidityRatio },
        totalMonthlyInterest,
        projections,
        accountCount:        accounts.length,
        debtCount:           debts.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Catch-All (SPA) ─────────────────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () =>
    console.log(`NetWorth Tracker → http://localhost:${PORT}`)
  );
}

module.exports = { app, resetData };
