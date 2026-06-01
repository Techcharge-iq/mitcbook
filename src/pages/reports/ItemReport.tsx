import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Package, Download, ArrowLeft } from 'lucide-react';
import { currencySymbols } from '@/types';
import { useNavigate } from 'react-router-dom';

interface ItemRow {
  itemId: string;
  name: string;
  unit?: string;
  opening: number;
  purchasedQty: number;
  soldQty: number;
  closing: number;
  salesValue: number;
  purchaseValue: number;
  vatCollected: number;
  vatPaid: number;
}

interface DrillRow {
  date: string;
  doc: string;
  type: 'sales' | 'purchase' | 'quotation';
  qty: number;
  rate: number;
  total: number;
  vat: number;
}

export default function ItemReport() {
  const navigate = useNavigate();
  const { items, invoices, purchaseInvoices, quotations, settings } = useApp();
  const currencySymbol = currencySymbols[settings.currency];

  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [drillItem, setDrillItem] = useState<ItemRow | null>(null);

  const inRange = (iso: string) => {
    const d = iso.split('T')[0];
    return d >= from && d <= to;
  };

  const rows: ItemRow[] = useMemo(() => {
    return items.map((item) => {
      let purchasedQty = 0, soldQty = 0;
      let salesValue = 0, purchaseValue = 0;
      let vatCollected = 0, vatPaid = 0;

      invoices.forEach((inv) => {
        if (!inRange(inv.createdAt)) return;
        inv.items.forEach((li) => {
          if (li.itemId === item.id) {
            soldQty += li.quantity;
            salesValue += li.total;
            vatCollected += li.vatAmount ?? 0;
          }
        });
      });
      purchaseInvoices.forEach((pi) => {
        if (!inRange(pi.createdAt)) return;
        pi.items.forEach((li) => {
          if (li.itemId === item.id) {
            purchasedQty += li.quantity;
            purchaseValue += li.total;
            vatPaid += li.vatAmount ?? 0;
          }
        });
      });

      return {
        itemId: item.id,
        name: item.name,
        unit: item.unit,
        opening: item.stock - purchasedQty + soldQty,
        purchasedQty,
        soldQty,
        closing: item.stock,
        salesValue,
        purchaseValue,
        vatCollected,
        vatPaid,
      };
    });
  }, [items, invoices, purchaseInvoices, from, to]);

  const drillRows: DrillRow[] = useMemo(() => {
    if (!drillItem) return [];
    const out: DrillRow[] = [];
    quotations.forEach((q) => {
      q.items.forEach((li) => {
        if (li.itemId === drillItem.itemId) {
          out.push({ date: q.createdAt.split('T')[0], doc: q.number, type: 'quotation', qty: li.quantity, rate: li.rate, total: li.total, vat: li.vatAmount ?? 0 });
        }
      });
    });
    invoices.forEach((inv) => {
      if (!inRange(inv.createdAt)) return;
      inv.items.forEach((li) => {
        if (li.itemId === drillItem.itemId) {
          out.push({ date: inv.createdAt.split('T')[0], doc: inv.number, type: 'sales', qty: li.quantity, rate: li.rate, total: li.total, vat: li.vatAmount ?? 0 });
        }
      });
    });
    purchaseInvoices.forEach((pi) => {
      if (!inRange(pi.createdAt)) return;
      pi.items.forEach((li) => {
        if (li.itemId === drillItem.itemId) {
          out.push({ date: pi.createdAt.split('T')[0], doc: pi.number, type: 'purchase', qty: li.quantity, rate: li.rate, total: li.total, vat: li.vatAmount ?? 0 });
        }
      });
    });
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [drillItem, invoices, purchaseInvoices, quotations, from, to]);

  const exportCSV = () => {
    const header = ['Item', 'Unit', 'Opening', 'Purchased', 'Sold', 'Closing', 'Sales Value', 'Purchase Value', 'VAT Collected', 'VAT Paid'];
    const lines = [header.join(',')];
    rows.forEach((r) => {
      lines.push([
        `"${r.name}"`, r.unit ?? '', r.opening, r.purchasedQty, r.soldQty, r.closing,
        r.salesValue.toFixed(2), r.purchaseValue.toFixed(2), r.vatCollected.toFixed(2), r.vatPaid.toFixed(2),
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `item-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 pb-20 lg:pb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Item Report
            </h1>
            <p className="text-xs text-muted-foreground">Stock movement & VAT per item</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1.5" /> CSV
        </Button>
      </div>

      <Card>
        <CardContent className="px-3 py-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-2.5 px-3"><CardTitle className="text-sm">Items ({rows.length})</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3">
          {rows.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No items found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2">Item</th>
                    <th className="text-right py-2">Opening</th>
                    <th className="text-right py-2">In</th>
                    <th className="text-right py-2">Out</th>
                    <th className="text-right py-2">Closing</th>
                    <th className="text-right py-2 hidden md:table-cell">Sales</th>
                    <th className="text-right py-2 hidden md:table-cell">Purchase</th>
                    <th className="text-right py-2 hidden lg:table-cell">VAT Coll.</th>
                    <th className="text-right py-2 hidden lg:table-cell">VAT Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.itemId} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setDrillItem(r)}>
                      <td className="py-2 font-medium">{r.name}</td>
                      <td className="py-2 text-right">{r.opening}</td>
                      <td className="py-2 text-right text-success">+{r.purchasedQty}</td>
                      <td className="py-2 text-right text-destructive">-{r.soldQty}</td>
                      <td className="py-2 text-right font-semibold">{r.closing}</td>
                      <td className="py-2 text-right hidden md:table-cell">{currencySymbol}{r.salesValue.toLocaleString('en-IN')}</td>
                      <td className="py-2 text-right hidden md:table-cell">{currencySymbol}{r.purchaseValue.toLocaleString('en-IN')}</td>
                      <td className="py-2 text-right hidden lg:table-cell">{currencySymbol}{r.vatCollected.toLocaleString('en-IN')}</td>
                      <td className="py-2 text-right hidden lg:table-cell">{currencySymbol}{r.vatPaid.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!drillItem} onOpenChange={(o) => !o && setDrillItem(null)}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drillItem?.name} — Transactions</DialogTitle>
          </DialogHeader>
          {drillRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No transactions for this item in the date range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Document</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-right py-2">Qty</th>
                    <th className="text-right py-2">Rate</th>
                    <th className="text-right py-2">Total</th>
                    <th className="text-right py-2">VAT</th>
                  </tr>
                </thead>
                <tbody>
                  {drillRows.map((d, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2">{d.date}</td>
                      <td className="py-2 font-medium">{d.doc}</td>
                      <td className="py-2">
                        <Badge variant="secondary" className="text-[10px]">{d.type}</Badge>
                      </td>
                      <td className="py-2 text-right">{d.qty}</td>
                      <td className="py-2 text-right">{currencySymbol}{d.rate.toLocaleString('en-IN')}</td>
                      <td className="py-2 text-right">{currencySymbol}{d.total.toLocaleString('en-IN')}</td>
                      <td className="py-2 text-right">{currencySymbol}{d.vat.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}