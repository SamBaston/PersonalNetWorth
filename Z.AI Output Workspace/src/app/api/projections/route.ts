import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/projections
 * Get financial projections based on growth rates and payment schedules
 * 
 * Query Parameters:
 * - years: Number of years to project (default: 10)
 * - growthRate: Override growth rate for investments (optional)
 * 
 * Response: Projection data including net worth trend and debt payoff dates
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const years = parseInt(searchParams.get('years') || '10');
    const overrideGrowthRate = searchParams.get('growthRate') 
      ? parseFloat(searchParams.get('growthRate')!) 
      : null;

    // Fetch all assets and debts
    const assets = await db.asset.findMany();
    const debts = await db.debt.findMany();

    // Calculate current net worth
    const currentNetWorth = assets.reduce((sum, a) => sum + a.balance, 0) - 
                            debts.reduce((sum, d) => sum + d.balance, 0);

    // Growth projections for different scenarios
    const growthScenarios = [4, 7, 10];
    const projections = growthScenarios.map(rate => {
      return {
        rate,
        yearlyProjections: calculateGrowthProjection(assets, debts, years, rate),
      };
    });

    // If override growth rate is provided, add custom scenario
    if (overrideGrowthRate !== null) {
      projections.push({
        rate: overrideGrowthRate,
        yearlyProjections: calculateGrowthProjection(assets, debts, years, overrideGrowthRate),
      });
    }

    // Calculate debt payoff timeline
    const debtPayoffTimeline = debts.map(debt => {
      const payoffInfo = calculateDebtPayoff(debt);
      return {
        id: debt.id,
        name: debt.name,
        type: debt.type,
        currentBalance: debt.balance,
        interestRate: debt.interestRate,
        monthlyPayment: debt.monthlyPayment || debt.minimumPayment || 0,
        payoffDate: payoffInfo.payoffDate,
        totalInterest: payoffInfo.totalInterest,
        monthsRemaining: payoffInfo.monthsRemaining,
      };
    });

    // Calculate net worth trendline (historical + projected)
    const netWorthTrendline = calculateNetWorthTrendline(
      assets, 
      debts, 
      years, 
      overrideGrowthRate || 7
    );

    // Investment growth by asset
    const assetProjections = assets
      .filter(a => a.category === 'INVESTMENT')
      .map(asset => {
        const growthRate = overrideGrowthRate ?? (asset.annualReturnRate || 7);
        return {
          id: asset.id,
          name: asset.name,
          ticker: asset.ticker,
          currentValue: asset.balance,
          growthRate,
          projections: Array.from({ length: years }, (_, i) => ({
            year: i + 1,
            value: asset.balance * Math.pow(1 + growthRate / 100, i + 1),
          })),
        };
      });

    // LISA government bonus projection
    const lisaProjections = assets
      .filter(a => a.type === 'LISA')
      .map(lisa => {
        // Maximum annual contribution is £4,000 with 25% bonus
        const maxAnnualContribution = 4000;
        const maxAnnualBonus = 1000;
        return {
          id: lisa.id,
          name: lisa.name,
          currentBalance: lisa.balance,
          currentBonus: lisa.governmentBonus || 0,
          potentialAnnualBonus: maxAnnualBonus,
          projections: Array.from({ length: Math.min(years, 18) }, (_, i) => ({
            year: i + 1,
            estimatedBonus: Math.min((i + 1) * maxAnnualBonus, 33000), // Max lifetime bonus ~£33k
          })),
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        currentNetWorth,
        projections,
        debtPayoffTimeline,
        netWorthTrendline,
        assetProjections,
        lisaProjections,
        summary: {
          projectedNetWorth10Years: projections.find(p => p.rate === 7)?.yearlyProjections[9]?.netWorth || 0,
          earliestDebtFreeDate: debtPayoffTimeline
            .filter(d => d.payoffDate)
            .sort((a, b) => new Date(a.payoffDate!).getTime() - new Date(b.payoffDate!).getTime())[0]?.payoffDate,
          totalProjectedInterest: debtPayoffTimeline.reduce((sum, d) => sum + d.totalInterest, 0),
        },
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Error calculating projections:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to calculate projections',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * Calculate growth projection for a given rate
 */
function calculateGrowthProjection(
  assets: { balance: number; category: string; annualReturnRate: number | null }[],
  debts: { balance: number; interestRate: number; monthlyPayment: number | null; minimumPayment: number | null }[],
  years: number,
  growthRate: number
) {
  const yearlyProjections = [];
  
  let currentAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  let currentDebts = debts.reduce((sum, d) => sum + d.balance, 0);

  // Separate investment assets for growth calculation
  const investmentAssets = assets.filter(a => a.category === 'INVESTMENT');
  const cashAssets = assets.filter(a => a.category === 'CASH');

  for (let year = 1; year <= years; year++) {
    // Grow investment assets
    const investmentValue = investmentAssets.reduce((sum, a) => {
      const rate = a.annualReturnRate || growthRate;
      return sum + (a.balance * Math.pow(1 + rate / 100, year));
    }, 0);

    // Cash grows at a minimal rate (e.g., savings interest)
    const cashValue = cashAssets.reduce((sum, a) => {
      return sum + (a.balance * Math.pow(1.02, year)); // 2% savings rate
    }, 0);

    const projectedAssets = investmentValue + cashValue;

    // Reduce debts based on payments (simplified)
    let projectedDebts = 0;
    debts.forEach(debt => {
      const monthlyPayment = debt.monthlyPayment || debt.minimumPayment || 
        (debt.balance * 0.02); // Assume 2% minimum if not specified
      
      const monthlyRate = debt.interestRate / 100 / 12;
      let balance = debt.balance;
      
      for (let month = 0; month < year * 12; month++) {
        if (balance <= 0) break;
        const interest = balance * monthlyRate;
        balance = balance + interest - monthlyPayment;
      }
      
      projectedDebts += Math.max(0, balance);
    });

    yearlyProjections.push({
      year,
      assets: Math.round(projectedAssets),
      debts: Math.round(projectedDebts),
      netWorth: Math.round(projectedAssets - projectedDebts),
    });
  }

  return yearlyProjections;
}

/**
 * Calculate debt payoff date and total interest
 */
function calculateDebtPayoff(debt: {
  balance: number;
  interestRate: number;
  monthlyPayment: number | null;
  minimumPayment: number | null;
}): { payoffDate: string | null; totalInterest: number; monthsRemaining: number } {
  const monthlyPayment = debt.monthlyPayment || debt.minimumPayment;
  
  if (!monthlyPayment || monthlyPayment <= 0) {
    return { payoffDate: null, totalInterest: 0, monthsRemaining: Infinity };
  }

  const monthlyRate = debt.interestRate / 100 / 12;
  let balance = debt.balance;
  let totalInterest = 0;
  let months = 0;
  const maxMonths = 600; // 50 years max

  while (balance > 0 && months < maxMonths) {
    const interest = balance * monthlyRate;
    totalInterest += interest;
    balance = balance + interest - monthlyPayment;
    months++;

    // If balance is increasing (payment too low)
    if (months > 12 && balance > debt.balance) {
      return { payoffDate: null, totalInterest: Infinity, monthsRemaining: Infinity };
    }
  }

  if (months >= maxMonths) {
    return { payoffDate: null, totalInterest, monthsRemaining: Infinity };
  }

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + months);

  return {
    payoffDate: payoffDate.toISOString().split('T')[0],
    totalInterest: Math.round(totalInterest),
    monthsRemaining: months,
  };
}

/**
 * Calculate net worth trendline (historical + projected)
 */
function calculateNetWorthTrendline(
  assets: { balance: number; category: string; annualReturnRate: number | null; history?: { balance: number; recordedAt: string }[] }[],
  debts: { balance: number; interestRate: number; monthlyPayment: number | null; minimumPayment: number | null }[],
  years: number,
  growthRate: number
) {
  const trendline: { date: string; value: number; type: 'historical' | 'projected' }[] = [];
  const now = new Date();

  // Add current point
  const currentNetWorth = assets.reduce((sum, a) => sum + a.balance, 0) - 
                          debts.reduce((sum, d) => sum + d.balance, 0);
  
  trendline.push({
    date: now.toISOString().split('T')[0],
    value: currentNetWorth,
    type: 'historical',
  });

  // Add projected points (yearly)
  const projection = calculateGrowthProjection(
    assets.map(a => ({ ...a, annualReturnRate: a.annualReturnRate || growthRate })),
    debts,
    years,
    growthRate
  );

  projection.forEach(p => {
    const date = new Date(now);
    date.setFullYear(date.getFullYear() + p.year);
    trendline.push({
      date: date.toISOString().split('T')[0],
      value: p.netWorth,
      type: 'projected',
    });
  });

  return trendline;
}
