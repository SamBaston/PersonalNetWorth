'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  CreditCard,
  GraduationCap,
  Home,
  Building2,
  Landmark,
  BarChart3,
  LineChart,
  Plus,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  PieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  Asset,
  Debt,
  FinancialSummary,
  FinancialProjection,
  AssetFormData,
  DebtFormData,
  ASSET_TYPE_LABELS,
  DEBT_TYPE_LABELS,
  formatCurrency,
  formatPercentage,
  formatDate,
  formatMonthsToYearsMonths,
  getCategoryFromType,
  AssetType,
  AssetCategory,
  DebtType,
  StudentLoanPlan,
} from '@/lib/types';
import { AssetForm } from '@/components/net-worth/AssetForm';
import { DebtForm } from '@/components/net-worth/DebtForm';
import { AssetList } from '@/components/net-worth/AssetList';
import { DebtList } from '@/components/net-worth/DebtList';

// Chart colors
const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
};

const ASSET_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
const DEBT_COLORS = ['#ef4444', '#f97316', '#eab308', '#a855f7', '#6b7280'];

export default function NetWorthTracker() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [projections, setProjections] = useState<FinancialProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetsRes, debtsRes, summaryRes, projectionsRes] = await Promise.all([
        fetch('/api/assets'),
        fetch('/api/debts'),
        fetch('/api/summary'),
        fetch('/api/projections?years=10'),
      ]);

      if (!assetsRes.ok || !debtsRes.ok || !summaryRes.ok || !projectionsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const assetsData = await assetsRes.json();
      const debtsData = await debtsRes.json();
      const summaryData = await summaryRes.json();
      const projectionsData = await projectionsRes.json();

      setAssets(assetsData.data || []);
      setDebts(debtsData.data || []);
      setSummary(summaryData.data);
      setProjections(projectionsData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Asset CRUD operations
  const handleCreateAsset = async (data: AssetFormData) => {
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          category: getCategoryFromType(data.type),
        }),
      });
      if (!res.ok) throw new Error('Failed to create asset');
      toast.success('Asset created successfully');
      setShowAssetForm(false);
      fetchData();
    } catch {
      toast.error('Failed to create asset');
    }
  };

  const handleUpdateAsset = async (id: string, data: Partial<AssetFormData>) => {
    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update asset');
      toast.success('Asset updated successfully');
      setEditingAsset(null);
      fetchData();
    } catch {
      toast.error('Failed to update asset');
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete asset');
      toast.success('Asset deleted successfully');
      fetchData();
    } catch {
      toast.error('Failed to delete asset');
    }
  };

  // Debt CRUD operations
  const handleCreateDebt = async (data: DebtFormData) => {
    try {
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create debt');
      toast.success('Debt created successfully');
      setShowDebtForm(false);
      fetchData();
    } catch {
      toast.error('Failed to create debt');
    }
  };

  const handleUpdateDebt = async (id: string, data: Partial<DebtFormData>) => {
    try {
      const res = await fetch(`/api/debts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update debt');
      toast.success('Debt updated successfully');
      setEditingDebt(null);
      fetchData();
    } catch {
      toast.error('Failed to update debt');
    }
  };

  const handleDeleteDebt = async (id: string) => {
    try {
      const res = await fetch(`/api/debts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete debt');
      toast.success('Debt deleted successfully');
      fetchData();
    } catch {
      toast.error('Failed to delete debt');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare chart data
  const assetAllocationData = summary ? [
    { name: 'Cash', value: summary.assetAllocation.cash, color: ASSET_COLORS[0] },
    { name: 'Investments', value: summary.assetAllocation.investments, color: ASSET_COLORS[1] },
    { name: 'Property Equity', value: summary.assetAllocation.propertyEquity, color: ASSET_COLORS[2] },
  ].filter(d => d.value > 0) : [];

  const debtBreakdownData = summary ? Object.entries(summary.debtBreakdown).map(([type, value], index) => ({
    name: DEBT_TYPE_LABELS[type as DebtType] || type,
    value,
    color: DEBT_COLORS[index % DEBT_COLORS.length],
  })) : [];

  const netWorthHistory = summary?.history || [];
  const trendlineData = projections?.netWorthTrendline || [];

  const chartConfig: ChartConfig = {
    assets: { label: 'Assets', color: '#10b981' },
    debts: { label: 'Debts', color: '#ef4444' },
    netWorth: { label: 'Net Worth', color: '#3b82f6' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Net Worth Tracker
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your financial journey and plan for the future
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAssetForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowDebtForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Debt
            </Button>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              <span className="hidden sm:inline">Assets</span>
            </TabsTrigger>
            <TabsTrigger value="debts" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Debts</span>
            </TabsTrigger>
            <TabsTrigger value="projections" className="flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              <span className="hidden sm:inline">Projections</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                <CardHeader className="pb-2">
                  <CardDescription className="text-blue-100">Net Worth</CardDescription>
                  <CardTitle className="text-3xl font-bold">
                    {formatCurrency(summary?.netWorth || 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-blue-100 text-sm">
                    {(summary?.netWorth || 0) >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    {formatCurrency(summary?.totalAssets || 0)} - {formatCurrency(summary?.totalDebts || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-green-500" />
                    Total Assets
                  </CardDescription>
                  <CardTitle className="text-2xl">
                    {formatCurrency(summary?.totalAssets || 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {summary?.summary.assetCount || 0} accounts
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-red-500" />
                    Total Debts
                  </CardDescription>
                  <CardTitle className="text-2xl">
                    {formatCurrency(summary?.totalDebts || 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {summary?.summary.debtCount || 0} liabilities
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-purple-500" />
                    Monthly Payments
                  </CardDescription>
                  <CardTitle className="text-2xl">
                    {formatCurrency(summary?.monthlyPayments.total || 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Liquidity: {summary?.ratios.liquidity === Infinity ? '∞' : `${summary?.ratios.liquidity.toFixed(1)}x`}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Asset Allocation Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Asset Allocation
                  </CardTitle>
                  <CardDescription>Breakdown by category</CardDescription>
                </CardHeader>
                <CardContent>
                  {assetAllocationData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={assetAllocationData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {assetAllocationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          formatter={(value: number) => formatCurrency(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No assets to display
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 justify-center mt-4">
                    {assetAllocationData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm">{entry.name}</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(entry.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Debt Breakdown Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Debt Breakdown
                  </CardTitle>
                  <CardDescription>Liabilities by type</CardDescription>
                </CardHeader>
                <CardContent>
                  {debtBreakdownData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={debtBreakdownData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {debtBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          formatter={(value: number) => formatCurrency(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No debts to display
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 justify-center mt-4">
                    {debtBreakdownData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm">{entry.name}</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(entry.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Financial Ratios */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Debt-to-Asset Ratio</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatPercentage((summary?.ratios.debtToAsset || 0) * 100)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress 
                    value={Math.min((summary?.ratios.debtToAsset || 0) * 100, 100)} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {summary?.ratios.debtToAsset && summary.ratios.debtToAsset < 0.3 
                      ? '✓ Healthy ratio' 
                      : summary?.ratios.debtToAsset && summary.ratios.debtToAsset < 0.5
                      ? '⚠ Moderate risk'
                      : '⚠ High leverage'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Debt-to-Equity Ratio</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatPercentage((summary?.ratios.debtToEquity || 0) * 100)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress 
                    value={Math.min((summary?.ratios.debtToEquity || 0) * 100, 100)} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Measures financial leverage
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Liquidity Ratio</CardDescription>
                  <CardTitle className="text-2xl">
                    {summary?.ratios.liquidity === Infinity 
                      ? '∞' 
                      : `${summary?.ratios.liquidity.toFixed(1)}x`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress 
                    value={Math.min((summary?.ratios.liquidity || 0) * 10, 100)} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Months of expenses covered by cash
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Net Worth History Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Net Worth History (12 Months)</CardTitle>
                <CardDescription>Your financial journey over the past year</CardDescription>
              </CardHeader>
              <CardContent>
                {netWorthHistory.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <AreaChart data={netWorthHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tickFormatter={(value) => {
                          const date = new Date(value + '-01');
                          return date.toLocaleDateString('en-GB', { month: 'short' });
                        }}
                      />
                      <YAxis tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="netWorth"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.2}
                        name="Net Worth"
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No historical data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Student Loan Details */}
            {summary?.studentLoanDetails && summary.studentLoanDetails.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Student Loan Details
                  </CardTitle>
                  <CardDescription>Interest accrual and plan information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {summary.studentLoanDetails.map((loan) => (
                      <div key={loan.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">{loan.name}</p>
                          <p className="text-sm text-muted-foreground">{loan.plan}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-2 md:mt-0">
                          <div>
                            <p className="text-xs text-muted-foreground">Balance</p>
                            <p className="font-medium">{formatCurrency(loan.balance)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Interest Rate</p>
                            <p className="font-medium">{formatPercentage(loan.interestRate)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Monthly Interest</p>
                            <p className="font-medium text-red-500">
                              +{formatCurrency(loan.monthlyInterestAccrual)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Assets</h2>
                <p className="text-muted-foreground">Manage your bank accounts, investments, and property</p>
              </div>
              <Button onClick={() => setShowAssetForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </div>
            <AssetList
              assets={assets}
              onEdit={(asset) => setEditingAsset(asset)}
              onDelete={handleDeleteAsset}
            />
          </TabsContent>

          {/* Debts Tab */}
          <TabsContent value="debts" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Debts & Liabilities</h2>
                <p className="text-muted-foreground">Track loans, credit cards, and mortgages</p>
              </div>
              <Button onClick={() => setShowDebtForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Debt
              </Button>
            </div>
            <DebtList
              debts={debts}
              onEdit={(debt) => setEditingDebt(debt)}
              onDelete={handleDeleteDebt}
            />
          </TabsContent>

          {/* Projections Tab */}
          <TabsContent value="projections" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Projections & Forecasting</h2>
              <p className="text-muted-foreground">Plan your financial future with growth scenarios</p>
            </div>

            {/* Growth Scenarios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Net Worth Projections (10 Years)
                </CardTitle>
                <CardDescription>Compare different growth rate scenarios</CardDescription>
              </CardHeader>
              <CardContent>
                {projections?.projections ? (
                  <ChartContainer config={chartConfig} className="h-[400px] w-full">
                    <RechartsLineChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" type="category" allowDuplicatedCategory={false} />
                      <YAxis tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      {projections.projections.map((scenario, index) => (
                        <Line
                          key={scenario.rate}
                          data={scenario.yearlyProjections}
                          type="monotone"
                          dataKey="netWorth"
                          stroke={['#3b82f6', '#10b981', '#f59e0b'][index]}
                          strokeWidth={2}
                          dot={false}
                          name={`${scenario.rate}% Growth`}
                        />
                      ))}
                    </RechartsLineChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    Add assets to see projections
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Debt Payoff Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Debt Payoff Timeline
                </CardTitle>
                <CardDescription>Estimated payoff dates based on current payments</CardDescription>
              </CardHeader>
              <CardContent>
                {projections?.debtPayoffTimeline && projections.debtPayoffTimeline.length > 0 ? (
                  <div className="space-y-4">
                    {projections.debtPayoffTimeline.map((debt) => (
                      <div key={debt.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          {debt.type === 'MORTGAGE' ? (
                            <Home className="h-5 w-5 text-orange-500" />
                          ) : debt.type === 'STUDENT_LOAN' ? (
                            <GraduationCap className="h-5 w-5 text-blue-500" />
                          ) : (
                            <CreditCard className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium">{debt.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(debt.currentBalance)} at {formatPercentage(debt.interestRate)}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3 md:mt-0">
                          <div>
                            <p className="text-xs text-muted-foreground">Monthly Payment</p>
                            <p className="font-medium">{formatCurrency(debt.monthlyPayment)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Payoff Date</p>
                            <p className="font-medium">
                              {debt.payoffDate ? formatDate(debt.payoffDate) : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Interest</p>
                            <p className="font-medium text-red-500">
                              {debt.totalInterest === Infinity ? 'N/A' : formatCurrency(debt.totalInterest)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    No debts to display
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Investment Projections */}
            {projections?.assetProjections && projections.assetProjections.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Investment Growth Projections
                  </CardTitle>
                  <CardDescription>Individual investment account growth over 10 years</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {projections.assetProjections.map((asset, index) => (
                      <div key={asset.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {asset.ticker || asset.name}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatPercentage(asset.growthRate)} growth
                            </span>
                          </div>
                          <span className="font-medium">
                            {formatCurrency(asset.currentValue)} → {formatCurrency(asset.projections[9]?.value || 0)}
                          </span>
                        </div>
                        <Progress 
                          value={(asset.currentValue / (asset.projections[9]?.value || 1)) * 100}
                          className="h-2"
                          style={{ 
                            background: `linear-gradient(to right, ${ASSET_COLORS[index % ASSET_COLORS.length]}33, ${ASSET_COLORS[index % ASSET_COLORS.length]}66)` 
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* LISA Bonus Projections */}
            {projections?.lisaProjections && projections.lisaProjections.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Landmark className="h-5 w-5" />
                    LISA Government Bonus Projections
                  </CardTitle>
                  <CardDescription>25% government bonus on contributions up to £4,000/year</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projections.lisaProjections.map((lisa) => (
                      <div key={lisa.id} className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{lisa.name}</p>
                          <Badge className="bg-green-500">
                            +{formatCurrency(lisa.currentBonus)} bonus earned
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Current Balance: {formatCurrency(lisa.currentBalance)} | 
                          Potential Annual Bonus: {formatCurrency(lisa.potentialAnnualBonus)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Projected Net Worth (10Y @ 7%)</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatCurrency(projections?.summary.projectedNetWorth10Years || 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Based on current savings and growth rates
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Earliest Debt-Free Date</CardDescription>
                  <CardTitle className="text-2xl">
                    {projections?.summary.earliestDebtFreeDate 
                      ? formatDate(projections.summary.earliestDebtFreeDate)
                      : 'Debt Free!'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Based on current payment schedule
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Projected Interest</CardDescription>
                  <CardTitle className="text-2xl text-red-500">
                    {formatCurrency(projections?.summary.totalProjectedInterest || 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Interest to be paid on all debts
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Asset Form Dialog */}
        {showAssetForm && (
          <AssetForm
            onSubmit={handleCreateAsset}
            onClose={() => setShowAssetForm(false)}
          />
        )}

        {/* Edit Asset Dialog */}
        {editingAsset && (
          <AssetForm
            asset={editingAsset}
            onSubmit={(data) => handleUpdateAsset(editingAsset.id, data)}
            onClose={() => setEditingAsset(null)}
          />
        )}

        {/* Debt Form Dialog */}
        {showDebtForm && (
          <DebtForm
            onSubmit={handleCreateDebt}
            onClose={() => setShowDebtForm(false)}
          />
        )}

        {/* Edit Debt Dialog */}
        {editingDebt && (
          <DebtForm
            debt={editingDebt}
            onSubmit={(data) => handleUpdateDebt(editingDebt.id, data)}
            onClose={() => setEditingDebt(null)}
          />
        )}
      </div>
    </div>
  );
}
