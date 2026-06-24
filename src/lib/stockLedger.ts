import type { Item, Invoice, PurchaseInvoice } from '@/types';

export type StockMovementType = 'opening' | 'purchased' | 'sold' | 'adjusted';

export interface StockMovement {
  date: string;
  type: StockMovementType;
  reference: string;
  referenceId?: string;
  qty: number; // signed: + in, - out
  rate: number;
  runningBalance?: number;
}

interface Sources {
  invoices: Invoice[];
  purchases: PurchaseInvoice[];
}

export function getItemKind(item: Item): 'goods' | 'services' {
  // Normalize possible legacy or user-provided values.
  // Accept both 'services' and common variants like 'service',
  // and default to 'goods' when kind is missing or unrecognized.
  const raw = (item as any).kind || (item as any).type || '';
  const k = String(raw || '').toLowerCase().trim();
  if (!k) return 'goods';
  if (k === 'services' || k === 'service' || k.startsWith('serv')) return 'services';
  return 'goods';
}

export function isItemActive(item: Item): boolean {
  return item.active !== false;
}

export function getMovements(item: Item, { invoices, purchases }: Sources): StockMovement[] {
  if (getItemKind(item) !== 'goods') return [];
  const out: StockMovement[] = [];
  let openingQty = item.stock;

  purchases.forEach((p) => {
    p.items.forEach((li) => {
      if (li.itemId === item.id) {
        openingQty -= li.quantity;
        out.push({
          date: (p.invoiceDate || p.createdAt).split('T')[0],
          type: 'purchased',
          reference: p.number,
          referenceId: p.id,
          qty: li.quantity,
          rate: li.rate,
        });
      }
    });
  });

  invoices.forEach((inv) => {
    inv.items.forEach((li) => {
      if (li.itemId === item.id) {
        openingQty += li.quantity;
        out.push({
          date: (inv.invoiceDate || inv.createdAt).split('T')[0],
          type: 'sold',
          reference: inv.number,
          referenceId: inv.id,
          qty: -li.quantity,
          rate: li.rate,
        });
      }
    });
  });

  out.sort((a, b) => a.date.localeCompare(b.date));

  const all: StockMovement[] = [
    { date: '', type: 'opening', reference: 'Opening', qty: openingQty, rate: item.cost ?? 0 },
    ...out,
  ];

  let running = 0;
  for (const m of all) {
    running += m.qty;
    m.runningBalance = running;
  }
  return all;
}

export function getStockBalance(item: Item, movements: StockMovement[]): number {
  if (getItemKind(item) !== 'goods') return 0;
  if (movements.length === 0) return item.stock;
  return movements[movements.length - 1].runningBalance ?? item.stock;
}

export function getInventoryValuation(item: Item, balance: number): number {
  return balance * (item.cost ?? 0);
}

export function getServiceUsage(item: Item, invoices: Invoice[]) {
  const rows: { date: string; doc: string; qty: number; total: number }[] = [];
  invoices.forEach((inv) => {
    inv.items.forEach((li) => {
      if (li.itemId === item.id) {
        rows.push({
          date: (inv.invoiceDate || inv.createdAt).split('T')[0],
          doc: inv.number,
          qty: li.quantity,
          total: li.total,
        });
      }
    });
  });
  rows.sort((a, b) => b.date.localeCompare(a.date));
  const totalSales = rows.reduce((s, r) => s + r.total, 0);
  return { rows, timesUsed: rows.length, totalSales };
}

export function generateCode(kind: 'goods' | 'services', existing: Item[]): string {
  const prefix = kind === 'goods' ? 'GD' : 'SV';
  const codes = existing
    .filter((i) => (i.code ?? '').startsWith(prefix + '-'))
    .map((i) => parseInt((i.code ?? '').slice(prefix.length + 1), 10))
    .filter((n) => !isNaN(n));
  const next = (codes.length ? Math.max(...codes) : 0) + 1;
  return `${prefix}-${String(next).padStart(4, '0')}`;
}
