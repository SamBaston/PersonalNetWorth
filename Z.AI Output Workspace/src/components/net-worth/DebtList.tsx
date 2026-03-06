'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Debt,
  DEBT_TYPE_LABELS,
  STUDENT_LOAN_PLAN_LABELS,
  formatCurrency,
  formatPercentage,
  DebtType,
} from '@/lib/types';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  CreditCard,
  GraduationCap,
  Home,
  Landmark,
  TrendingDown,
} from 'lucide-react';

interface DebtListProps {
  debts: Debt[];
  onEdit: (debt: Debt) => void;
  onDelete: (id: string) => void;
}

export function DebtList({ debts, onEdit, onDelete }: DebtListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const getTypeIcon = (type: DebtType) => {
    switch (type) {
      case 'STUDENT_LOAN':
        return <GraduationCap className="h-4 w-4" />;
      case 'CREDIT_CARD':
        return <CreditCard className="h-4 w-4" />;
      case 'MORTGAGE':
        return <Home className="h-4 w-4" />;
      case 'PERSONAL_LOAN':
        return <Landmark className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: DebtType): string => {
    switch (type) {
      case 'STUDENT_LOAN':
        return 'bg-blue-500';
      case 'CREDIT_CARD':
        return 'bg-red-500';
      case 'MORTGAGE':
        return 'bg-orange-500';
      case 'PERSONAL_LOAN':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const totalBalance = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalMonthlyPayments = debts.reduce(
    (sum, d) => sum + (d.monthlyPayment || d.minimumPayment || 0),
    0
  );

  // Group debts by type
  const debtsByType = debts.reduce((acc, debt) => {
    if (!acc[debt.type]) acc[debt.type] = [];
    acc[debt.type].push(debt);
    return acc;
  }, {} as Record<string, Debt[]>);

  // Calculate payoff progress for each debt
  const getPayoffProgress = (debt: Debt): number => {
    if (!debt.originalAmount) return 100;
    const paid = debt.originalAmount - debt.balance;
    return Math.max(0, Math.min(100, (paid / debt.originalAmount) * 100));
  };

  if (debts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <TrendingDown className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-green-600">No debts!</h3>
              <p className="text-sm text-muted-foreground">
                You&apos;re debt-free. Great job!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-red-500" />
            Debt Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Debt</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Liabilities</p>
              <p className="text-2xl font-bold">{debts.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Monthly Payments</p>
              <p className="text-2xl font-bold">{formatCurrency(totalMonthlyPayments)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Interest</p>
              <p className="text-2xl font-bold">
                {formatPercentage(
                  debts.reduce((sum, d) => sum + d.interestRate, 0) / debts.length
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped View */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(debtsByType).map(([type, typeDebts]) => (
          <Card key={type}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${getTypeColor(type as DebtType)} text-white`}>
                    {getTypeIcon(type as DebtType)}
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {DEBT_TYPE_LABELS[type as DebtType]}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {typeDebts.length} account{typeDebts.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {typeDebts.map((debt) => (
                <div
                  key={debt.id}
                  className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => onEdit(debt)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{debt.name}</p>
                      <div className="flex items-center gap-2">
                        {debt.studentLoanPlan && (
                          <Badge variant="outline" className="text-xs">
                            {STUDENT_LOAN_PLAN_LABELS[debt.studentLoanPlan]}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600">
                        {formatCurrency(debt.balance)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @ {formatPercentage(debt.interestRate)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress bar if original amount is known */}
                  {debt.originalAmount && (
                    <div className="space-y-1">
                      <Progress
                        value={getPayoffProgress(debt)}
                        className="h-1.5"
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {formatPercentage(getPayoffProgress(debt))} paid off
                      </p>
                    </div>
                  )}

                  {/* Monthly payment info */}
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>
                      Monthly: {formatCurrency(debt.monthlyPayment || debt.minimumPayment || 0)}
                    </span>
                    {debt.propertyValue && debt.type === 'MORTGAGE' && (
                      <span>
                        Equity: {formatCurrency(debt.propertyValue - debt.balance)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(typeDebts.reduce((sum, d) => sum + d.balance, 0))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Table View */}
      <Card>
        <CardHeader>
          <CardTitle>All Debts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Interest</TableHead>
                <TableHead className="text-right">Monthly</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debts.map((debt) => (
                <TableRow key={debt.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(debt.type)}
                      <div>
                        <p className="font-medium">{debt.name}</p>
                        {debt.studentLoanPlan && (
                          <p className="text-xs text-muted-foreground">
                            {STUDENT_LOAN_PLAN_LABELS[debt.studentLoanPlan]}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-red-200">
                      {DEBT_TYPE_LABELS[debt.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium text-red-600">
                    {formatCurrency(debt.balance)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatPercentage(debt.interestRate)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(debt.monthlyPayment || debt.minimumPayment || 0)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(debt)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setDeleteConfirm(debt.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Debt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this debt and all its history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteConfirm) {
                  onDelete(deleteConfirm);
                  setDeleteConfirm(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
