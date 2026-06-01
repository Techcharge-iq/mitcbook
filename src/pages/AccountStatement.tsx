import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isBefore, isAfter, isWithinInterval } from 'date-fns';
import { ArrowLeft, CalendarIcon, Download, FileDown } from 'lucide-react';
import { currencySymbols } from '@/types';
import type { AccountType } from '@/types';
import { getLedgerBreakdown } from '@/lib/accounting';

const typeColors: Record<AccountType, string> = {
  asset: 'bg-primary/10 text-primary',
  liability: 'bg-destructive/10 text-destructive',
  income: 'bg-success/10 text-success',
  expense: 'bg-warning/10 text-warning',
  equity: 'bg-accent text-accent-foreground',
};

type DatePreset = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

export default function AccountStatement() {
  const { id } = useParams<{ id: string }>();
  const { accounts, journalEntries, settings } = useApp();
  const currencySymbol = currencySymbols[settings.currency];

  const account = accounts.find((a) => a.id === id);

  const [preset, setPreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (preset) {
      case 'today': return { from: startOfDay(now), to: endOfDay(now) };
      case 'week': return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month': return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'year': return { from: startOfYear(now), to: endOfYear(now) };
      case 'custom': return { from: customFrom ? startOfDay(customFrom) : undefined, to: customTo ? endOfDay(customTo) : undefined };
      default: return { from: undefined, to: undefined };
    }
  }, [preset, customFrom, customTo]);

  const transactions = useMemo(() => {
    if (!account) return [];

    return getLedgerBreakdown(account.id, journalEntries);
  }, [account, journalEntries]);

  const { filteredTransactions, openingBalance, totalDebits, totalCredits, closingBalance } = useMemo(() => {
    let opening = 0;
    const filtered: typeof transactions = [];

    transactions.forEach((t) => {
      const tDate = new Date(t.date);
      const inRange = dateRange.from && dateRange.to
        ? isWithinInterval(tDate, { start: dateRange.from, end: dateRange.to })
        : dateRange.from
          ? !isBefore(tDate, dateRange.from)
          : true;

      if (dateRange.from && isBefore(tDate, dateRange.from)) {
        opening += t.debit - t.credit;
      } else if (inRange) {
        filtered.push(t);
      }
    });

    const debits = filtered.reduce((s, t) => s + t.debit, 0);
    const credits = filtered.reduce((s, t) => s + t.credit, 0);

    return {
      filteredTransactions: filtered,
      openingBalance: opening,
      totalDebits: debits,
      totalCredits: credits,
      closingBalance: opening + debits - credits,
    };
  }, [transactions, dateRange]);

  const exportCSV = () => {
    if (!account) return;
    const rows = [['Date', 'Reference', 'Type', 'Description', 'Debit', 'Credit', 'Running Balance']];
    let running = openingBalance;
    filteredTransactions.forEach((t) => {
      running += t.debit - t.credit;
      rows.push([
        format(new Date(t.date), 'yyyy-MM-dd'),
        t.reference,
        t.referenceType,
        t.description,
        t.debit.toFixed(2),
        t.credit.toFixed(2),
        running.toFixed(2),
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${account.code}-${account.name}-statement.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Account not found</p>
        <Link to="/accounts" className="text-primary text-sm mt-2 inline-block">← Back to Chart of Accounts</Link>
      </div>
    );
  }

  let runningBalance = openingBalance;

  return (
    <div className="space-y-3 pb-20 lg:pb-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link to="/accounts">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{account.name}</h1>
              <Badge variant="outline" className={cn('text-[10px]', typeColors[account.type])}>
                {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Code: {account.code}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV}>
          <Download className="mr-1.5 h-4 w-4" />CSV
        </Button>
      </div>

      {/* Date filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(['all', 'today', 'week', 'month', 'year'] as DatePreset[]).map((p) => (
          <Button
            key={p}
            size="sm"
            variant={preset === p ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => setPreset(p)}
          >
            {p === 'all' ? 'All Time' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : p === 'year' ? 'This Year' : 'Today'}
          </Button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant={preset === 'custom' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setPreset('custom')}>
              <CalendarIcon className="mr-1 h-3 w-3" />
              {preset === 'custom' && customFrom && customTo
                ? `${format(customFrom, 'dd MMM')} – ${format(customTo, 'dd MMM')}`
                : 'Custom'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="flex flex-col sm:flex-row gap-3">
              <div>
                <p className="text-xs font-medium mb-1">From</p>
                <Calendar mode="single" selected={customFrom} onSelect={(d) => { setCustomFrom(d); setPreset('custom'); }} className="p-0 pointer-events-auto" />
              </div>
              <div>
                <p className="text-xs font-medium mb-1">To</p>
                <Calendar mode="single" selected={customTo} onSelect={(d) => { setCustomTo(d); setPreset('custom'); }} className="p-0 pointer-events-auto" />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { label: 'Opening Balance', value: openingBalance },
          { label: 'Total Debits', value: totalDebits },
          { label: 'Total Credits', value: totalCredits },
          { label: 'Closing Balance', value: closingBalance },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-3">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{c.label}</p>
              <p className={cn('text-lg font-bold mt-0.5', c.value < 0 && 'text-destructive')}>
                {currencySymbol}{Math.abs(c.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                {c.value < 0 && ' Cr'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transaction table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Reference</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Description</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Debit</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Credit</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Balance</th>
                </tr>
              </thead>
              <tbody>
                {openingBalance !== 0 && (
                  <tr className="border-b border-border bg-muted/30">
                    <td colSpan={3} className="px-3 py-2 text-xs font-medium text-muted-foreground italic">
                      Opening Balance
                    </td>
                    <td className="px-3 py-2 text-right text-xs">—</td>
                    <td className="px-3 py-2 text-right text-xs">—</td>
                    <td className="px-3 py-2 text-right text-xs font-medium">
                      {currencySymbol}{Math.abs(openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      {openingBalance < 0 ? ' Cr' : ' Dr'}
                    </td>
                  </tr>
                )}
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-xs text-muted-foreground">
                      <FileDown className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                      No transactions for this period
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((t, i) => {
                    runningBalance += t.debit - t.credit;
                    return (
                      <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 text-xs whitespace-nowrap">{format(new Date(t.date), 'dd MMM yyyy')}</td>
                        <td className="px-3 py-2 text-xs">
                          <span className="font-mono">{t.reference}</span>
                          <span className="ml-1 text-[10px] text-muted-foreground capitalize sm:hidden">
                            {t.description?.substring(0, 20)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs hidden sm:table-cell text-muted-foreground">{t.description}</td>
                        <td className="px-3 py-2 text-right text-xs">
                          {t.debit > 0 ? `${currencySymbol}${t.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          {t.credit > 0 ? `${currencySymbol}${t.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className={cn('px-3 py-2 text-right text-xs font-medium', runningBalance < 0 && 'text-destructive')}>
                          {currencySymbol}{Math.abs(runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          {runningBalance < 0 ? ' Cr' : ' Dr'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
