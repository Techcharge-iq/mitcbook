import type { Account, AccountType, JournalEntry, JournalLine } from '@/types';

export interface AccountBalanceState {
  debit: number;
  credit: number;
}

export type AccountBalanceStore = Record<string, AccountBalanceState>;

const EPSILON = 0.001;

export const isBalancedLines = (lines: JournalLine[]): boolean => {
  const totalDebit = lines.reduce((sum, line) => sum + (Number.isFinite(line.debit) ? line.debit : 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number.isFinite(line.credit) ? line.credit : 0), 0);
  return Math.abs(totalDebit - totalCredit) <= EPSILON;
};

export const assertBalancedLines = (lines: JournalLine[], message = 'Journal entry is unbalanced') => {
  const totalDebit = lines.reduce((sum, line) => sum + (Number.isFinite(line.debit) ? line.debit : 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number.isFinite(line.credit) ? line.credit : 0), 0);
  if (Math.abs(totalDebit - totalCredit) > EPSILON) {
    throw new Error(`${message} (debits: ${totalDebit.toFixed(2)}, credits: ${totalCredit.toFixed(2)})`);
  }
};

export const applyJournalLinesToBalances = (
  lines: JournalLine[],
  current: AccountBalanceStore,
): AccountBalanceStore => {
  const next: AccountBalanceStore = { ...current };
  lines.forEach((line) => {
    const balance = next[line.accountId] ?? { debit: 0, credit: 0 };
    next[line.accountId] = {
      debit: balance.debit + (Number.isFinite(line.debit) ? line.debit : 0),
      credit: balance.credit + (Number.isFinite(line.credit) ? line.credit : 0),
    };
  });
  return next;
};

export const buildBalancesFromJournalEntries = (entries: JournalEntry[]): AccountBalanceStore =>
  entries.reduce((acc, entry) => applyJournalLinesToBalances(entry.lines, acc), {} as AccountBalanceStore);

const normalSideByType: Record<AccountType, 'debit' | 'credit'> = {
  asset: 'debit',
  expense: 'debit',
  liability: 'credit',
  equity: 'credit',
  income: 'credit',
};

export const getNetBalanceForAccount = (
  accountId: string,
  accountsById: Map<string, Account>,
  balanceStore: AccountBalanceStore,
): number => {
  const totals = balanceStore[accountId] ?? { debit: 0, credit: 0 };
  const accountType = accountsById.get(accountId)?.type;
  const normalSide = accountType ? normalSideByType[accountType] : 'debit';
  return normalSide === 'debit'
    ? totals.debit - totals.credit
    : totals.credit - totals.debit;
};

export const getLedgerBreakdown = (
  accountId: string,
  entries: JournalEntry[],
): Array<{ date: string; reference: string; referenceType: string; description: string; debit: number; credit: number }> => {
  const items: Array<{ date: string; reference: string; referenceType: string; description: string; debit: number; credit: number }> = [];
  entries.forEach((entry) => {
    entry.lines.forEach((line) => {
      if (line.accountId === accountId) {
        items.push({
          date: entry.date,
          reference: entry.reference,
          referenceType: entry.referenceType,
          description: line.description || entry.description,
          debit: line.debit,
          credit: line.credit,
        });
      }
    });
  });
  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return items;
};
