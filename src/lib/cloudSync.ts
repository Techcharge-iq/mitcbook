/**
 * Supabase sync layer for the AppContext collections.
 * - Pulls existing rows for the signed-in user on mount
 * - Upserts/deletes per-row on local mutations
 * - Subscribes to realtime changes so other devices see updates within ~1s
 * - ✅ UPDATED: Now supports company isolation via company_id filter
 * - ✅ UPDATED: Added payment_allocations and payment_mode_details collections
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
  'allocations', // ✅ ADDED for payment allocations
  'payment_mode_details', // ✅ ADDED for payment mode details
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
      showDateColumn: 'show_date_column',
      retentionPercentage: 'retention_percentage',
      retentionAmount: 'retention_amount',
      retentionReleased: 'retention_released',
      retentionStatus: 'retention_status',
      retentionReleaseDate: 'retention_release_date',
      retentionReleaseNotes: 'retention_release_notes',
    }),
  },
  projects: {
    table: 'projects',
    cols: baseCols({
      name: 'name',
      customerId: 'vendor_id',
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
      vatEnabled: 'vat_enabled',
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
      // ✅ NEW: Payment receipt fields
      receiptNumber: 'receipt_number',
      receiptDate: 'receipt_date',
      clientId: 'client_id',
      receiptType: 'receipt_type',
      paymentMode: 'payment_mode',
      amountReceived: 'amount_received',
      discount: 'discount',
      netAmount: 'net_amount',
      unadjustedAmount: 'unadjusted_amount',
      narration: 'narration',
      // ✅ NEW: Allocations and mode details stored as JSON
      allocations: 'allocations',
      paymentModeDetails: 'payment_mode_details',
    }),
  },
  // ✅ NEW: Payment Allocations collection
  payment_allocations: {
    table: 'payment_allocations',
    cols: baseCols({
      paymentId: 'payment_id',
      invoiceId: 'invoice_id',
      invoiceNumber: 'invoice_number',
      billDate: 'bill_date',
      dueDate: 'due_date',
      billAmount: 'bill_amount',
      outstandingBefore: 'outstanding_before',
      receiptAmount: 'receipt_amount',
      discountAmount: 'discount_amount',
      adjustedAmount: 'adjusted_amount',
      outstandingAfter: 'outstanding_after',
    }),
  },
  // ✅ NEW: Payment Mode Details collection
  payment_mode_details: {
    table: 'payment_mode_details',
    cols: baseCols({
      paymentId: 'payment_id',
      mode: 'mode',
      amount: 'amount',
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
      companyId: 'company_id',
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
  // ✅ NEW: Retention Releases collection
  retention_releases: {
    table: 'retention_releases',
    cols: baseCols({
      invoiceId: 'invoice_id',
      amount: 'amount',
      date: 'date',
      reference: 'reference',
      notes: 'notes',
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

// ✅ UPDATED: Added companyId parameter
export async function cloudLoadAll<T>(
  collection: string,
  userId?: string,
  companyId?: string
): Promise<T[] | null> {
  const meta = COLLECTIONS[collection];
  if (!meta) return null;
  
  const uid = userId || await getUserId();
  if (!uid) return null;
  
  let query = supabase
    .from(meta.table as any)
    .select('*')
    .eq('user_id', uid);
  
  // ✅ ADD company filter if provided
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error(`[cloud] load ${collection} failed:`, error);
    return null;
  }
  
  const rows = (data ?? []).map((r) => fromRow(collection, r)) as T[];
  console.info(`[cloud] load ${collection} →`, rows.length, companyId ? `(company: ${companyId})` : '');
  return rows;
}

export async function cloudFetchById<T = any>(
  collection: string,
  id: string,
  companyId?: string
): Promise<T | null> {
  const meta = COLLECTIONS[collection];
  if (!meta || !id) return null;
  
  const uid = await getUserId();
  if (!uid) return null;
  
  let query = supabase
    .from(meta.table as any)
    .select('*')
    .eq('id', id)
    .eq('user_id', uid);
  
  // ✅ ADD company filter if provided
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  const { data, error } = await query.maybeSingle();
  
  if (error) {
    console.warn(`[cloud] fetchById ${collection}/${id} failed:`, error.message);
    return null;
  }
  return data ? (fromRow(collection, data) as T) : null;
}

// ✅ UPDATED: Added companyId to upsert
export async function cloudUpsert(
  collection: string,
  item: any,
  companyId?: string
): Promise<void> {
  const meta = COLLECTIONS[collection];
  if (!meta) return;
  
  const uid = await getUserId();
  if (!uid) return;
  
  const row = toRow(collection, item);
  if (!row) return;
  
  // ✅ ADD company_id to the row
  row.user_id = uid;
  if (companyId) {
    row.company_id = companyId;
  } else if (item.company_id) {
    row.company_id = item.company_id;
  }
  
  // Handle JSON fields - stringify if needed
  if (collection === 'payments' && item.allocations) {
    row.allocations = JSON.stringify(item.allocations);
  }
  if (collection === 'payments' && item.paymentModeDetails) {
    row.payment_mode_details = JSON.stringify(item.paymentModeDetails);
  }
  
  syncBus.emit('saving');
  const { error } = await supabase
    .from(meta.table as any)
    .upsert(row, { onConflict: 'id' });
  
  if (error) {
    console.error(`[cloud] upsert ${collection}/${item.id} failed:`, error);
    syncBus.emit('error');
  } else {
    console.info(`[cloud] upsert ${collection}/${item.id} ok`);
    syncBus.emit('saved');
  }
}

// ✅ UPDATED: Added companyId to delete
export async function cloudDelete(
  collection: string,
  id: string,
  companyId?: string
): Promise<void> {
  const meta = COLLECTIONS[collection];
  if (!meta) return;
  
  const uid = await getUserId();
  if (!uid) return;
  
  syncBus.emit('saving');
  
  let query = supabase
    .from(meta.table as any)
    .delete()
    .eq('id', id)
    .eq('user_id', uid);
  
  // ✅ ADD company filter if provided
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  const { error } = await query;
  
  if (error) {
    console.error(`[cloud] delete ${collection}/${id} failed:`, error);
    syncBus.emit('error');
  } else {
    console.info(`[cloud] delete ${collection}/${id} ok`);
    syncBus.emit('saved');
  }
}

// ✅ UPDATED: Added companyId to subscription
export function cloudSubscribe(
  collection: string,
  userId: string,
  companyId?: string,
  onChange?: (event: 'INSERT' | 'UPDATE' | 'DELETE', row: any, oldRow: any) => void,
) {
  const meta = COLLECTIONS[collection];
  if (!meta) return () => {};
  
  // ✅ Build filter with company_id if provided
  let filter = `user_id=eq.${userId}`;
  if (companyId) {
    filter = `${filter},company_id=eq.${companyId}`;
  }
  
  const channelName = `sync-${collection}-${userId}${companyId ? `-${companyId}` : ''}`;
  
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes' as any,
      { 
        event: '*', 
        schema: 'public', 
        table: meta.table, 
        filter: filter 
      },
      (payload: any) => {
        // Parse JSON fields for payments
        let newRow = payload.new ? fromRow(collection, payload.new) : null;
        let oldRow = payload.old ? fromRow(collection, payload.old) : null;
        
        // Parse JSON strings back to objects
        if (collection === 'payments') {
          if (newRow?.allocations && typeof newRow.allocations === 'string') {
            newRow.allocations = JSON.parse(newRow.allocations);
          }
          if (newRow?.paymentModeDetails && typeof newRow.paymentModeDetails === 'string') {
            newRow.paymentModeDetails = JSON.parse(newRow.paymentModeDetails);
          }
          if (oldRow?.allocations && typeof oldRow.allocations === 'string') {
            oldRow.allocations = JSON.parse(oldRow.allocations);
          }
          if (oldRow?.paymentModeDetails && typeof oldRow.paymentModeDetails === 'string') {
            oldRow.paymentModeDetails = JSON.parse(oldRow.paymentModeDetails);
          }
        }
        
        if (onChange) {
          onChange(payload.eventType, newRow, oldRow);
        }
      },
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}

// ✅ NEW: Helper to ensure company_id exists on all rows
export function ensureCompanyId<T extends { id: string }>(
  item: T,
  companyId: string
): T & { company_id: string } {
  return {
    ...item,
    company_id: companyId || 'default',
  } as T & { company_id: string };
}

// silence unused-key lint
void JSON_KEYS;
void camelToSnake;
void snakeToCamel;