const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();

app.use(express.json());

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const ASSETS_FILE = path.join(DATA_DIR, 'assets.json');
const DEBTS_FILE = path.join(DATA_DIR, 'debts.json');

// Ensure data directory and files exist
async function initializeData() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        // Directory exists
    }

    const files = [
        { path: ASSETS_FILE, default: [] },
        { path: DEBTS_FILE, default: [] }
    ];

    for (const file of files) {
        try {
            await fs.access(file.path);
        } catch {
            await writeData(file.path, file.default);
        }
    }
}
initializeData();

// Read from JSON files
async function readData(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Write to JSON files
async function writeData(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Generate unique ID
function generateId() {
    return Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
}

// =========================================//
// -------- CALCULATION HELPERS -----------//
// =========================================//

// Calculate LISA government bonus (25%)
function calculateLISABonus(balance) {
    return balance * 0.25;
}

// Get student loan interest rate by plan type
function getStudentLoanRate(planType) {
    const rates = {
        'plan1': 6.25,
        'plan2': 6.25,
        'plan4': 6.25,
        'plan5': 6.25
    };
    return rates[planType] || 6.25;
}

// Calculate total assets (including LISA bonus)
function calculateTotalAssets(assets) {
    return assets.reduce((total, asset) => {
        if (asset.isLISA) {
            return total + asset.balance + calculateLISABonus(asset.balance);
        }
        return total + asset.balance;
    }, 0);
}

// Calculate total debts
function calculateTotalDebts(debts) {
    return debts.reduce((total, debt) => total + debt.balance, 0);
}

// Calculate asset allocation
function calculateAssetAllocation(assets) {
    const allocation = { cash: 0, investments: 0, property: 0, other: 0 };
    
    assets.forEach(asset => {
        const value = asset.isLISA ? asset.balance + calculateLISABonus(asset.balance) : asset.balance;
        
        switch (asset.type) {
            case 'bank_account':
                allocation.cash += value;
                break;
            case 'isa':
            case 'lisa':
            case 'stock_portfolio':
                allocation.investments += value;
                break;
            default:
                allocation.other += value;
        }
    });
    
    return allocation;
}

// Calculate debt-to-equity ratio
function calculateDebtToEquityRatio(totalAssets, totalDebts) {
    if (totalAssets + totalDebts === 0) return 0;
    return totalDebts / (totalAssets + totalDebts);
}

// Calculate liquidity ratio (cash / total debts)
function calculateLiquidityRatio(assets, debts) {
    const cash = assets
        .filter(a => a.type === 'bank_account')
        .reduce((sum, a) => sum + a.balance, 0);
    const totalDebts = calculateTotalDebts(debts);
    
    if (totalDebts === 0) return cash > 0 ? Infinity : 0;
    return cash / totalDebts;
}

// Calculate months to payoff debt
function calculateMonthsToPayoff(balance, annualRate, monthlyPayment) {
    if (monthlyPayment <= 0) return null;
    
    const monthlyRate = annualRate / 100 / 12;
    const monthlyInterest = balance * monthlyRate;
    
    if (monthlyPayment <= monthlyInterest) return null;
    
    let remaining = balance;
    let months = 0;
    const maxMonths = 600;
    
    while (remaining > 0 && months < maxMonths) {
        remaining += remaining * monthlyRate;
        remaining -= monthlyPayment;
        months++;
    }
    
    return months;
}

// =========================================//
// -------- ASSETS ENDPOINTS --------------//
// =========================================//

// GET all assets (list with id, name, type, balance)
app.get('/api/assets', async (req, res) => {
    try {
        let assets = await readData(ASSETS_FILE);
        
        const { name, type, extend } = req.query;
        
        // Search by name
        if (name) {
            const term = name.toLowerCase();
            assets = assets.filter(asset => asset.name.toLowerCase().includes(term));
        }
        
        // Filter by type
        if (type) {
            assets = assets.filter(asset => asset.type === type);
        }
        
        // Return list with essential fields
        const response = assets.map(asset => ({
            id: asset.id,
            name: asset.name,
            type: asset.type,
            subType: asset.subType,
            balance: asset.isLISA ? asset.balance + calculateLISABonus(asset.balance) : asset.balance,
            currency: asset.currency,
            isLISA: asset.isLISA
        }));
        
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch assets' });
    }
});

// GET single asset with full details
app.get('/api/assets/:id', async (req, res) => {
    try {
        const assets = await readData(ASSETS_FILE);
        const targetId = String(req.params.id).trim();
        const asset = assets.find(a => String(a.id).trim() === targetId);
        
        if (!asset) {
            return res.status(404).json({ error: `Asset ${targetId} not found` });
        }
        
        // Add calculated fields
        const response = {
            ...asset,
            displayBalance: asset.isLISA ? asset.balance + calculateLISABonus(asset.balance) : asset.balance,
            lisaBonus: asset.isLISA ? calculateLISABonus(asset.balance) : 0
        };
        
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch asset' });
    }
});

// POST new asset
app.post('/api/assets', async (req, res) => {
    try {
        const { name, type, subType, balance, currency, interestRate, ticker, quantity, purchasePrice, currentPrice, isLISA } = req.body;
        
        // Validate required fields
        if (!name || !type || balance === undefined) {
            return res.status(400).json({ error: 'Missing required fields: name, type, balance' });
        }
        
        // Validate type
        const validTypes = ['bank_account', 'isa', 'lisa', 'stock_portfolio'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
        }
        
        const assets = await readData(ASSETS_FILE);
        
        const newAsset = {
            id: generateId(),
            name: name,
            type: type,
            subType: subType || null,
            balance: parseFloat(balance),
            currency: currency || 'GBP',
            interestRate: interestRate !== undefined ? parseFloat(interestRate) : null,
            ticker: ticker || null,
            quantity: quantity !== undefined ? parseFloat(quantity) : null,
            purchasePrice: purchasePrice !== undefined ? parseFloat(purchasePrice) : null,
            currentPrice: currentPrice !== undefined ? parseFloat(currentPrice) : null,
            isLISA: type === 'lisa' || isLISA === true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        assets.push(newAsset);
        await writeData(ASSETS_FILE, assets);
        
        res.status(201).json(newAsset);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create asset' });
    }
});

// PUT (update) an asset
app.put('/api/assets/:id', async (req, res) => {
    try {
        const assets = await readData(ASSETS_FILE);
        const targetId = String(req.params.id).trim();
        const index = assets.findIndex(a => String(a.id).trim() === targetId);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Asset not found' });
        }
        
        const { name, type, subType, balance, currency, interestRate, ticker, quantity, purchasePrice, currentPrice, isLISA } = req.body;
        
        // Validate type if provided
        if (type) {
            const validTypes = ['bank_account', 'isa', 'lisa', 'stock_portfolio'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
            }
        }
        
        assets[index] = {
            ...assets[index],
            name: name !== undefined ? name : assets[index].name,
            type: type !== undefined ? type : assets[index].type,
            subType: subType !== undefined ? subType : assets[index].subType,
            balance: balance !== undefined ? parseFloat(balance) : assets[index].balance,
            currency: currency !== undefined ? currency : assets[index].currency,
            interestRate: interestRate !== undefined ? parseFloat(interestRate) : assets[index].interestRate,
            ticker: ticker !== undefined ? ticker : assets[index].ticker,
            quantity: quantity !== undefined ? parseFloat(quantity) : assets[index].quantity,
            purchasePrice: purchasePrice !== undefined ? parseFloat(purchasePrice) : assets[index].purchasePrice,
            currentPrice: currentPrice !== undefined ? parseFloat(currentPrice) : assets[index].currentPrice,
            isLISA: type === 'lisa' || isLISA === true,
            updatedAt: new Date().toISOString()
        };
        
        await writeData(ASSETS_FILE, assets);
        res.json(assets[index]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update asset' });
    }
});

// DELETE an asset
app.delete('/api/assets/:id', async (req, res) => {
    try {
        let assets = await readData(ASSETS_FILE);
        const targetId = String(req.params.id).trim();
        const initialLength = assets.length;
        
        assets = assets.filter(a => String(a.id).trim() !== targetId);
        
        if (assets.length === initialLength) {
            return res.status(404).json({ error: 'Asset not found' });
        }
        
        await writeData(ASSETS_FILE, assets);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete asset' });
    }
});

// =========================================//
// -------- DEBTS ENDPOINTS ---------------//
// =========================================//

// GET all debts (list with id, name, type, balance)
app.get('/api/debts', async (req, res) => {
    try {
        let debts = await readData(DEBTS_FILE);
        
        const { name, type, extend } = req.query;
        
        // Search by name
        if (name) {
            const term = name.toLowerCase();
            debts = debts.filter(debt => debt.name.toLowerCase().includes(term));
        }
        
        // Filter by type
        if (type) {
            debts = debts.filter(debt => debt.type === type);
        }
        
        // Return list with essential fields
        const response = debts.map(debt => ({
            id: debt.id,
            name: debt.name,
            type: debt.type,
            balance: debt.balance,
            interestRate: debt.interestRate,
            planType: debt.planType,
            minimumPayment: debt.minimumPayment
        }));
        
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch debts' });
    }
});

// GET single debt with full details
app.get('/api/debts/:id', async (req, res) => {
    try {
        const debts = await readData(DEBTS_FILE);
        const targetId = String(req.params.id).trim();
        const debt = debts.find(d => String(d.id).trim() === targetId);
        
        if (!debt) {
            return res.status(404).json({ error: `Debt ${targetId} not found` });
        }
        
        // Add calculated fields
        let utilization = null;
        let monthsToPayoff = null;
        let estimatedPayoffDate = null;
        
        if (debt.type === 'credit_card' && debt.creditLimit) {
            utilization = (debt.balance / debt.creditLimit) * 100;
        }
        
        if (debt.minimumPayment && debt.minimumPayment > 0) {
            monthsToPayoff = calculateMonthsToPayoff(debt.balance, debt.interestRate, debt.minimumPayment);
            if (monthsToPayoff) {
                const payoffDate = new Date();
                payoffDate.setMonth(payoffDate.getMonth() + monthsToPayoff);
                estimatedPayoffDate = payoffDate.toISOString().split('T')[0];
            }
        }
        
        const response = {
            ...debt,
            utilization: utilization,
            monthsToPayoff: monthsToPayoff,
            estimatedPayoffDate: estimatedPayoffDate
        };
        
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch debt' });
    }
});

// POST new debt
app.post('/api/debts', async (req, res) => {
    try {
        const { name, type, balance, interestRate, minimumPayment, planType, creditLimit, termMonths } = req.body;
        
        // Validate required fields
        if (!name || !type || balance === undefined) {
            return res.status(400).json({ error: 'Missing required fields: name, type, balance' });
        }
        
        // Validate type
        const validTypes = ['student_loan', 'credit_card', 'personal_loan', 'mortgage'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
        }
        
        const debts = await readData(DEBTS_FILE);
        
        const newDebt = {
            id: generateId(),
            name: name,
            type: type,
            balance: parseFloat(balance),
            interestRate: interestRate !== undefined ? parseFloat(interestRate) : (type === 'student_loan' ? getStudentLoanRate(planType) : 0),
            minimumPayment: minimumPayment !== undefined ? parseFloat(minimumPayment) : null,
            planType: type === 'student_loan' ? (planType || 'plan2') : null,
            creditLimit: type === 'credit_card' && creditLimit !== undefined ? parseFloat(creditLimit) : null,
            termMonths: termMonths !== undefined ? parseInt(termMonths) : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        debts.push(newDebt);
        await writeData(DEBTS_FILE, debts);
        
        res.status(201).json(newDebt);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create debt' });
    }
});

// PUT (update) a debt
app.put('/api/debts/:id', async (req, res) => {
    try {
        const debts = await readData(DEBTS_FILE);
        const targetId = String(req.params.id).trim();
        const index = debts.findIndex(d => String(d.id).trim() === targetId);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Debt not found' });
        }
        
        const { name, type, balance, interestRate, minimumPayment, planType, creditLimit, termMonths } = req.body;
        
        // Validate type if provided
        if (type) {
            const validTypes = ['student_loan', 'credit_card', 'personal_loan', 'mortgage'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
            }
        }
        
        debts[index] = {
            ...debts[index],
            name: name !== undefined ? name : debts[index].name,
            type: type !== undefined ? type : debts[index].type,
            balance: balance !== undefined ? parseFloat(balance) : debts[index].balance,
            interestRate: interestRate !== undefined ? parseFloat(interestRate) : debts[index].interestRate,
            minimumPayment: minimumPayment !== undefined ? parseFloat(minimumPayment) : debts[index].minimumPayment,
            planType: planType !== undefined ? planType : debts[index].planType,
            creditLimit: creditLimit !== undefined ? parseFloat(creditLimit) : debts[index].creditLimit,
            termMonths: termMonths !== undefined ? parseInt(termMonths) : debts[index].termMonths,
            updatedAt: new Date().toISOString()
        };
        
        await writeData(DEBTS_FILE, debts);
        res.json(debts[index]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update debt' });
    }
});

// DELETE a debt
app.delete('/api/debts/:id', async (req, res) => {
    try {
        let debts = await readData(DEBTS_FILE);
        const targetId = String(req.params.id).trim();
        const initialLength = debts.length;
        
        debts = debts.filter(d => String(d.id).trim() !== targetId);
        
        if (debts.length === initialLength) {
            return res.status(404).json({ error: 'Debt not found' });
        }
        
        await writeData(DEBTS_FILE, debts);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete debt' });
    }
});

// =========================================//
// -------- DASHBOARD ENDPOINT ------------//
// =========================================//

// GET dashboard analytics
app.get('/api/dashboard', async (req, res) => {
    try {
        const assets = await readData(ASSETS_FILE);
        const debts = await readData(DEBTS_FILE);
        
        const totalAssets = calculateTotalAssets(assets);
        const totalDebts = calculateTotalDebts(debts);
        const netWorth = totalAssets - totalDebts;
        const assetAllocation = calculateAssetAllocation(assets);
        const debtToEquityRatio = calculateDebtToEquityRatio(totalAssets, totalDebts);
        const liquidityRatio = calculateLiquidityRatio(assets, debts);
        
        // LISA bonus total
        const lisaBonusTotal = assets
            .filter(a => a.isLISA)
            .reduce((sum, a) => sum + calculateLISABonus(a.balance), 0);
        
        // Monthly debt payments
        const totalMonthlyPayments = debts.reduce((sum, d) => sum + (d.minimumPayment || 0), 0);
        
        // Average debt interest
        const avgDebtInterest = debts.length > 0
            ? debts.reduce((sum, d) => sum + d.interestRate, 0) / debts.length
            : 0;
        
        // Debt-free date calculation
        let maxMonths = 0;
        debts.forEach(debt => {
            if (debt.balance > 0 && debt.minimumPayment && debt.minimumPayment > 0) {
                const months = calculateMonthsToPayoff(debt.balance, debt.interestRate, debt.minimumPayment);
                if (months && months > maxMonths) {
                    maxMonths = months;
                }
            }
        });
        
        let debtFreeDate = null;
        let monthsToDebtFree = null;
        if (maxMonths > 0) {
            const payoffDate = new Date();
            payoffDate.setMonth(payoffDate.getMonth() + maxMonths);
            debtFreeDate = payoffDate.toISOString().split('T')[0];
            monthsToDebtFree = maxMonths;
        }
        
        // Asset breakdown by type
        const assetsByType = {};
        assets.forEach(asset => {
            const value = asset.isLISA ? asset.balance + calculateLISABonus(asset.balance) : asset.balance;
            assetsByType[asset.type] = (assetsByType[asset.type] || 0) + value;
        });
        
        // Debt breakdown by type
        const debtsByType = {};
        debts.forEach(debt => {
            debtsByType[debt.type] = (debtsByType[debt.type] || 0) + debt.balance;
        });
        
        const response = {
            summary: {
                totalNetWorth: Math.round(netWorth * 100) / 100,
                totalAssets: Math.round(totalAssets * 100) / 100,
                totalDebts: Math.round(totalDebts * 100) / 100,
                lisaBonusTotal: Math.round(lisaBonusTotal * 100) / 100,
                totalMonthlyPayments: Math.round(totalMonthlyPayments * 100) / 100
            },
            assetAllocation: {
                cash: Math.round(assetAllocation.cash * 100) / 100,
                investments: Math.round(assetAllocation.investments * 100) / 100,
                property: Math.round(assetAllocation.property * 100) / 100,
                other: Math.round(assetAllocation.other * 100) / 100,
                percentages: {
                    cash: totalAssets > 0 ? Math.round((assetAllocation.cash / totalAssets) * 10000) / 100 : 0,
                    investments: totalAssets > 0 ? Math.round((assetAllocation.investments / totalAssets) * 10000) / 100 : 0,
                    property: totalAssets > 0 ? Math.round((assetAllocation.property / totalAssets) * 10000) / 100 : 0,
                    other: totalAssets > 0 ? Math.round((assetAllocation.other / totalAssets) * 10000) / 100 : 0
                }
            },
            ratios: {
                debtToEquity: Math.round(debtToEquityRatio * 10000) / 10000,
                liquidity: liquidityRatio === Infinity ? 'Infinity' : Math.round(liquidityRatio * 100) / 100,
                avgDebtInterest: Math.round(avgDebtInterest * 100) / 100
            },
            breakdown: {
                assetsByType,
                debtsByType
            },
            debtFreeDate: debtFreeDate,
            monthsToDebtFree: monthsToDebtFree,
            counts: {
                totalAssets: assets.length,
                totalDebts: debts.length
            }
        };
        
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// =========================================//
// -------- PROJECTIONS ENDPOINT ----------//
// =========================================//

// GET projections
app.get('/api/projections', async (req, res) => {
    try {
        const assets = await readData(ASSETS_FILE);
        const debts = await readData(DEBTS_FILE);
        
        const years = parseInt(req.query.years) || 10;
        const growthRate = parseFloat(req.query.growthRate) || 7;
        
        const totalAssets = calculateTotalAssets(assets);
        const totalDebts = calculateTotalDebts(debts);
        
        // Generate projection points
        const projections = [];
        const now = new Date();
        
        for (let year = 0; year <= years; year++) {
            const futureDate = new Date(now);
            futureDate.setFullYear(now.getFullYear() + year);
            
            // Project assets with compound growth
            const projectedAssets = totalAssets * Math.pow(1 + growthRate / 100, year);
            
            // Project debts with payments
            let projectedDebts = 0;
            debts.forEach(debt => {
                if (debt.minimumPayment && debt.minimumPayment > 0) {
                    let remaining = debt.balance;
                    const monthlyRate = debt.interestRate / 100 / 12;
                    
                    for (let i = 0; i < year * 12; i++) {
                        if (remaining <= 0) break;
                        remaining += remaining * monthlyRate;
                        remaining -= debt.minimumPayment;
                    }
                    projectedDebts += Math.max(0, remaining);
                } else {
                    // If no payment, just add interest
                    projectedDebts += debt.balance * Math.pow(1 + debt.interestRate / 100, year);
                }
            });
            
            projections.push({
                year: year,
                date: futureDate.toISOString().split('T')[0],
                totalAssets: Math.round(projectedAssets * 100) / 100,
                totalDebts: Math.round(projectedDebts * 100) / 100,
                netWorth: Math.round((projectedAssets - projectedDebts) * 100) / 100
            });
        }
        
        // Calculate scenarios
        const scenarios = [4, 7, 10].map(rate => ({
            rate: rate,
            projectedAssets: Math.round(totalAssets * Math.pow(1 + rate / 100, years) * 100) / 100,
            finalNetWorth: Math.round((totalAssets * Math.pow(1 + rate / 100, years) - totalDebts) * 100) / 100
        }));
        
        // Monthly debt schedule
        const monthlyDebtSchedule = [];
        let currentDebt = totalDebts;
        const totalMonthlyPayment = debts.reduce((sum, d) => sum + (d.minimumPayment || 0), 0);
        const avgInterestRate = debts.length > 0
            ? debts.reduce((sum, d) => sum + d.interestRate * d.balance, 0) / (totalDebts || 1)
            : 0;
        
        for (let month = 0; month <= 12; month++) {
            monthlyDebtSchedule.push({
                month: month,
                balance: Math.round(currentDebt * 100) / 100
            });
            
            if (currentDebt > 0 && totalMonthlyPayment > 0) {
                currentDebt += currentDebt * (avgInterestRate / 100 / 12);
                currentDebt -= totalMonthlyPayment;
                if (currentDebt < 0) currentDebt = 0;
            }
        }
        
        // Debt-free date
        let debtFree = { date: null, months: null, years: null };
        let maxMonths = 0;
        debts.forEach(debt => {
            if (debt.balance > 0 && debt.minimumPayment && debt.minimumPayment > 0) {
                const months = calculateMonthsToPayoff(debt.balance, debt.interestRate, debt.minimumPayment);
                if (months && months > maxMonths) {
                    maxMonths = months;
                }
            }
        });
        
        if (maxMonths > 0) {
            const payoffDate = new Date();
            payoffDate.setMonth(payoffDate.getMonth() + maxMonths);
            debtFree = {
                date: payoffDate.toISOString().split('T')[0],
                months: maxMonths,
                years: Math.round(maxMonths / 12 * 10) / 10
            };
        }
        
        const response = {
            params: { years, growthRate },
            current: {
                assets: Math.round(totalAssets * 100) / 100,
                debts: Math.round(totalDebts * 100) / 100,
                netWorth: Math.round((totalAssets - totalDebts) * 100) / 100
            },
            projections,
            scenarios,
            debtFree,
            monthlyDebtSchedule
        };
        
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: 'Failed to calculate projections' });
    }
});

// Serve static frontend files
app.use(express.static('public'));

module.exports = app;
