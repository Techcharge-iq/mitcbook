import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Receipt } from 'lucide-react';
import { currencySymbols } from '@/types';
import { useNavigate } from 'react-router-dom';

interface VatLine {
  docNumber: string;
  date: string;
  party: string;
  taxable: number;
  vatRate: number;
  vatAmount: number;
}

export default function VatReturn() {
  const navigate = useNavigate();
  const { invoices, purchaseInvoices, clients, settings } = useApp();
  const currencySymbol = currencySymbols[settings.currency];

  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);

  const inRange = (iso: string) => {
    const d = (iso || '').split('T')[0];
    return d >= from && d <= to;
  };

  const partyName = (id: string) => clients.find((c) => c.id === id)?.name ?? '—';

  const { outputLines, inputLines, outputTotal, inputTotal, netPayable } = useMemo(() => {
    const outputLines: VatLine[] = [];
    const inputLines: VatLine[] = [];

    invoices.filter((inv) => inRange(inv.createdAt)).forEach((inv) => {
      inv.items.forEach((li) => {
        if (!li.vatApplicable || !li.vatAmount) return;
        const taxable = (li.quantity || 0) * (li.rate || 0);
        outputLines.push({
          docNumber: inv.number,
          date: inv.createdAt.split('T')[0],
          party: partyName(inv.clientId),
          taxable,
          vatRate: li.vatPercentage || 0,
          vatAmount: li.vatAmount,
        });
      });
    });

    purchaseInvoices.filter((p) => inRange(p.createdAt)).forEach((p) => {
      p.items.forEach((li) => {
        if (!li.vatApplicable || !li.vatAmount) return;
        const taxable = (li.quantity || 0) * (li.rate || 0);
        inputLines.push({
          docNumber: p.number,
          date: p.createdAt.split('T')[0],
          party: partyName(p.vendorId),
          taxable,
          vatRate: li.vatPercentage || 0,
          vatAmount: li.vatAmount,
        });
      });
    });

    const outputTotal = outputLines.reduce((s, l) => s + l.vatAmount, 0);
    const inputTotal = inputLines.reduce((s, l) => s + l.vatAmount, 0);
    return { outputLines, inputLines, outputTotal, inputTotal, netPayable: outputTotal - inputTotal };
  }, [invoices, purchaseInvoices, clients, from, to]);

  const fmt = (n: number) => `${currencySymbol}${n.toFixed(2)}`;

  const exportCsv = () => {
    const rows: string[] = ['Section,Doc,Date,Party,Taxable,VAT%,VAT Amount'];
    outputLines.forEach((l) =>
      rows.push(`Output,${l.docNumber},${l.date},"${l.party}",${l.taxable.toFixed(2)},${l.vatRate},${l.vatAmount.toFixed(2)}`)
    );
    inputLines.forEach((l) =>
      rows.push(`Input,${l.docNumber},${l.date},"${l.party}",${l.taxable.toFixed(2)},${l.vatRate},${l.vatAmount.toFixed(2)}`)
    );
    rows.push('');
    rows.push(`Summary,,,,,Output VAT,${outputTotal.toFixed(2)}`);
    rows.push(`Summary,,,,,Input VAT,${inputTotal.toFixed(2)}`);
    rows.push(`Summary,,,,,Net Payable,${netPayable.toFixed(2)}`);
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vat-return-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 pb-24">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" />
              VAT Return
            </h1>
            <p className="text-sm text-muted-foreground">
              Output VAT (sales) vs Input VAT (purchases) for filing.
            </p>
          </div>
        </div>
        <Button onClick={exportCsv} variant="outline">
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Output VAT (Sales)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{fmt(outputTotal)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Input VAT (Purchases)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(inputTotal)}</p></CardContent>
        </Card>
        <Card className={netPayable >= 0 ? 'border-destructive/40' : 'border-emerald-500/40'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Net {netPayable >= 0 ? 'Payable' : 'Refundable'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netPayable >= 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {fmt(Math.abs(netPayable))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Output VAT — Sales Invoices</CardTitle></CardHeader>
        <CardContent>
          {outputLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No taxable sales in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-2">Doc</th><th>Date</th><th>Party</th>
                    <th className="text-right">Taxable</th>
                    <th className="text-right">VAT %</th>
                    <th className="text-right">VAT</th>
                  </tr>
                </thead>
                <tbody>
                  {outputLines.map((l, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2"><Badge variant="outline">{l.docNumber}</Badge></td>
                      <td>{l.date}</td>
                      <td>{l.party}</td>
                      <td className="text-right">{fmt(l.taxable)}</td>
                      <td className="text-right">{l.vatRate}%</td>
                      <td className="text-right font-medium">{fmt(l.vatAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Input VAT — Purchase Invoices</CardTitle></CardHeader>
        <CardContent>
          {inputLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No taxable purchases in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-2">Doc</th><th>Date</th><th>Vendor</th>
                    <th className="text-right">Taxable</th>
                    <th className="text-right">VAT %</th>
                    <th className="text-right">VAT</th>
                  </tr>
                </thead>
                <tbody>
                  {inputLines.map((l, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2"><Badge variant="outline">{l.docNumber}</Badge></td>
                      <td>{l.date}</td>
                      <td>{l.party}</td>
                      <td className="text-right">{fmt(l.taxable)}</td>
                      <td className="text-right">{l.vatRate}%</td>
                      <td className="text-right font-medium">{fmt(l.vatAmount)}</td>
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