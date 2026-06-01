import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { currencySymbols } from '@/types';
import { getNetBalanceForAccount } from '@/lib/accounting';

export default function TrialBalance() {
  const { accountBalances, accounts, settings } = useApp();
  const currencySymbol = currencySymbols[settings.currency];

  const { rows, totalDebit, totalCredit } = useMemo(() => {
    const accountsById = new Map(accounts.map((account) => [account.id, account]));
    const rows = accounts.map((acc) => {
      const net = getNetBalanceForAccount(acc.id, accountsById, accountBalances);
      return { ...acc, debit: net > 0 ? net : 0, credit: net < 0 ? Math.abs(net) : 0 };
    }).filter((r) => r.debit !== 0 || r.credit !== 0);

    return { rows, totalDebit: rows.reduce((s, r) => s + r.debit, 0), totalCredit: rows.reduce((s, r) => s + r.credit, 0) };
  }, [accountBalances, accounts]);

  return (
    <div className="space-y-3 pb-20 lg:pb-4 max-w-2xl mx-auto">
      <div><h1 className="text-xl font-bold tracking-tight">Trial Balance</h1><p className="text-xs text-muted-foreground">All accounts with debits and credits</p></div>
      <Card>
        <CardContent className="p-3">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left py-2">Code</th><th className="text-left py-2">Account</th><th className="text-right py-2">Debit</th><th className="text-right py-2">Credit</th></tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={4} className="text-center py-6 text-muted-foreground text-xs">No entries yet</td></tr> :
                rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 text-xs font-mono">{r.code}</td><td className="py-2 text-xs">{r.name}</td>
                    <td className="py-2 text-xs text-right">{r.debit > 0 ? `${currencySymbol}${r.debit.toLocaleString('en-IN')}` : ''}</td>
                    <td className="py-2 text-xs text-right">{r.credit > 0 ? `${currencySymbol}${r.credit.toLocaleString('en-IN')}` : ''}</td>
                  </tr>
                ))}
            </tbody>
            <tfoot><tr className="border-t-2 font-bold"><td colSpan={2} className="py-2 text-xs">Total</td><td className="py-2 text-xs text-right">{currencySymbol}{totalDebit.toLocaleString('en-IN')}</td><td className="py-2 text-xs text-right">{currencySymbol}{totalCredit.toLocaleString('en-IN')}</td></tr></tfoot>
          </table>
          {Math.abs(totalDebit - totalCredit) > 0.01 && <p className="text-xs text-destructive mt-2">⚠ Trial balance does not balance (difference: {currencySymbol}{Math.abs(totalDebit - totalCredit).toLocaleString('en-IN')})</p>}
        </CardContent>
      </Card>
    </div>
  );
}
