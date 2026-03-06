import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/seed
 * Seed the database with sample data for demonstration
 * 
 * Response: Success message with counts
 */
export async function POST() {
  try {
    // Clear existing data
    await db.assetHistory.deleteMany();
    await db.debtHistory.deleteMany();
    await db.asset.deleteMany();
    await db.debt.deleteMany();

    // Create sample assets
    const assets = await Promise.all([
      // Bank Accounts
      db.asset.create({
        data: {
          name: 'Monzo Current Account',
          type: 'BANK_CURRENT',
          category: 'CASH',
          balance: 2450.75,
          currency: 'GBP',
          annualReturnRate: 0,
        },
      }),
      db.asset.create({
        data: {
          name: 'Marcus Savings Account',
          type: 'BANK_SAVINGS',
          category: 'CASH',
          balance: 15000.00,
          currency: 'GBP',
          annualReturnRate: 4.5,
        },
      }),
      // ISAs
      db.asset.create({
        data: {
          name: 'Vanguard Stocks & Shares ISA',
          type: 'ISA',
          category: 'INVESTMENT',
          balance: 28500.00,
          currency: 'GBP',
          isTaxAdvantaged: true,
          annualReturnRate: 7,
        },
      }),
      // LISA
      db.asset.create({
        data: {
          name: 'Moneybox Lifetime ISA',
          type: 'LISA',
          category: 'INVESTMENT',
          balance: 12000.00,
          currency: 'GBP',
          isTaxAdvantaged: true,
          governmentBonus: 3000.00,
          annualReturnRate: 5,
        },
      }),
      // Stocks
      db.asset.create({
        data: {
          name: 'Apple Inc.',
          type: 'STOCK',
          category: 'INVESTMENT',
          balance: 8500.00,
          currency: 'GBP',
          ticker: 'AAPL',
          shares: 50,
          purchasePrice: 150.00,
          annualReturnRate: 10,
        },
      }),
      db.asset.create({
        data: {
          name: 'Microsoft Corp.',
          type: 'STOCK',
          category: 'INVESTMENT',
          balance: 6200.00,
          currency: 'GBP',
          ticker: 'MSFT',
          shares: 15,
          purchasePrice: 350.00,
          annualReturnRate: 10,
        },
      }),
      // Property (for mortgage equity calculation)
      db.asset.create({
        data: {
          name: 'Flat in London',
          type: 'PROPERTY',
          category: 'PROPERTY',
          balance: 350000.00,
          currency: 'GBP',
          annualReturnRate: 3,
        },
      }),
    ]);

    // Create sample debts
    const debts = await Promise.all([
      // Student Loan
      db.debt.create({
        data: {
          name: 'Student Finance England',
          type: 'STUDENT_LOAN',
          balance: 42000.00,
          originalAmount: 45000.00,
          interestRate: 7.3,
          minimumPayment: 0, // Income-contingent
          monthlyPayment: 250.00,
          studentLoanPlan: 'PLAN_2',
          startDate: new Date('2019-09-01'),
        },
      }),
      // Credit Card
      db.debt.create({
        data: {
          name: 'Barclaycard Platinum',
          type: 'CREDIT_CARD',
          balance: 1850.00,
          originalAmount: 5000.00,
          interestRate: 22.9,
          minimumPayment: 45.00,
          monthlyPayment: 150.00,
        },
      }),
      // Mortgage
      db.debt.create({
        data: {
          name: 'Nationwide Mortgage',
          type: 'MORTGAGE',
          balance: 265000.00,
          originalAmount: 280000.00,
          interestRate: 5.2,
          minimumPayment: 1450.00,
          monthlyPayment: 1450.00,
          propertyValue: 350000.00,
          startDate: new Date('2021-03-01'),
          targetEndDate: new Date('2051-03-01'),
        },
      }),
      // Personal Loan
      db.debt.create({
        data: {
          name: 'Tesco Personal Loan',
          type: 'PERSONAL_LOAN',
          balance: 5200.00,
          originalAmount: 10000.00,
          interestRate: 6.9,
          minimumPayment: 195.00,
          monthlyPayment: 195.00,
          startDate: new Date('2023-01-15'),
          targetEndDate: new Date('2028-01-15'),
        },
      }),
    ]);

    // Create history entries for assets
    const now = new Date();
    for (const asset of assets) {
      // Create 12 months of history with some variation
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const variation = 1 + (Math.random() * 0.1 - 0.05); // +/- 5% variation
        const historicalBalance = asset.balance * variation * (1 - i * 0.02); // Slight growth trend
        
        await db.assetHistory.create({
          data: {
            assetId: asset.id,
            balance: Math.round(historicalBalance * 100) / 100,
            recordedAt: date,
          },
        });
      }
    }

    // Create history entries for debts
    for (const debt of debts) {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const variation = 1 + (Math.random() * 0.05); // Debt tends to grow or stay similar
        const historicalBalance = debt.balance * variation * (1 + i * 0.015); // Debt was higher in past
        
        await db.debtHistory.create({
          data: {
            debtId: debt.id,
            balance: Math.round(historicalBalance * 100) / 100,
            recordedAt: date,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        assetsCreated: assets.length,
        debtsCreated: debts.length,
        historyEntriesCreated: (assets.length + debts.length) * 12,
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to seed database',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
