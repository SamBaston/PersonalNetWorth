'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Debt,
  DebtFormData,
  DebtType,
  DEBT_TYPE_LABELS,
  StudentLoanPlan,
  STUDENT_LOAN_PLAN_LABELS,
} from '@/lib/types';
import { CreditCard, GraduationCap, Home, Landmark } from 'lucide-react';

interface DebtFormProps {
  debt?: Debt | null;
  onSubmit: (data: DebtFormData) => void;
  onClose: () => void;
}

const DEBT_TYPES: DebtType[] = [
  'STUDENT_LOAN',
  'CREDIT_CARD',
  'PERSONAL_LOAN',
  'MORTGAGE',
  'OTHER',
];

const STUDENT_LOAN_PLANS: StudentLoanPlan[] = [
  'PLAN_1',
  'PLAN_2',
  'PLAN_4',
  'PLAN_5',
  'POSTGRAD',
];

export function DebtForm({ debt, onSubmit, onClose }: DebtFormProps) {
  const [formData, setFormData] = useState<DebtFormData>({
    name: debt?.name || '',
    type: debt?.type || 'CREDIT_CARD',
    balance: debt?.balance || 0,
    originalAmount: debt?.originalAmount || undefined,
    interestRate: debt?.interestRate || 0,
    minimumPayment: debt?.minimumPayment || undefined,
    monthlyPayment: debt?.monthlyPayment || undefined,
    studentLoanPlan: debt?.studentLoanPlan || undefined,
    propertyValue: debt?.propertyValue || undefined,
    startDate: debt?.startDate ? debt.startDate.split('T')[0] : undefined,
    targetEndDate: debt?.targetEndDate ? debt.targetEndDate.split('T')[0] : undefined,
    notes: debt?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

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

  // Get recommended interest rate based on student loan plan
  const getRecommendedInterestRate = (plan: StudentLoanPlan | undefined): number => {
    switch (plan) {
      case 'PLAN_1':
        return 6.25;
      case 'PLAN_2':
        return 7.3;
      case 'PLAN_4':
        return 6.25;
      case 'PLAN_5':
        return 6.25;
      case 'POSTGRAD':
        return 7.3;
      default:
        return 0;
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon(formData.type)}
            {debt ? 'Edit Debt' : 'Add New Debt'}
          </DialogTitle>
          <DialogDescription>
            {debt
              ? 'Update the details of your debt'
              : 'Add a new debt to track your liabilities'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Debt Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Student Finance England"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => {
                      setFormData(prev => ({
                        ...prev,
                        type: value as DebtType,
                        // Clear type-specific fields when changing type
                        studentLoanPlan: value === 'STUDENT_LOAN' ? prev.studentLoanPlan : undefined,
                        propertyValue: value === 'MORTGAGE' ? prev.propertyValue : undefined,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEBT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(type)}
                            {DEBT_TYPE_LABELS[type]}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Balance and Interest */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="balance">Current Balance *</Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        balance: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="originalAmount">Original Amount</Label>
                  <Input
                    id="originalAmount"
                    type="number"
                    step="0.01"
                    value={formData.originalAmount ?? ''}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        originalAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                      }))
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interestRate">Annual Interest Rate (%) *</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.01"
                  value={formData.interestRate}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      interestRate: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="e.g., 5.5"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <h4 className="text-sm font-medium">Payment Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minimumPayment">Minimum Payment</Label>
                  <Input
                    id="minimumPayment"
                    type="number"
                    step="0.01"
                    value={formData.minimumPayment ?? ''}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        minimumPayment: e.target.value ? parseFloat(e.target.value) : undefined,
                      }))
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyPayment">Actual Monthly Payment</Label>
                  <Input
                    id="monthlyPayment"
                    type="number"
                    step="0.01"
                    value={formData.monthlyPayment ?? ''}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        monthlyPayment: e.target.value ? parseFloat(e.target.value) : undefined,
                      }))
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate || ''}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, startDate: e.target.value || undefined }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetEndDate">Target Payoff Date</Label>
                  <Input
                    id="targetEndDate"
                    type="date"
                    value={formData.targetEndDate || ''}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, targetEndDate: e.target.value || undefined }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student Loan-specific fields */}
          {formData.type === 'STUDENT_LOAN' && (
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-blue-500" />
                  <h4 className="text-sm font-medium">Student Loan Details</h4>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="studentLoanPlan">Repayment Plan</Label>
                  <Select
                    value={formData.studentLoanPlan || ''}
                    onValueChange={(value) => {
                      const plan = value as StudentLoanPlan;
                      setFormData(prev => ({
                        ...prev,
                        studentLoanPlan: plan,
                        // Auto-fill recommended interest rate
                        interestRate: getRecommendedInterestRate(plan),
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {STUDENT_LOAN_PLANS.map((plan) => (
                        <SelectItem key={plan} value={plan}>
                          <div className="flex flex-col">
                            <span>{STUDENT_LOAN_PLAN_LABELS[plan]}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> Student loans are written off after 25-40 years depending on 
                  your plan. Interest rates are updated annually based on RPI.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Mortgage-specific fields */}
          {formData.type === 'MORTGAGE' && (
            <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-orange-500" />
                  <h4 className="text-sm font-medium">Mortgage Details</h4>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propertyValue">Current Property Value</Label>
                  <Input
                    id="propertyValue"
                    type="number"
                    step="0.01"
                    value={formData.propertyValue ?? ''}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        propertyValue: e.target.value ? parseFloat(e.target.value) : undefined,
                      }))
                    }
                    placeholder="Enter current property value"
                  />
                </div>

                {formData.propertyValue && formData.balance && (
                  <div className="p-3 rounded bg-muted">
                    <p className="text-xs text-muted-foreground">Estimated Equity</p>
                    <p className="text-lg font-bold text-green-600">
                      £{(formData.propertyValue - formData.balance).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      LTV: {((formData.balance / formData.propertyValue) * 100).toFixed(1)}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Additional notes about this debt..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant={formData.type === 'MORTGAGE' ? 'default' : 'destructive'}>
              {debt ? 'Update Debt' : 'Add Debt'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
