import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { currencySymbols } from '@/types';
import { getLedgerBreakdown } from '@/lib/accounting';

export default function ProfitAndLoss() {
  const { journalEntries, accounts, settings } = useApp();
  const currencySymbol = currencySymbols[settings.currency];
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { income, expenses, netProfit } = useMemo(() => {
    const filtered = journalEntries.filter((e) => {
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo + 'T23:59:59') return false;
      return true;
    });

    const incomeAccounts = accounts.filter((a) => a.type === 'income');
    const expenseAccounts = accounts.filter((a) => a.type === 'expense');

    let totalIncome = 0;
    let totalExpenses = 0;
    const incomeBreakdown: { name: string; amount: number }[] = [];
    const expenseBreakdown: { name: string; amount: number }[] = [];

    incomeAccounts.forEach((acc) => {
      let amount = 0;
      getLedgerBreakdown(acc.id, filtered).forEach((line) => { amount += line.credit - line.debit; });
      if (amount !== 0) { incomeBreakdown.push({ name: acc.name, amount }); totalIncome += amount; }
    });

    expenseAccounts.forEach((acc) => {
      let amount = 0;
      getLedgerBreakdown(acc.id, filtered).forEach((line) => { amount += line.debit - line.credit; });
      if (amount !== 0) { expenseBreakdown.push({ name: acc.name, amount }); totalExpenses += amount; }
    });

    return { income: { total: totalIncome, items: incomeBreakdown }, expenses: { total: totalExpenses, items: expenseBreakdown }, netProfit: totalIncome - totalExpenses };
  }, [journalEntries, accounts, dateFrom, dateTo]);

  return (
    <div className="space-y-3 pb-20 lg:pb-4 max-w-2xl mx-auto">
      <div><h1 className="text-xl font-bold tracking-tight">Profit & Loss</h1><p className="text-xs text-muted-foreground">Income vs Expenses</p></div>
      <Card><CardContent className="p-3"><div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" /></div>
        <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" /></div>
      </div></CardContent></Card>
      <Card><CardHeader className="py-2.5 px-3"><CardTitle className="text-sm text-success">Income</CardTitle></CardHeader><CardContent className="px-3 pb-3">
        {income.items.length === 0 ? <p className="text-xs text-muted-foreground">No income recorded</p> : income.items.map((i) => (
          <div key={i.name} className="flex justify-between py-1.5 text-sm"><span>{i.name}</span><span className="font-medium">{currencySymbol}{i.amount.toLocaleString('en-IN')}</span></div>
        ))}
        <div className="flex justify-between py-1.5 text-sm font-bold border-t mt-1"><span>Total Income</span><span className="text-success">{currencySymbol}{income.total.toLocaleString('en-IN')}</span></div>
      </CardContent></Card>
      <Card><CardHeader className="py-2.5 px-3"><CardTitle className="text-sm text-destructive">Expenses</CardTitle></CardHeader><CardContent className="px-3 pb-3">
        {expenses.items.length === 0 ? <p className="text-xs text-muted-foreground">No expenses recorded</p> : expenses.items.map((i) => (
          <div key={i.name} className="flex justify-between py-1.5 text-sm"><span>{i.name}</span><span className="font-medium">{currencySymbol}{i.amount.toLocaleString('en-IN')}</span></div>
        ))}
        <div className="flex justify-between py-1.5 text-sm font-bold border-t mt-1"><span>Total Expenses</span><span className="text-destructive">{currencySymbol}{expenses.total.toLocaleString('en-IN')}</span></div>
      </CardContent></Card>
      <Card className={netProfit >= 0 ? 'border-success/30' : 'border-destructive/30'}><CardContent className="p-4 text-center">
        <p className="text-xs text-muted-foreground uppercase">Net {netProfit >= 0 ? 'Profit' : 'Loss'}</p>
        <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{currencySymbol}{Math.abs(netProfit).toLocaleString('en-IN')}</p>
      </CardContent></Card>
    </div>
  );
}
