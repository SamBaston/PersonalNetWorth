const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '../../data/wealth.json');

// Helper: read data file
function readData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

// Helper: write data file
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/summary - overall net worth summary
router.get('/summary', (req, res) => {
  try {
    const data = readData();
    const totalNetWorth = data.accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const byType = data.accounts.reduce((acc, account) => {
      acc[account.type] = (acc[account.type] || 0) + account.balance;
      return acc;
    }, {});
    res.json({
      netWorth: totalNetWorth,
      currency: data.settings.currency,
      byType,
      accountCount: data.accounts.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read data', details: err.message });
  }
});

// GET /api/accounts - list all accounts
router.get('/accounts', (req, res) => {
  try {
    const data = readData();
    res.json(data.accounts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read accounts' });
  }
});

// GET /api/accounts/:id - single account
router.get('/accounts/:id', (req, res) => {
  try {
    const data = readData();
    const account = data.accounts.find(a => a.id === req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read account' });
  }
});

// POST /api/accounts - create a new account
router.post('/accounts', (req, res) => {
  try {
    const data = readData();
    const newAccount = {
      id: `acc_${Date.now()}`,
      name: req.body.name,
      type: req.body.type || 'cash',
      balance: parseFloat(req.body.balance) || 0,
      currency: req.body.currency || data.settings.currency,
      institution: req.body.institution || '',
      lastUpdated: new Date().toISOString()
    };
    data.accounts.push(newAccount);
    writeData(data);
    res.status(201).json(newAccount);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// PUT /api/accounts/:id - update an account
router.put('/accounts/:id', (req, res) => {
  try {
    const data = readData();
    const index = data.accounts.findIndex(a => a.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Account not found' });
    data.accounts[index] = {
      ...data.accounts[index],
      ...req.body,
      id: req.params.id,
      lastUpdated: new Date().toISOString()
    };
    writeData(data);
    res.json(data.accounts[index]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// DELETE /api/accounts/:id - delete an account
router.delete('/accounts/:id', (req, res) => {
  try {
    const data = readData();
    const index = data.accounts.findIndex(a => a.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Account not found' });
    data.accounts.splice(index, 1);
    writeData(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// GET /api/transactions - list all transactions (optional ?accountId filter)
router.get('/transactions', (req, res) => {
  try {
    const data = readData();
    let txns = data.transactions;
    if (req.query.accountId) {
      txns = txns.filter(t => t.accountId === req.query.accountId);
    }
    res.json(txns);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read transactions' });
  }
});

// POST /api/transactions - add a transaction
router.post('/transactions', (req, res) => {
  try {
    const data = readData();
    const newTxn = {
      id: `txn_${Date.now()}`,
      accountId: req.body.accountId,
      date: req.body.date || new Date().toISOString().split('T')[0],
      description: req.body.description,
      amount: parseFloat(req.body.amount),
      type: parseFloat(req.body.amount) >= 0 ? 'income' : 'expense',
      category: req.body.category || 'other'
    };
    data.transactions.push(newTxn);

    // Update account balance
    const account = data.accounts.find(a => a.id === newTxn.accountId);
    if (account) {
      account.balance += newTxn.amount;
      account.lastUpdated = new Date().toISOString();
    }

    writeData(data);
    res.status(201).json(newTxn);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// GET /api/settings
router.get('/settings', (req, res) => {
  try {
    const data = readData();
    res.json(data.settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// PUT /api/settings
router.put('/settings', (req, res) => {
  try {
    const data = readData();
    data.settings = { ...data.settings, ...req.body };
    writeData(data);
    res.json(data.settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
