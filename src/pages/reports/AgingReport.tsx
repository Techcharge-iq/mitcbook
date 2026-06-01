import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { currencySymbols } from '@/types';

export default function AgingReport() {
  const { invoices, purchaseInvoices, payments, getClient, settings } = useApp();
  const currencySymbol = currencySymbols[settings.currency];
  const [mode, setMode] = useState<'receivable' | 'payable'>('receivable');

  const today = new Date();

  const aging = useMemo(() => {
    const items = mode === 'receivable'
      ? invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'draft')
      : purchaseInvoices.filter((p) => p.status !== 'paid');

    const buckets = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    const details: { name: string; number: string; amount: number; days: number; bucket: string }[] = [];

    items.forEach((item) => {
      const dueDate = new Date(item.dueDate);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const paid = payments.filter((p) => p.invoiceId === item.id).reduce((s, p) => s + p.amount, 0);
      const balance = item.netTotal - paid;
      if (balance <= 0) return;

      const clientId = 'clientId' in item ? item.clientId : (item as any).vendorId;
      const client = getClient(clientId);
      let bucket: string;
      if (daysOverdue <= 0) { bucket = 'current'; buckets.current += balance; }
      else if (daysOverdue <= 30) { bucket = '1-30'; buckets['1-30'] += balance; }
      else if (daysOverdue <= 60) { bucket = '31-60'; buckets['31-60'] += balance; }
      else if (daysOverdue <= 90) { bucket = '61-90'; buckets['61-90'] += balance; }
      else { bucket = '90+'; buckets['90+'] += balance; }

      details.push({ name: client?.name || 'Unknown', number: item.number, amount: balance, days: Math.max(0, daysOverdue), bucket });
    });

    return { buckets, details, total: Object.values(buckets).reduce((s, v) => s + v, 0) };
  }, [mode, invoices, purchaseInvoices, payments, getClient]);

  const bucketLabels = [
    { key: 'current', label: 'Current', color: 'text-success' },
    { key: '1-30', label: '1-30 days', color: 'text-primary' },
    { key: '31-60', label: '31-60 days', color: 'text-warning' },
    { key: '61-90', label: '61-90 days', color: 'text-destructive' },
    { key: '90+', label: '90+ days', color: 'text-destructive' },
  ];

  return (
    <div className="space-y-3 pb-20 lg:pb-4 max-w-2xl mx-auto">
      <div><h1 className="text-xl font-bold tracking-tight">Aging Report</h1><p className="text-xs text-muted-foreground">Outstanding by age</p></div>
      <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
        <TabsList className="w-full h-9">
          <TabsTrigger value="receivable" className="flex-1 text-xs">Accounts Receivable</TabsTrigger>
          <TabsTrigger value="payable" className="flex-1 text-xs">Accounts Payable</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="grid grid-cols-5 gap-1.5">
        {bucketLabels.map((b) => (
          <Card key={b.key}><CardContent className="p-2 text-center">
            <p className="text-[9px] text-muted-foreground uppercase">{b.label}</p>
            <p className={`text-xs font-bold ${b.color}`}>{currencySymbol}{(aging.buckets as any)[b.key].toLocaleString('en-IN')}</p>
          </CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Outstanding</p><p className="text-lg font-bold">{currencySymbol}{aging.total.toLocaleString('en-IN')}</p></CardContent></Card>
      <Card><CardHeader className="py-2.5 px-3"><CardTitle className="text-sm">Details</CardTitle></CardHeader><CardContent className="px-3 pb-3">
        {aging.details.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No outstanding items</p> :
          aging.details.sort((a, b) => b.days - a.days).map((d, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
              <div><p className="text-xs font-medium">{d.name}</p><p className="text-[10px] text-muted-foreground">{d.number} • {d.days} days</p></div>
              <p className="text-xs font-semibold">{currencySymbol}{d.amount.toLocaleString('en-IN')}</p>
            </div>
          ))}
      </CardContent></Card>
    </div>
  );
}
