/**
 * Supabase sync layer for the AppContext collections.
 * - Pulls existing rows for the signed-in user on mount
 * - Upserts/deletes per-row on local mutations
 * - Subscribes to realtime changes so other devices see updates within ~1s
 *
 * Local-only / unauthenticated users keep working from localStorage as before.
 */
import { supabase } from '@/integrations/supabase/client';

const camelToSnake = (s: string) => s.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
const snakeToCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

// Columns whose values are JSON in the DB — we must NOT recursively snake-ify their inner keys.
const JSON_KEYS = new Set([
  'items',
  'lines',
  'activities',
  'project_summary',
  'projectSummary',
  'linked_invoice_ids',
  'linkedInvoiceIds',
  'details',
]);

// Per-collection metadata so we only send/accept known columns.
// Keys are camelCase (TS); values are the DB snake_case columns.
type ColMap = Record<string, string>;

const baseCols = (extra: ColMap = {}): ColMap => ({
  id: 'id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  ...extra,
});

const COLLECTIONS: Record<
  string,
  { table: string; cols: ColMap }
> = {
  clients: {
    table: 'clients',
    cols: baseCols({
      name: 'name',
      email: 'email',
      phone: 'phone',
      address: 'address',
      type: 'type',
      paymentTermsDays: 'payment_terms_days',
      taxRegistrationNumber: 'tax_registration_number',
      creditLimit: 'credit_limit',
    }),
  },
  quotations: {
    table: 'quotations',
    cols: baseCols({
      number: 'number',
      clientId: 'client_id',
      salesmanId: 'salesman_id',
      items: 'items',
      netTotal: 'net_total',
      status: 'status',
      convertedInvoiceId: 'converted_invoice_id',
      notes: 'notes',
      terms: 'terms',
    }),
  },
  invoices: {
    table: 'invoices',
    cols: baseCols({
      number: 'number',
      clientId: 'client_id',
      salesmanId: 'salesman_id',
      quotationId: 'quotation_id',
      invoiceType: 'invoice_type',
      projectId: 'project_id',
      projectSummary: 'project_summary',
      items: 'items',
      netTotal: 'net_total',
      status: 'status',
      invoiceDate: 'invoice_date',
      dueDate: 'due_date',
      notes: 'notes',
      terms: 'terms',
    }),
  },
  projects: {
    table: 'projects',
    cols: baseCols({
      name: 'name',
      vendorId: 'vendor_id',
      totalValue: 'total_value',
      lpoNumber: 'lpo_number',
      startDate: 'start_date',
      endDate: 'end_date',
      status: 'status',
      activities: 'activities',
    }),
  },
  purchaseInvoices: {
    table: 'purchase_invoices',
    cols: baseCols({
      number: 'number',
      vendorId: 'vendor_id',
      items: 'items',
      netTotal: 'net_total',
      status: 'status',
      invoiceDate: 'invoice_date',
      dueDate: 'due_date',
      notes: 'notes',
      terms: 'terms',
    }),
  },
  payments: {
    table: 'payments',
    cols: baseCols({
      invoiceId: 'invoice_id',
      invoiceType: 'invoice_type',
      amount: 'amount',
      date: 'date',
      method: 'method',
      reference: 'reference',
      notes: 'notes',
    }),
  },
  accounts: {
    table: 'accounts',
    cols: baseCols({
      code: 'code',
      name: 'name',
      type: 'type',
      kind: 'kind',
      parentId: 'parent_id',
      isSystem: 'is_system',
    }),
  },
  journalEntries: {
    table: 'journal_entries',
    cols: baseCols({
      date: 'date',
      reference: 'reference',
      referenceType: 'reference_type',
      referenceId: 'reference_id',
      description: 'description',
      lines: 'lines',
      idempotencyKey: 'idempotency_key',
      reversalOf: 'reversal_of',
    }),
  },
  vouchers: {
    table: 'vouchers',
    cols: baseCols({
      number: 'number',
      type: 'type',
      date: 'date',
      partyName: 'party_name',
      amount: 'amount',
      narration: 'narration',
      method: 'method',
      reference: 'reference',
      details: 'details',
    }),
  },
  items: {
    table: 'items',
    cols: baseCols({
      name: 'name',
      description: 'description',
      unit: 'unit',
      rate: 'rate',
      cost: 'cost',
      stock: 'stock',
      reorderLevel: 'reorder_level',
      vatApplicable: 'vat_applicable',
      vatPercentage: 'vat_percentage',
    }),
  },
  salesmen: {
    table: 'salesmen',
    cols: baseCols({
      name: 'name',
      phone: 'phone',
    }),
  },
};

export function isSyncedCollection(collection: string): boolean {
  return collection in COLLECTIONS;
}

function toRow(collection: string, obj: any): Record<string, any> | null {
  const meta = COLLECTIONS[collection];
  if (!meta) return null;
  const out: Record<string, any> = {};
  for (const [camel, snake] of Object.entries(meta.cols)) {
    if (obj[camel] !== undefined) out[snake] = obj[camel];
  }
  return out;
}

function fromRow(collection: string, row: any): any {
  const meta = COLLECTIONS[collection];
  if (!meta || !row) return row;
  const out: Record<string, any> = {};
  for (const [camel, snake] of Object.entries(meta.cols)) {
    if (row[snake] !== undefined && row[snake] !== null) out[camel] = row[snake];
  }
  return out;
}

export async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// ---------------- Sync status bus ----------------
export type SyncEvent = 'saving' | 'saved' | 'error' | 'remote-update';
type SyncListener = (e: SyncEvent) => void;
const listeners = new Set<SyncListener>();
export const syncBus = {
  emit(e: SyncEvent) { listeners.forEach((l) => { try { l(e); } catch {} }); },
  subscribe(cb: SyncListener) { listeners.add(cb); return () => { listeners.delete(cb); }; },
};

export async function cloudLoadAll<T>(collection: string): Promise<T[] | null> {
  const meta = COLLECTIONS[collection];
  if (!meta) return null;
  const uid = await getUserId();
  if (!uid) return null;
  const { data, error } = await supabase.from(meta.table as any).select('*').eq('user_id', uid);
  if (error) {
    console.warn(`[cloud] load ${collection} failed:`, error.message);
    return null;
  }
  return (data ?? []).map((r) => fromRow(collection, r)) as T[];
}

export async function cloudFetchById<T = any>(collection: string, id: string): Promise<T | null> {
  const meta = COLLECTIONS[collection];
  if (!meta || !id) return null;
  const uid = await getUserId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from(meta.table as any)
    .select('*')
    .eq('id', id)
    .eq('user_id', uid)
    .maybeSingle();
  if (error) {
    console.warn(`[cloud] fetchById ${collection}/${id} failed:`, error.message);
    return null;
  }
  return data ? (fromRow(collection, data) as T) : null;
}

export async function cloudUpsert(collection: string, item: any): Promise<void> {
  const meta = COLLECTIONS[collection];
  if (!meta) return;
  const uid = await getUserId();
  if (!uid) return;
  const row = toRow(collection, item);
  if (!row) return;
  row.user_id = uid;
  syncBus.emit('saving');
  const { error } = await supabase.from(meta.table as any).upsert(row, { onConflict: 'id' });
  if (error) {
    console.warn(`[cloud] upsert ${collection}/${item.id} failed:`, error.message);
    syncBus.emit('error');
  } else {
    syncBus.emit('saved');
  }
}

export async function cloudDelete(collection: string, id: string): Promise<void> {
  const meta = COLLECTIONS[collection];
  if (!meta) return;
  const uid = await getUserId();
  if (!uid) return;
  syncBus.emit('saving');
  const { error } = await supabase.from(meta.table as any).delete().eq('id', id).eq('user_id', uid);
  if (error) {
    console.warn(`[cloud] delete ${collection}/${id} failed:`, error.message);
    syncBus.emit('error');
  } else {
    syncBus.emit('saved');
  }
}

export function cloudSubscribe(
  collection: string,
  userId: string,
  onChange: (event: 'INSERT' | 'UPDATE' | 'DELETE', row: any, oldRow: any) => void,
) {
  const meta = COLLECTIONS[collection];
  if (!meta) return () => {};
  const channel = supabase
    .channel(`sync-${collection}-${userId}`)
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: meta.table, filter: `user_id=eq.${userId}` },
      (payload: any) => {
        const newRow = payload.new ? fromRow(collection, payload.new) : null;
        const oldRow = payload.old ? fromRow(collection, payload.old) : null;
        onChange(payload.eventType, newRow, oldRow);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// silence unused-key lint
void JSON_KEYS;
void camelToSnake;
void snakeToCamel;
