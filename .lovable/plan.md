## Goal

Generate a portable, self-contained `supabase-export/` bundle in this repo so you can run your app against your own Supabase project (`znevekusyqrtvedjstpo`). The live Lovable preview will keep using Lovable Cloud — these are files you take with you to your own deployment.

> Heads up I already gave you: I cannot point this Lovable project at your external Supabase. Lovable Cloud cannot be disconnected from this project, and `src/integrations/supabase/client.ts` / the Supabase env vars are auto-generated and off-limits. This plan only produces files. To actually run against your external project you'll fork/self-host the app and override the two env vars.

## What gets created

```
supabase-export/
  README.md                      # step-by-step: run SQL, configure auth, swap env vars
  schema/
    00_extensions.sql            # pgcrypto, uuid-ossp
    01_enums.sql                 # app_role enum
    02_tables.sql                # all tables below, with GRANTs
    03_functions_triggers.sql    # has_role, update_updated_at_column, handle_new_user
    04_rls_policies.sql          # per-table RLS, user-scoped
    05_seed_default_accounts.sql # optional: not seeded; accounts auto-created per user from app
  migration/
    migrate-localstorage.ts      # browser script: reads app_* keys, upserts to Supabase
    migrate-localstorage.html    # tiny page that runs the script with your URL/anon key
  .env.example                   # VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY template
```

## Schema (mirrors what `cloudSync.ts` already maps)

All user-scoped tables share: `id uuid pk default gen_random_uuid()`, `user_id uuid not null references auth.users(id) on delete cascade`, `company_id text not null default 'default'`, `created_at`, `updated_at` (trigger-maintained).

Tables:
- `profiles` (user_id pk, display_name)
- `user_roles` (user_id, role app_role) + `has_role()` security-definer
- `companies` (name) — currently localStorage-only; promoted to cloud
- `clients` (name, email, phone, address, type, payment_terms_days, tax_registration_number, credit_limit)
- `items` (name, description, unit, rate, cost, stock, reorder_level, vat_applicable, vat_percentage, kind, code, category, min_stock, active)
- `salesmen` (name, phone)
- `projects` (name, vendor_id, total_value, lpo_number, start_date, end_date, status, activities jsonb)
- `quotations` (number, client_id, salesman_id, items jsonb, net_total, status, converted_invoice_id, notes, terms)
- `invoices` (number, client_id, salesman_id, quotation_id, invoice_type, project_id, project_summary jsonb, items jsonb, net_total, status, invoice_date, due_date, notes, terms)
- `purchase_invoices` (number, vendor_id, items jsonb, net_total, status, invoice_date, due_date, notes, terms)
- `payments` (invoice_id, invoice_type, amount, date, method, reference, notes)
- `accounts` (code, name, type, kind, parent_id, is_system)
- `journal_entries` (date, reference, reference_type, reference_id, description, lines jsonb, idempotency_key, reversal_of)
- `vouchers` (number, type, date, party_name, amount, narration, method, reference, details jsonb)
- `business_settings` (company_id, name, email, phone, address, logo, currency, tax_number, theme, vat_enabled, default_vat_percentage, bank_name, bank_account_number, signature) — unique on (user_id, company_id)
- `account_balances` (company_id, account_id, balance) — unique on (user_id, company_id, account_id); currently localStorage-only
- `audit_log` (company_id, type, action, target, details, value, created_at) — currently localStorage-only

Every public table gets in this exact order:
1. `CREATE TABLE`
2. `GRANT SELECT, INSERT, UPDATE, DELETE … TO authenticated; GRANT ALL … TO service_role;` (no `anon` — all access is per-user)
3. `ALTER TABLE … ENABLE ROW LEVEL SECURITY`
4. `CREATE POLICY "own rows" … USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)` (FOR ALL)

`updated_at` trigger on every table. `handle_new_user` trigger on `auth.users` creates a `profiles` row and assigns first signup as `admin`.

## Local→Cloud migration script

`migration/migrate-localstorage.html` is a single static page you open in the browser where the old data lives. It:
1. Asks for your Supabase URL + anon key (prefilled with the ones you sent).
2. Prompts sign-in (email/password).
3. Scans `localStorage` for keys matching `app_<collection>_<companyId>` for every collection above, including the localStorage-only ones (`companies`, `account_balances`, `audit_log`, `settings`).
4. Upserts each row by `id` (so re-running is safe), stamping `user_id = auth.uid()` and `company_id` from the key suffix.
5. Reports per-collection success/failure counts.

No app code is touched; this script is standalone and lives only under `supabase-export/migration/`.

## README contents

- Create a new Supabase project (or reuse `znevekusyqrtvedjstpo`).
- Run SQL files in order: `00_…` → `04_…`.
- In Auth settings: enable Email provider; optionally disable email confirmation for dev.
- Take the project's URL + anon key, put them in your deployment's `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Open `migration/migrate-localstorage.html` from each browser/device that has data, sign in, click Migrate.
- Verify in Supabase Table Editor.

## Out of scope (explicit)

- No edits to `src/`, `package.json`, `vite.config.ts`, `.env`, or anything Lovable-managed.
- No changes to the existing Lovable Cloud schema or RLS.
- The running Lovable preview will continue writing to Lovable Cloud, not your external project. Cross-device sync against `znevekusyqrtvedjstpo` only works once you self-host the app with swapped env vars.
- No automatic background backup beyond what Supabase provides — `pg_dump` against Supabase is not enabled from here.

## After approval

I'll create the files above in one pass, then point you at `supabase-export/README.md`.
