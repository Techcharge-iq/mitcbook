# Fix: Data not reaching Lovable Cloud

## Root cause

The app's sync layer (`useRemoteCollection` → `cloudSync.cloudUpsert`/`cloudLoadAll`) is wired correctly and the RLS policies on every business table are correct (`auth.uid() = user_id`). However, **no role has any GRANT on any table in the `public` schema**:

```
SELECT grantee, table_name FROM information_schema.role_table_grants
 WHERE table_schema='public' AND grantee IN ('anon','authenticated','service_role');
→ 0 rows
```

Supabase's Data API (PostgREST) requires explicit GRANTs — RLS alone is not enough. Every `supabase.from('projects').upsert(...)` call from the signed-in client is rejected with `permission denied for table projects`. `cloudUpsert` only logs `console.warn` and emits a `syncBus` `error` event, so the UI keeps appearing to work while data lives only in `localStorage`. That's why:

- Lovable Cloud tables are empty (`projects`, `invoices`, `vouchers`, `purchase_invoices`, `clients` all show `count = 0`).
- A second PC signing into the same account sees nothing — the initial `cloudLoadAll` also returns "permission denied" → `null` → nothing merged into local state.

A previous migration described as "adding Data API grants" did not actually take effect in the live database (no GRANT rows exist for any role on any public table).

## Fix

### 1. Migration: restore GRANTs on every business table

Grant the Data API roles their normal privileges. Every business table is per-user (every policy scopes to `auth.uid()`), so `anon` gets nothing.

```sql
-- Per-user business tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vouchers         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salesmen         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles         TO authenticated;
GRANT SELECT                          ON public.user_roles      TO authenticated;
GRANT SELECT, INSERT                  ON public.audit_log       TO authenticated;

GRANT ALL ON public.clients, public.quotations, public.invoices, public.projects,
            public.purchase_invoices, public.payments, public.accounts,
            public.journal_entries, public.vouchers, public.items, public.salesmen,
            public.companies, public.business_settings, public.profiles,
            public.user_roles, public.audit_log TO service_role;
```

No schema, RLS, or policy change — only privileges.

### 2. `src/lib/cloudSync.ts` — make failures visible + minimal logs

- In `cloudUpsert`, `cloudDelete`, and `cloudLoadAll`: keep the existing `console.warn` but also `console.error` with the operation + collection + id + the full Supabase `error` object (code, message, hint) so a permission-denied/RLS regression is obvious in DevTools.
- Add a one-line `console.info('[cloud] upsert', collection, id)` on success and `console.info('[cloud] load', collection, rows.length)` after a successful load.

No behavioral change beyond logging.

### 3. Verification

After the migration runs:

1. Sign in on PC A, create a Project and a Sales Invoice. DevTools should show `[cloud] upsert projects <id>` and `[cloud] upsert invoices <id>` with no warning.
2. Query the DB: `SELECT count(*) FROM projects; SELECT count(*) FROM invoices;` — both > 0.
3. Sign in on PC B with the same account. On load, DevTools should show `[cloud] load projects N` and `[cloud] load invoices N` with N matching PC A. The Projects list and Invoices list should show the rows created on PC A.
4. Edit the project on PC B; PC A's open list should update within ~1s via the existing realtime subscription.

## Out of scope

No UI, routing, AppContext, sync-status indicator, PDF, or auth changes. Local-first behavior, RLS policies, and table schemas stay exactly as they are.
