import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { currencySymbols } from '@/types';
import { useNavigate } from 'react-router-dom';

export default function SalesBySalesman() {
  const navigate = useNavigate();
  const { invoices, quotations, salesmen, settings } = useApp();
  const currencySymbol = currencySymbols[settings.currency];

  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);

  const inRange = (iso: string) => {
    const d = iso.split('T')[0];
    return d >= from && d <= to;
  };

  const totals = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach((inv) => {
      if (!inRange(inv.createdAt)) return;
      const sid = (inv as any).salesmanId || 'unassigned';
      map[sid] = (map[sid] || 0) + (inv.netTotal || 0);
    });
    quotations.forEach((q) => {
      if (!inRange(q.createdAt)) return;
      const sid = (q as any).salesmanId || 'unassigned';
      // include quotations sales if desired; here only invoices count as sales
    });
    const rows = Object.keys(map).map((sid) => ({
      salesmanId: sid,
      name: sid === 'unassigned' ? 'Unassigned' : (salesmen.find((s) => s.id === sid)?.name || 'Unknown'),
      total: map[sid],
    }));
    return rows.sort((a, b) => b.total - a.total);
  }, [invoices, quotations, salesmen, from, to]);

  return (
    <div className="space-y-3 pb-20 lg:pb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Sales by Salesman</h1>
            <p className="text-xs text-muted-foreground">Total sales grouped by salesman</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader />
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
        <CardHeader className="py-2.5 px-3"><CardTitle className="text-sm">Salesmen ({totals.length})</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3">
          {totals.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No sales in the selected period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2">Salesman</th>
                    <th className="text-right py-2">Total Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.map((r) => (
                    <tr key={r.salesmanId} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 font-medium">{r.name}</td>
                      <td className="py-2 text-right font-semibold">{currencySymbol}{r.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
