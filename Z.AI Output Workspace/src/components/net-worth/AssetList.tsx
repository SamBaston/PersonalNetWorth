'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Progress } from '@/components/ui/progress';
import {
  Asset,
  ASSET_TYPE_LABELS,
  ASSET_CATEGORY_LABELS,
  formatCurrency,
  AssetType,
} from '@/lib/types';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Wallet,
  PiggyBank,
  TrendingUp,
  Building2,
  Plus,
} from 'lucide-react';

interface AssetListProps {
  assets: Asset[];
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
}

export function AssetList({ assets, onEdit, onDelete }: AssetListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const getTypeColor = (type: AssetType): string => {
    switch (type) {
      case 'BANK_CURRENT':
        return 'bg-blue-500';
      case 'BANK_SAVINGS':
        return 'bg-cyan-500';
      case 'ISA':
        return 'bg-green-500';
      case 'LISA':
        return 'bg-emerald-500';
      case 'STOCK':
        return 'bg-purple-500';
      case 'PROPERTY':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const totalBalance = assets.reduce((sum, a) => sum + a.balance, 0);

  // Group assets by type
  const assetsByType = assets.reduce((acc, asset) => {
    if (!acc[asset.type]) acc[asset.type] = [];
    acc[asset.type].push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

  if (assets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <PiggyBank className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium">No assets yet</h3>
              <p className="text-sm text-muted-foreground">
                Start tracking your net worth by adding your first asset
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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Asset Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Assets</p>
              <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Accounts</p>
              <p className="text-2xl font-bold">{assets.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Investment Accounts</p>
              <p className="text-2xl font-bold">
                {assets.filter(a => a.category === 'INVESTMENT').length}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tax-Advantaged</p>
              <p className="text-2xl font-bold">
                {assets.filter(a => a.isTaxAdvantaged).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped View for Mobile/Desktop */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(assetsByType).map(([type, typeAssets]) => (
          <Card key={type}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${getTypeColor(type as AssetType)} text-white`}>
                    {getTypeIcon(type as AssetType)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{ASSET_TYPE_LABELS[type as AssetType]}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {typeAssets.length} account{typeAssets.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {typeAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => onEdit(asset)}
                >
                  <div>
                    <p className="font-medium">{asset.name}</p>
                    <div className="flex items-center gap-2">
                      {asset.ticker && (
                        <Badge variant="outline" className="text-xs">
                          {asset.ticker}
                        </Badge>
                      )}
                      {asset.isTaxAdvantaged && (
                        <Badge variant="secondary" className="text-xs bg-green-500 text-white">
                          Tax-Free
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(asset.balance, asset.currency)}</p>
                    {asset.annualReturnRate && asset.annualReturnRate > 0 && (
                      <p className="text-xs text-muted-foreground">
                        @ {asset.annualReturnRate}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    {formatCurrency(typeAssets.reduce((sum, a) => sum + a.balance, 0))}
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
          <CardTitle>All Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Growth Rate</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(asset.type)}
                      <div>
                        <p className="font-medium">{asset.name}</p>
                        {asset.ticker && (
                          <p className="text-xs text-muted-foreground">{asset.ticker}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ASSET_TYPE_LABELS[asset.type]}</Badge>
                  </TableCell>
                  <TableCell>{ASSET_CATEGORY_LABELS[asset.category]}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(asset.balance, asset.currency)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {asset.annualReturnRate ? `${asset.annualReturnRate}%` : '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(asset)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setDeleteConfirm(asset.id)}
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
            <AlertDialogTitle>Delete Asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this asset and all its history. This action cannot be undone.
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
