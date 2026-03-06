import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/summary
 * Get financial summary including net worth, asset allocation, and ratios
 * 
 * Response: Financial summary object
 */
export async function GET(request: NextRequest) {
  try {
    // Fetch all assets and debts
    const assets = await db.asset.findMany({
      include: {
        history: {
          orderBy: { recordedAt: 'desc' },
          take: 12,
        },
      },
    });

    const debts = await db.debt.findMany({
      include: {
        history: {
          orderBy: { recordedAt: 'desc' },
          take: 12,
        },
      },
    });

    // Calculate totals
    const totalAssets = assets.reduce((sum, asset) => sum + asset.balance, 0);
    const totalDebts = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const netWorth = totalAssets - totalDebts;

    // Calculate government bonus for LISAs
    const totalGovernmentBonus = assets
      .filter(a => a.type === 'LISA' && a.governmentBonus)
      .reduce((sum, a) => sum + (a.governmentBonus || 0), 0);

    // Asset allocation by category
    const cashAssets = assets
      .filter(a => a.category === 'CASH')
      .reduce((sum, a) => sum + a.balance, 0);
    
    const investmentAssets = assets
      .filter(a => a.category === 'INVESTMENT')
      .reduce((sum, a) => sum + a.balance, 0);
    
    const propertyAssets = assets
      .filter(a => a.category === 'PROPERTY')
      .reduce((sum, a) => sum + a.balance, 0);

    // Asset allocation by type
    const assetsByType = assets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + asset.balance;
      return acc;
    }, {} as Record<string, number>);

    // Debt allocation by type
    const debtsByType = debts.reduce((acc, debt) => {
      acc[debt.type] = (acc[debt.type] || 0) + debt.balance;
      return acc;
    }, {} as Record<string, number>);

    // Debt-to-Equity Ratio (Debt / (Debt + Equity))
    const debtToEquityRatio = totalAssets + totalDebts > 0 
      ? totalDebts / (totalAssets + totalDebts) 
      : 0;

    // Liquidity Ratio (Cash / Monthly Debt Obligations)
    const monthlyDebtPayments = debts.reduce((sum, debt) => {
      return sum + (debt.minimumPayment || debt.monthlyPayment || 0);
    }, 0);
    const liquidityRatio = monthlyDebtPayments > 0 
      ? cashAssets / monthlyDebtPayments 
      : cashAssets > 0 ? Infinity : 0;

    // Calculate historical net worth (last 12 months)
    const monthlyHistory = calculateMonthlyHistory(assets, debts);

    // Student loan interest calculations
    const studentLoans = debts.filter(d => d.type === 'STUDENT_LOAN');
    const studentLoanDetails = studentLoans.map(loan => {
      const planInterestRate = getStudentLoanInterestRate(loan.studentLoanPlan);
      const monthlyInterest = (loan.balance * (planInterestRate / 100)) / 12;
      return {
        id: loan.id,
        name: loan.name,
        balance: loan.balance,
        plan: loan.studentLoanPlan,
        interestRate: planInterestRate,
        monthlyInterestAccrual: monthlyInterest,
      };
    });

    // Calculate property equity for mortgages
    const mortgages = debts.filter(d => d.type === 'MORTGAGE' && d.propertyValue);
    const propertyEquity = mortgages.reduce((sum, mortgage) => {
      return sum + ((mortgage.propertyValue || 0) - mortgage.balance);
    }, 0);

    return NextResponse.json({
      success: true,
      data: {
        netWorth,
        totalAssets,
        totalDebts,
        totalGovernmentBonus,
        assetAllocation: {
          cash: cashAssets,
          investments: investmentAssets,
          property: propertyAssets,
          propertyEquity,
        },
        assetBreakdown: assetsByType,
        debtBreakdown: debtsByType,
        ratios: {
          debtToEquity: debtToEquityRatio,
          liquidity: liquidityRatio,
          debtToAsset: totalAssets > 0 ? totalDebts / totalAssets : 0,
        },
        monthlyPayments: {
          total: monthlyDebtPayments,
          breakdown: debts.map(d => ({
            name: d.name,
            type: d.type,
            payment: d.minimumPayment || d.monthlyPayment || 0,
          })),
        },
        studentLoanDetails,
        history: monthlyHistory,
        summary: {
          assetCount: assets.length,
          debtCount: debts.length,
          currencies: [...new Set(assets.map(a => a.currency))],
        },
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching summary:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch summary',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * Calculate monthly net worth history
 */
function calculateMonthlyHistory(
  assets: { history: { balance: number; recordedAt: Date }[] }[],
  debts: { history: { balance: number; recordedAt: Date }[] }[]
) {
  const months: { month: string; assets: number; debts: number; netWorth: number }[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = monthDate.toISOString().slice(0, 7); // YYYY-MM format

    // Get the most recent balance for each asset/debt at this month
    let monthAssets = 0;
    let monthDebts = 0;

    assets.forEach(asset => {
      const relevantHistory = asset.history.find(h => 
        new Date(h.recordedAt) <= new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      );
      if (relevantHistory) {
        monthAssets += relevantHistory.balance;
      }
    });

    debts.forEach(debt => {
      const relevantHistory = debt.history.find(h => 
        new Date(h.recordedAt) <= new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      );
      if (relevantHistory) {
        monthDebts += relevantHistory.balance;
      }
    });

    months.push({
      month: monthKey,
      assets: monthAssets || assets.reduce((sum, a) => sum + a.balance, 0),
      debts: monthDebts || debts.reduce((sum, d) => sum + d.balance, 0),
      netWorth: (monthAssets || assets.reduce((sum, a) => sum + a.balance, 0)) - 
                (monthDebts || debts.reduce((sum, d) => sum + d.balance, 0)),
    });
  }

  return months;
}

/**
 * Get student loan interest rate based on plan type
 * UK Student Loan interest rates (approximate current rates)
 */
function getStudentLoanInterestRate(plan: string | null): number {
  switch (plan) {
    case 'PLAN_1':
      return 6.25; // Plan 1 current rate
    case 'PLAN_2':
      return 7.3; // Plan 2 current rate (RPI + 3%)
    case 'PLAN_4':
      return 6.25; // Plan 4 (Scotland)
    case 'PLAN_5':
      return 6.25; // Plan 5
    case 'POSTGRAD':
      return 7.3; // Postgraduate loan
    default:
      return 6.25;
  }
}
