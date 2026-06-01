import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { currencySymbols } from '@/types';
import { getNetBalanceForAccount } from '@/lib/accounting';

export default function BalanceSheet() {
  const { accountBalances, accounts, settings } = useApp();
  const currencySymbol = currencySymbols[settings.currency];

  const { assets, liabilities, equity } = useMemo(() => {
    const accountsById = new Map(accounts.map((account) => [account.id, account]));
    const getBalance = (accountId: string) => getNetBalanceForAccount(accountId, accountsById, accountBalances);

    const assetAccs = accounts.filter((a) => a.type === 'asset').map((a) => ({ ...a, balance: getBalance(a.id) }));
    const liabilityAccs = accounts.filter((a) => a.type === 'liability').map((a) => ({ ...a, balance: -(getBalance(a.id)) }));
    const equityAccs = accounts.filter((a) => a.type === 'equity').map((a) => ({ ...a, balance: -(getBalance(a.id)) }));

    // Add retained earnings (income - expenses)
    const incomeAccs = accounts.filter((a) => a.type === 'income');
    const expenseAccs = accounts.filter((a) => a.type === 'expense');
    let retainedEarnings = 0;
    incomeAccs.forEach((a) => { retainedEarnings += -(getBalance(a.id)); });
    expenseAccs.forEach((a) => { retainedEarnings -= getBalance(a.id); });

    return {
      assets: { items: assetAccs, total: assetAccs.reduce((s, a) => s + a.balance, 0) },
      liabilities: { items: liabilityAccs, total: liabilityAccs.reduce((s, a) => s + a.balance, 0) },
      equity: { items: equityAccs, total: equityAccs.reduce((s, a) => s + a.balance, 0) + retainedEarnings, retainedEarnings },
    };
  }, [accountBalances, accounts]);

  const Section = ({ title, items, total, color }: { title: string; items: { name: string; balance: number }[]; total: number; color: string }) => (
    <Card>
      <CardHeader className="py-2.5 px-3"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="px-3 pb-3">
        {items.filter((i) => i.balance !== 0).map((item) => (
          <div key={item.name} className="flex justify-between py-1.5 text-sm"><span>{item.name}</span><span className="font-medium">{currencySymbol}{Math.abs(item.balance).toLocaleString('en-IN')}</span></div>
        ))}
        <div className={`flex justify-between py-1.5 text-sm font-bold border-t mt-1 ${color}`}><span>Total {title}</span><span>{currencySymbol}{Math.abs(total).toLocaleString('en-IN')}</span></div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-3 pb-20 lg:pb-4 max-w-2xl mx-auto">
      <div><h1 className="text-xl font-bold tracking-tight">Balance Sheet</h1><p className="text-xs text-muted-foreground">Assets = Liabilities + Equity</p></div>
      <Section title="Assets" items={assets.items} total={assets.total} color="text-primary" />
      <Section title="Liabilities" items={liabilities.items} total={liabilities.total} color="text-destructive" />
      <Card>
        <CardHeader className="py-2.5 px-3"><CardTitle className="text-sm">Equity</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3">
          {equity.items.filter((i) => i.balance !== 0).map((item) => (
            <div key={item.name} className="flex justify-between py-1.5 text-sm"><span>{item.name}</span><span className="font-medium">{currencySymbol}{Math.abs(item.balance).toLocaleString('en-IN')}</span></div>
          ))}
          {equity.retainedEarnings !== 0 && <div className="flex justify-between py-1.5 text-sm"><span>Retained Earnings</span><span className="font-medium">{currencySymbol}{Math.abs(equity.retainedEarnings).toLocaleString('en-IN')}</span></div>}
          <div className="flex justify-between py-1.5 text-sm font-bold border-t mt-1"><span>Total Equity</span><span>{currencySymbol}{Math.abs(equity.total).toLocaleString('en-IN')}</span></div>
        </CardContent>
      </Card>
      <Card className="border-primary/30"><CardContent className="p-3 flex justify-between text-sm font-bold"><span>Liabilities + Equity</span><span>{currencySymbol}{Math.abs(liabilities.total + equity.total).toLocaleString('en-IN')}</span></CardContent></Card>
    </div>
  );
}
