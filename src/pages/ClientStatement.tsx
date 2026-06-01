import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { currencySymbols } from '@/types';
import { ArrowLeft, Filter } from 'lucide-react';

export default function ClientStatement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getClient, invoices, purchaseInvoices, payments, settings } = useApp();

  const client = id ? getClient(id) : undefined;
  const currencySymbol = currencySymbols[settings.currency];
  const isVendor = client?.type === 'vendor' || client?.type === 'both';
  const isCustomer = client?.type === 'customer' || client?.type === 'both' || !client?.type;

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Build statement entries with Dr/Cr format
  const entries = useMemo(() => {
    if (!id) return [];
    let all: { date: string; particulars: string; ref: string; debit: number; credit: number; id: string; type: string }[] = [];

    // Customer: Sales Invoices = Debit
    if (isCustomer) {
      invoices.filter((i) => i.clientId === id).forEach((i) => {
        all.push({ date: i.createdAt, particulars: 'Sales Invoice', ref: i.number, debit: i.netTotal, credit: 0, id: i.id, type: 'invoice' });
      });

      // Receipts against sales invoices = Credit
      payments.filter((p) => p.invoiceType === 'sales').forEach((p) => {
        const inv = invoices.find((i) => i.id === p.invoiceId);
        if (inv?.clientId === id) {
          all.push({ date: p.date, particulars: `Receipt (${p.method})`, ref: p.reference || `PAY-${inv.number}`, debit: 0, credit: p.amount, id: p.id, type: 'receipt' });
        }
      });
    }

    // Vendor: Purchase Invoices = Credit (we owe them)
    if (isVendor) {
      purchaseInvoices.filter((p) => p.vendorId === id).forEach((pi) => {
        all.push({ date: pi.createdAt, particulars: 'Purchase Invoice', ref: pi.number, debit: 0, credit: pi.netTotal, id: pi.id, type: 'purchase' });
      });

      // Payments to vendor = Debit (we paid them)
      payments.filter((p) => p.invoiceType === 'purchase').forEach((p) => {
        const pi = purchaseInvoices.find((i) => i.id === p.invoiceId);
        if (pi?.vendorId === id) {
          all.push({ date: p.date, particulars: `Payment (${p.method})`, ref: p.reference || `PAY-${pi.number}`, debit: p.amount, credit: 0, id: p.id, type: 'payment' });
        }
      });
    }

    // Date filters
    if (dateFrom) all = all.filter((e) => e.date >= dateFrom);
    if (dateTo) all = all.filter((e) => e.date <= dateTo + 'T23:59:59');

    return all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [id, invoices, purchaseInvoices, payments, dateFrom, dateTo, isCustomer, isVendor]);

  // Calculate running balances
  const { totalDebit, totalCredit, entriesWithBalance } = useMemo(() => {
    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    const entriesWithBalance = entries.map((e) => {
      totalDebit += e.debit;
      totalCredit += e.credit;
      runningBalance += e.debit - e.credit;
      return { ...e, balance: runningBalance };
    });
    return { totalDebit, totalCredit, entriesWithBalance };
  }, [entries]);

  const currentBalance = totalDebit - totalCredit;

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Client not found</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/clients')}>Back to Parties</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-20 lg:pb-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')} className="h-8 w-8 shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight truncate">{client.name}</h1>
          <p className="text-xs text-muted-foreground truncate">
            Statement • {client.type === 'vendor' ? 'Vendor' : client.type === 'both' ? 'Customer & Vendor' : 'Customer'}
          </p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto h-8 shrink-0" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-3.5 w-3.5 mr-1" />Filter
        </Button>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" /></div>
              <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" /></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Debit</p>
            <p className="text-sm font-bold mt-0.5">{currencySymbol}{totalDebit.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Credit</p>
            <p className="text-sm font-bold text-success mt-0.5">{currencySymbol}{totalCredit.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Balance</p>
            <p className={`text-sm font-bold mt-0.5 ${currentBalance > 0 ? 'text-destructive' : currentBalance < 0 ? 'text-success' : ''}`}>
              {currencySymbol}{Math.abs(currentBalance).toLocaleString('en-IN')} {currentBalance > 0 ? 'Dr' : currentBalance < 0 ? 'Cr' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Statement Table */}
      <Card>
        <CardHeader className="py-2.5 px-3"><CardTitle className="text-sm">Statement</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3">
          {entriesWithBalance.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No transactions found</p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Particulars</th>
                      <th className="text-left py-2">Ref</th>
                      <th className="text-right py-2">Debit (Dr)</th>
                      <th className="text-right py-2">Credit (Cr)</th>
                      <th className="text-right py-2">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entriesWithBalance.map((entry, i) => (
                      <tr key={`${entry.type}-${entry.id}-${i}`} className="border-b last:border-0">
                        <td className="py-2 text-xs">{new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                        <td className="py-2 text-xs">{entry.particulars}</td>
                        <td className="py-2 text-xs font-mono">{entry.ref}</td>
                        <td className="py-2 text-xs text-right">{entry.debit > 0 ? `${currencySymbol}${entry.debit.toLocaleString('en-IN')}` : ''}</td>
                        <td className="py-2 text-xs text-right text-success">{entry.credit > 0 ? `${currencySymbol}${entry.credit.toLocaleString('en-IN')}` : ''}</td>
                        <td className="py-2 text-xs text-right font-medium">
                          {currencySymbol}{Math.abs(entry.balance).toLocaleString('en-IN')} {entry.balance > 0 ? 'Dr' : entry.balance < 0 ? 'Cr' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td colSpan={3} className="py-2 text-xs">Total</td>
                      <td className="py-2 text-xs text-right">{currencySymbol}{totalDebit.toLocaleString('en-IN')}</td>
                      <td className="py-2 text-xs text-right text-success">{currencySymbol}{totalCredit.toLocaleString('en-IN')}</td>
                      <td className="py-2 text-xs text-right">
                        {currencySymbol}{Math.abs(currentBalance).toLocaleString('en-IN')} {currentBalance > 0 ? 'Dr' : currentBalance < 0 ? 'Cr' : ''}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-1.5">
                {entriesWithBalance.map((entry, i) => (
                  <div key={`${entry.type}-${entry.id}-${i}`} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">{entry.particulars}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(entry.date).toLocaleDateString()} • {entry.ref}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {entry.debit > 0 && <p className="text-xs font-semibold">Dr {currencySymbol}{entry.debit.toLocaleString('en-IN')}</p>}
                        {entry.credit > 0 && <p className="text-xs font-semibold text-success">Cr {currencySymbol}{entry.credit.toLocaleString('en-IN')}</p>}
                        <p className="text-[10px] text-muted-foreground">
                          Bal: {currencySymbol}{Math.abs(entry.balance).toLocaleString('en-IN')} {entry.balance > 0 ? 'Dr' : 'Cr'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
