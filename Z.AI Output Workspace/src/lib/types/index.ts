// Asset Types
export type AssetType = 
  | 'BANK_CURRENT' 
  | 'BANK_SAVINGS' 
  | 'ISA' 
  | 'LISA' 
  | 'STOCK' 
  | 'PROPERTY' 
  | 'OTHER';

export type AssetCategory = 'CASH' | 'INVESTMENT' | 'PROPERTY';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  category: AssetCategory;
  balance: number;
  currency: string;
  isTaxAdvantaged: boolean;
  governmentBonus: number | null;
  ticker: string | null;
  shares: number | null;
  purchasePrice: number | null;
  annualReturnRate: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Debt Types
export type DebtType = 
  | 'STUDENT_LOAN' 
  | 'CREDIT_CARD' 
  | 'PERSONAL_LOAN' 
  | 'MORTGAGE' 
  | 'OTHER';

export type StudentLoanPlan = 'PLAN_1' | 'PLAN_2' | 'PLAN_4' | 'PLAN_5' | 'POSTGRAD';

export interface Debt {
  id: string;
  name: string;
  type: DebtType;
  balance: number;
  originalAmount: number | null;
  interestRate: number;
  minimumPayment: number | null;
  monthlyPayment: number | null;
  studentLoanPlan: StudentLoanPlan | null;
  propertyValue: number | null;
  startDate: string | null;
  targetEndDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  total?: number;
}

// Summary Types
export interface FinancialSummary {
  netWorth: number;
  totalAssets: number;
  totalDebts: number;
  totalGovernmentBonus: number;
  assetAllocation: {
    cash: number;
    investments: number;
    property: number;
    propertyEquity: number;
  };
  assetBreakdown: Record<string, number>;
  debtBreakdown: Record<string, number>;
  ratios: {
    debtToEquity: number;
    liquidity: number;
    debtToAsset: number;
  };
  monthlyPayments: {
    total: number;
    breakdown: Array<{
      name: string;
      type: string;
      payment: number;
    }>;
  };
  studentLoanDetails: Array<{
    id: string;
    name: string;
    balance: number;
    plan: string | null;
    interestRate: number;
    monthlyInterestAccrual: number;
  }>;
  history: Array<{
    month: string;
    assets: number;
    debts: number;
    netWorth: number;
  }>;
  summary: {
    assetCount: number;
    debtCount: number;
    currencies: string[];
  };
}

// Projection Types
export interface Projection {
  year: number;
  assets: number;
  debts: number;
  netWorth: number;
}

export interface DebtPayoffInfo {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  payoffDate: string | null;
  totalInterest: number;
  monthsRemaining: number;
}

export interface FinancialProjection {
  currentNetWorth: number;
  projections: Array<{
    rate: number;
    yearlyProjections: Projection[];
  }>;
  debtPayoffTimeline: DebtPayoffInfo[];
  netWorthTrendline: Array<{
    date: string;
    value: number;
    type: 'historical' | 'projected';
  }>;
  assetProjections: Array<{
    id: string;
    name: string;
    ticker: string | null;
    currentValue: number;
    growthRate: number;
    projections: Array<{ year: number; value: number }>;
  }>;
  lisaProjections: Array<{
    id: string;
    name: string;
    currentBalance: number;
    currentBonus: number;
    potentialAnnualBonus: number;
    projections: Array<{ year: number; estimatedBonus: number }>;
  }>;
  summary: {
    projectedNetWorth10Years: number;
    earliestDebtFreeDate: string | null;
    totalProjectedInterest: number;
  };
}

// Form Types
export interface AssetFormData {
  name: string;
  type: AssetType;
  category: AssetCategory;
  balance: number;
  currency: string;
  isTaxAdvantaged: boolean;
  governmentBonus?: number;
  ticker?: string;
  shares?: number;
  purchasePrice?: number;
  annualReturnRate?: number;
  notes?: string;
}

export interface DebtFormData {
  name: string;
  type: DebtType;
  balance: number;
  originalAmount?: number;
  interestRate: number;
  minimumPayment?: number;
  monthlyPayment?: number;
  studentLoanPlan?: StudentLoanPlan;
  propertyValue?: number;
  startDate?: string;
  targetEndDate?: string;
  notes?: string;
}

// Constants
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  BANK_CURRENT: 'Current Account',
  BANK_SAVINGS: 'Savings Account',
  ISA: 'ISA',
  LISA: 'Lifetime ISA',
  STOCK: 'Stock/Shares',
  PROPERTY: 'Property',
  OTHER: 'Other Asset',
};

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  CASH: 'Cash',
  INVESTMENT: 'Investment',
  PROPERTY: 'Property',
};

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  STUDENT_LOAN: 'Student Loan',
  CREDIT_CARD: 'Credit Card',
  PERSONAL_LOAN: 'Personal Loan',
  MORTGAGE: 'Mortgage',
  OTHER: 'Other Debt',
};

export const STUDENT_LOAN_PLAN_LABELS: Record<StudentLoanPlan, string> = {
  PLAN_1: 'Plan 1 (Pre-2012)',
  PLAN_2: 'Plan 2 (2012-2023)',
  PLAN_4: 'Plan 4 (Scotland)',
  PLAN_5: 'Plan 5 (Post-2023)',
  POSTGRAD: 'Postgraduate Loan',
};

// Helper to determine category from type
export function getCategoryFromType(type: AssetType): AssetCategory {
  if (['BANK_CURRENT', 'BANK_SAVINGS'].includes(type)) return 'CASH';
  if (['ISA', 'LISA', 'STOCK'].includes(type)) return 'INVESTMENT';
  if (type === 'PROPERTY') return 'PROPERTY';
  return 'CASH';
}

// Format currency
export function formatCurrency(value: number, currency: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Format date
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

// Format months to years and months
export function formatMonthsToYearsMonths(months: number): string {
  if (months === Infinity) return 'Never (payment too low)';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths} months`;
  if (remainingMonths === 0) return `${years} years`;
  return `${years} years, ${remainingMonths} months`;
}
