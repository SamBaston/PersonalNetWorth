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
import { Switch } from '@/components/ui/switch';
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
  Asset,
  AssetFormData,
  AssetType,
  ASSET_TYPE_LABELS,
  AssetCategory,
  ASSET_CATEGORY_LABELS,
  getCategoryFromType,
} from '@/lib/types';
import { PiggyBank, Building2, TrendingUp, Wallet } from 'lucide-react';

interface AssetFormProps {
  asset?: Asset | null;
  onSubmit: (data: AssetFormData) => void;
  onClose: () => void;
}

const ASSET_TYPES: AssetType[] = [
  'BANK_CURRENT',
  'BANK_SAVINGS',
  'ISA',
  'LISA',
  'STOCK',
  'PROPERTY',
  'OTHER',
];

const CURRENCIES = ['GBP', 'USD', 'EUR'];

export function AssetForm({ asset, onSubmit, onClose }: AssetFormProps) {
  const [formData, setFormData] = useState<AssetFormData>({
    name: asset?.name || '',
    type: asset?.type || 'BANK_SAVINGS',
    category: asset?.category || 'CASH',
    balance: asset?.balance || 0,
    currency: asset?.currency || 'GBP',
    isTaxAdvantaged: asset?.isTaxAdvantaged || false,
    governmentBonus: asset?.governmentBonus || undefined,
    ticker: asset?.ticker || '',
    shares: asset?.shares || undefined,
    purchasePrice: asset?.purchasePrice || undefined,
    annualReturnRate: asset?.annualReturnRate ?? 4,
    notes: asset?.notes || '',
  });

  const handleTypeChange = (type: AssetType) => {
    const category = getCategoryFromType(type);
    const isTaxAdvantaged = ['ISA', 'LISA'].includes(type);
    setFormData(prev => ({
      ...prev,
      type,
      category,
      isTaxAdvantaged,
      // Clear stock fields if not stock type
      ticker: type === 'STOCK' ? prev.ticker : undefined,
      shares: type === 'STOCK' ? prev.shares : undefined,
      purchasePrice: type === 'STOCK' ? prev.purchasePrice : undefined,
      // Clear LISA bonus if not LISA
      governmentBonus: type === 'LISA' ? prev.governmentBonus : undefined,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getTypeIcon = (type: AssetType) => {
    switch (type) {
      case 'BANK_CURRENT':
      case 'BANK_SAVINGS':
        return <Wallet className="h-4 w-4" />;
      case 'ISA':
      case 'LISA':
        return <PiggyBank className="h-4 w-4" />;
      case 'STOCK':
        return <TrendingUp className="h-4 w-4" />;
      case 'PROPERTY':
        return <Building2 className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon(formData.type)}
            {asset ? 'Edit Asset' : 'Add New Asset'}
          </DialogTitle>
          <DialogDescription>
            {asset
              ? 'Update the details of your asset'
              : 'Add a new asset to track your net worth'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Account Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Main Savings Account"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => handleTypeChange(value as AssetType)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              {getTypeIcon(type)}
                              {ASSET_TYPE_LABELS[type]}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) =>
                        setFormData(prev => ({ ...prev, currency: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData(prev => ({ ...prev, category: value as AssetCategory }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ASSET_CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Balance */}
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
                      setFormData(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))
                    }
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="annualReturnRate">Expected Annual Return (%)</Label>
                  <Input
                    id="annualReturnRate"
                    type="number"
                    step="0.1"
                    value={formData.annualReturnRate ?? ''}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        annualReturnRate: e.target.value ? parseFloat(e.target.value) : undefined,
                      }))
                    }
                    placeholder="e.g., 4, 7, 10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock-specific fields */}
          {formData.type === 'STOCK' && (
            <Card>
              <CardContent className="pt-4 space-y-4">
                <h4 className="text-sm font-medium">Stock Details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticker">Ticker Symbol</Label>
                    <Input
                      id="ticker"
                      value={formData.ticker || ''}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))
                      }
                      placeholder="AAPL"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shares">Number of Shares</Label>
                    <Input
                      id="shares"
                      type="number"
                      step="0.001"
                      value={formData.shares ?? ''}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          shares: e.target.value ? parseFloat(e.target.value) : undefined,
                        }))
                      }
                      placeholder="100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchasePrice">Avg Purchase Price</Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      value={formData.purchasePrice ?? ''}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          purchasePrice: e.target.value ? parseFloat(e.target.value) : undefined,
                        }))
                      }
                      placeholder="150.00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* LISA-specific fields */}
          {formData.type === 'LISA' && (
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">LISA Government Bonus</h4>
                  <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                    25% Bonus
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  The government adds a 25% bonus to your LISA contributions (up to £4,000/year).
                  Enter the total government bonus you&apos;ve received.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="governmentBonus">Government Bonus Received</Label>
                  <Input
                    id="governmentBonus"
                    type="number"
                    step="0.01"
                    value={formData.governmentBonus ?? ''}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        governmentBonus: e.target.value ? parseFloat(e.target.value) : undefined,
                      }))
                    }
                    placeholder="e.g., 1000"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tax Advantaged */}
          {['ISA', 'LISA'].includes(formData.type) && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div className="space-y-0.5">
                <Label htmlFor="isTaxAdvantaged">Tax-Advantaged Account</Label>
                <p className="text-xs text-muted-foreground">
                  Interest and gains are tax-free
                </p>
              </div>
              <Switch
                id="isTaxAdvantaged"
                checked={formData.isTaxAdvantaged}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, isTaxAdvantaged: checked }))
                }
              />
            </div>
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
              placeholder="Additional notes about this asset..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {asset ? 'Update Asset' : 'Add Asset'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
