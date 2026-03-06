const request = require('supertest');
const app = require('./app');
const fs = require('fs').promises;
const path = require('path');

// Test data directory
const DATA_DIR = path.join(__dirname, 'data');
const ASSETS_FILE = path.join(DATA_DIR, 'assets.json');
const DEBTS_FILE = path.join(DATA_DIR, 'debts.json');

// Helper to reset test data
async function resetTestData() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(ASSETS_FILE, '[]');
    await fs.writeFile(DEBTS_FILE, '[]');
}

// =========================================//
// -------- ASSETS API TESTS --------------//
// =========================================//

describe('Assets API', () => {
    beforeEach(async () => {
        await resetTestData();
    });

    describe('GET /api/assets', () => {
        it('should return empty array when no assets exist', async () => {
            const res = await request(app).get('/api/assets');
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/application\/json/);
            expect(res.body).toEqual([]);
        });

        it('should return list of assets', async () => {
            // Create test asset
            await request(app)
                .post('/api/assets')
                .send({ name: 'Test Account', type: 'bank_account', balance: 1000 });

            const res = await request(app).get('/api/assets');
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0]).toHaveProperty('id');
            expect(res.body[0]).toHaveProperty('name', 'Test Account');
            expect(res.body[0]).toHaveProperty('type', 'bank_account');
            expect(res.body[0]).toHaveProperty('balance');
        });

        it('should filter assets by name', async () => {
            await request(app)
                .post('/api/assets')
                .send({ name: 'Savings Account', type: 'bank_account', balance: 5000 });
            await request(app)
                .post('/api/assets')
                .send({ name: 'Investment Fund', type: 'stock_portfolio', balance: 10000 });

            const res = await request(app).get('/api/assets?name=savings');
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0].name).toBe('Savings Account');
        });
    });

    describe('GET /api/assets/:id', () => {
        it('should return 404 for non-existent asset', async () => {
            const res = await request(app).get('/api/assets/nonexistent');
            expect(res.status).toBe(404);
            expect(res.headers['content-type']).toMatch(/application\/json/);
        });

        it('should return single asset with details', async () => {
            const createRes = await request(app)
                .post('/api/assets')
                .send({ name: 'Test ISA', type: 'lisa', balance: 4000 });
            
            const assetId = createRes.body.id;
            const res = await request(app).get(`/api/assets/${assetId}`);
            
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Test ISA');
            expect(res.body.isLISA).toBe(true);
            expect(res.body).toHaveProperty('lisaBonus');
            expect(res.body.lisaBonus).toBe(1000); // 25% of 4000
        });
    });

    describe('POST /api/assets', () => {
        it('should create a new asset', async () => {
            const res = await request(app)
                .post('/api/assets')
                .send({ name: 'Current Account', type: 'bank_account', balance: 2500 });
            
            expect(res.status).toBe(201);
            expect(res.headers['content-type']).toMatch(/application\/json/);
            expect(res.body).toHaveProperty('id');
            expect(res.body.name).toBe('Current Account');
            expect(res.body.balance).toBe(2500);
        });

        it('should return 400 for missing required fields', async () => {
            const res = await request(app)
                .post('/api/assets')
                .send({ name: 'Missing Type' });
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });

        it('should return 400 for invalid type', async () => {
            const res = await request(app)
                .post('/api/assets')
                .send({ name: 'Invalid', type: 'invalid_type', balance: 100 });
            
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Invalid type');
        });

        it('should mark LISA as isLISA true', async () => {
            const res = await request(app)
                .post('/api/assets')
                .send({ name: 'My LISA', type: 'lisa', balance: 4000 });
            
            expect(res.status).toBe(201);
            expect(res.body.isLISA).toBe(true);
        });
    });

    describe('PUT /api/assets/:id', () => {
        it('should update an existing asset', async () => {
            const createRes = await request(app)
                .post('/api/assets')
                .send({ name: 'Old Name', type: 'bank_account', balance: 1000 });
            
            const assetId = createRes.body.id;
            const res = await request(app)
                .put(`/api/assets/${assetId}`)
                .send({ name: 'New Name', balance: 2000 });
            
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('New Name');
            expect(res.body.balance).toBe(2000);
        });

        it('should return 404 for non-existent asset', async () => {
            const res = await request(app)
                .put('/api/assets/nonexistent')
                .send({ name: 'Updated' });
            
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/assets/:id', () => {
        it('should delete an existing asset', async () => {
            const createRes = await request(app)
                .post('/api/assets')
                .send({ name: 'To Delete', type: 'bank_account', balance: 500 });
            
            const assetId = createRes.body.id;
            const res = await request(app).delete(`/api/assets/${assetId}`);
            
            expect(res.status).toBe(204);
        });

        it('should return 404 for non-existent asset', async () => {
            const res = await request(app).delete('/api/assets/nonexistent');
            expect(res.status).toBe(404);
        });
    });
});

// =========================================//
// -------- DEBTS API TESTS ---------------//
// =========================================//

describe('Debts API', () => {
    beforeEach(async () => {
        await resetTestData();
    });

    describe('GET /api/debts', () => {
        it('should return empty array when no debts exist', async () => {
            const res = await request(app).get('/api/debts');
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/application\/json/);
            expect(res.body).toEqual([]);
        });

        it('should return list of debts', async () => {
            await request(app)
                .post('/api/debts')
                .send({ name: 'Student Loan', type: 'student_loan', balance: 20000, interestRate: 6.25 });

            const res = await request(app).get('/api/debts');
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0]).toHaveProperty('id');
            expect(res.body[0]).toHaveProperty('name', 'Student Loan');
        });
    });

    describe('GET /api/debts/:id', () => {
        it('should return 404 for non-existent debt', async () => {
            const res = await request(app).get('/api/debts/nonexistent');
            expect(res.status).toBe(404);
        });

        it('should return single debt with calculated fields', async () => {
            const createRes = await request(app)
                .post('/api/debts')
                .send({ 
                    name: 'Credit Card', 
                    type: 'credit_card', 
                    balance: 2000, 
                    interestRate: 20,
                    creditLimit: 5000,
                    minimumPayment: 100
                });
            
            const debtId = createRes.body.id;
            const res = await request(app).get(`/api/debts/${debtId}`);
            
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Credit Card');
            expect(res.body).toHaveProperty('utilization');
            expect(res.body.utilization).toBe(40); // 2000/5000 * 100
        });
    });

    describe('POST /api/debts', () => {
        it('should create a new debt', async () => {
            const res = await request(app)
                .post('/api/debts')
                .send({ name: 'Car Loan', type: 'personal_loan', balance: 10000, interestRate: 5.5 });
            
            expect(res.status).toBe(201);
            expect(res.headers['content-type']).toMatch(/application\/json/);
            expect(res.body).toHaveProperty('id');
            expect(res.body.name).toBe('Car Loan');
        });

        it('should return 400 for missing required fields', async () => {
            const res = await request(app)
                .post('/api/debts')
                .send({ name: 'Missing Balance' });
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });

        it('should set default plan type for student loan', async () => {
            const res = await request(app)
                .post('/api/debts')
                .send({ name: 'Student Debt', type: 'student_loan', balance: 30000, interestRate: 6.25 });
            
            expect(res.status).toBe(201);
            expect(res.body.planType).toBe('plan2');
        });
    });

    describe('PUT /api/debts/:id', () => {
        it('should update an existing debt', async () => {
            const createRes = await request(app)
                .post('/api/debts')
                .send({ name: 'Old Debt', type: 'personal_loan', balance: 5000, interestRate: 10 });
            
            const debtId = createRes.body.id;
            const res = await request(app)
                .put(`/api/debts/${debtId}`)
                .send({ balance: 4000, interestRate: 8 });
            
            expect(res.status).toBe(200);
            expect(res.body.balance).toBe(4000);
            expect(res.body.interestRate).toBe(8);
        });
    });

    describe('DELETE /api/debts/:id', () => {
        it('should delete an existing debt', async () => {
            const createRes = await request(app)
                .post('/api/debts')
                .send({ name: 'To Delete', type: 'personal_loan', balance: 1000, interestRate: 5 });
            
            const debtId = createRes.body.id;
            const res = await request(app).delete(`/api/debts/${debtId}`);
            
            expect(res.status).toBe(204);
        });
    });
});

// =========================================//
// -------- DASHBOARD API TESTS -----------//
// =========================================//

describe('Dashboard API', () => {
    beforeEach(async () => {
        await resetTestData();
    });

    describe('GET /api/dashboard', () => {
        it('should return dashboard with zero values when no data', async () => {
            const res = await request(app).get('/api/dashboard');
            
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/application\/json/);
            expect(res.body.summary.totalNetWorth).toBe(0);
            expect(res.body.summary.totalAssets).toBe(0);
            expect(res.body.summary.totalDebts).toBe(0);
        });

        it('should calculate net worth correctly', async () => {
            // Add asset
            await request(app)
                .post('/api/assets')
                .send({ name: 'Savings', type: 'bank_account', balance: 10000 });
            
            // Add debt
            await request(app)
                .post('/api/debts')
                .send({ name: 'Loan', type: 'personal_loan', balance: 3000, interestRate: 5 });

            const res = await request(app).get('/api/dashboard');
            
            expect(res.status).toBe(200);
            expect(res.body.summary.totalAssets).toBe(10000);
            expect(res.body.summary.totalDebts).toBe(3000);
            expect(res.body.summary.totalNetWorth).toBe(7000);
        });

        it('should include LISA bonus in calculations', async () => {
            await request(app)
                .post('/api/assets')
                .send({ name: 'LISA', type: 'lisa', balance: 4000 });

            const res = await request(app).get('/api/dashboard');
            
            // LISA balance (4000) + 25% bonus (1000) = 5000
            expect(res.body.summary.totalAssets).toBe(5000);
            expect(res.body.summary.lisaBonusTotal).toBe(1000);
        });

        it('should calculate debt-to-equity ratio', async () => {
            await request(app)
                .post('/api/assets')
                .send({ name: 'Cash', type: 'bank_account', balance: 10000 });
            await request(app)
                .post('/api/debts')
                .send({ name: 'Debt', type: 'personal_loan', balance: 5000, interestRate: 5 });

            const res = await request(app).get('/api/dashboard');
            
            // Ratio = 5000 / (10000 + 5000) = 0.333
            expect(res.body.ratios.debtToEquity).toBeCloseTo(0.333, 2);
        });

        it('should calculate asset allocation', async () => {
            await request(app)
                .post('/api/assets')
                .send({ name: 'Bank', type: 'bank_account', balance: 5000 });
            await request(app)
                .post('/api/assets')
                .send({ name: 'Stocks', type: 'stock_portfolio', balance: 10000 });

            const res = await request(app).get('/api/dashboard');
            
            expect(res.body.assetAllocation.cash).toBe(5000);
            expect(res.body.assetAllocation.investments).toBe(10000);
        });

        it('should return counts of assets and debts', async () => {
            await request(app)
                .post('/api/assets')
                .send({ name: 'Asset 1', type: 'bank_account', balance: 1000 });
            await request(app)
                .post('/api/assets')
                .send({ name: 'Asset 2', type: 'isa', balance: 2000 });
            await request(app)
                .post('/api/debts')
                .send({ name: 'Debt 1', type: 'student_loan', balance: 5000, interestRate: 6 });

            const res = await request(app).get('/api/dashboard');
            
            expect(res.body.counts.totalAssets).toBe(2);
            expect(res.body.counts.totalDebts).toBe(1);
        });
    });
});

// =========================================//
// -------- PROJECTIONS API TESTS ---------//
// =========================================//

describe('Projections API', () => {
    beforeEach(async () => {
        await resetTestData();
    });

    describe('GET /api/projections', () => {
        it('should return projections with default parameters', async () => {
            const res = await request(app).get('/api/projections');
            
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/application\/json/);
            expect(res.body.params.years).toBe(10);
            expect(res.body.params.growthRate).toBe(7);
        });

        it('should accept custom parameters', async () => {
            const res = await request(app).get('/api/projections?years=5&growthRate=10');
            
            expect(res.status).toBe(200);
            expect(res.body.params.years).toBe(5);
            expect(res.body.params.growthRate).toBe(10);
        });

        it('should generate projection points', async () => {
            await request(app)
                .post('/api/assets')
                .send({ name: 'Investment', type: 'stock_portfolio', balance: 10000 });

            const res = await request(app).get('/api/projections?years=3');
            
            expect(res.status).toBe(200);
            expect(res.body.projections.length).toBe(4); // Year 0, 1, 2, 3
            expect(res.body.projections[0]).toHaveProperty('year');
            expect(res.body.projections[0]).toHaveProperty('totalAssets');
            expect(res.body.projections[0]).toHaveProperty('totalDebts');
            expect(res.body.projections[0]).toHaveProperty('netWorth');
        });

        it('should generate scenario comparisons', async () => {
            const res = await request(app).get('/api/projections');
            
            expect(res.status).toBe(200);
            expect(res.body.scenarios.length).toBe(3);
            expect(res.body.scenarios[0]).toHaveProperty('rate');
            expect(res.body.scenarios[0]).toHaveProperty('finalNetWorth');
        });

        it('should calculate projected growth correctly', async () => {
            await request(app)
                .post('/api/assets')
                .send({ name: 'Fund', type: 'stock_portfolio', balance: 10000 });

            const res = await request(app).get('/api/projections?years=1&growthRate=10');
            
            // 10000 * 1.10 = 11000
            expect(res.body.projections[1].totalAssets).toBeCloseTo(11000, 0);
        });
    });
});

// =========================================//
// -------- CONTENT-TYPE TESTS ------------//
// =========================================//

describe('Content-Type and HTTP Codes', () => {
    it('should return application/json for all API endpoints', async () => {
        const endpoints = [
            '/api/assets',
            '/api/debts',
            '/api/dashboard',
            '/api/projections'
        ];

        for (const endpoint of endpoints) {
            const res = await request(app).get(endpoint);
            expect(res.headers['content-type']).toMatch(/application\/json/);
        }
    });

    it('should return 200 for successful GET requests', async () => {
        const res = await request(app).get('/api/dashboard');
        expect(res.status).toBe(200);
    });

    it('should return 201 for successful POST requests', async () => {
        const res = await request(app)
            .post('/api/assets')
            .send({ name: 'Test', type: 'bank_account', balance: 100 });
        expect(res.status).toBe(201);
    });

    it('should return 400 for bad requests', async () => {
        const res = await request(app)
            .post('/api/assets')
            .send({ invalid: 'data' });
        expect(res.status).toBe(400);
    });

    it('should return 404 for not found resources', async () => {
        const res = await request(app).get('/api/assets/nonexistent123');
        expect(res.status).toBe(404);
    });

    it('should return 204 for successful DELETE requests', async () => {
        const createRes = await request(app)
            .post('/api/assets')
            .send({ name: 'To Delete', type: 'bank_account', balance: 100 });
        
        const res = await request(app).delete(`/api/assets/${createRes.body.id}`);
        expect(res.status).toBe(204);
    });
});
