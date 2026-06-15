# Supabase Self-Host Export

This bundle lets you run the app against your **own** Supabase project
(e.g. `znevekusyqrtvedjstpo`) instead of the Lovable-managed backend.

> The live Lovable preview will keep writing to Lovable Cloud — Lovable Cloud
> cannot be disconnected from a project. To use this bundle you fork/self-host
> the app and override two env vars.

## 1. Prepare your Supabase project

1. Open your Supabase dashboard → SQL editor.
2. Run the files in `schema/` **in order**:
   - `00_extensions.sql`
   - `01_enums.sql`
   - `02_tables.sql`
   - `03_functions_triggers.sql`
   - `04_rls_policies.sql`
3. Auth → Providers → enable **Email**. For dev convenience you can disable
   "Confirm email". For prod, leave it on.

## 2. Point your app at the new project

Copy `.env.example` to `.env` in your self-hosted fork and fill in:

```
VITE_SUPABASE_URL=https://YOUR-REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
```

The values you sent are already pre-filled in the example.

## 3. Migrate existing localStorage data

On every browser/device that has old data:

1. Open `migration/migrate-localstorage.html` directly in that browser
   (double-click, or serve it locally — it does not need a backend).
2. Confirm the Supabase URL + anon key (pre-filled).
3. Sign in with the user account that should own the data.
4. Click **Migrate**. The page shows per-collection counts.

The migration is idempotent — re-running it upserts by row `id`, so it's
safe to retry.

## 4. Verify

In the Supabase Table Editor, open `clients`, `invoices`, `quotations`,
`journal_entries`, etc. and confirm rows are present and scoped to your
`user_id`.

## What's in the schema

Every user-scoped table has:

- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null references auth.users on delete cascade`
- `company_id text not null default 'default'`
- `created_at`, `updated_at` (trigger-maintained)
- RLS enabled with a single `FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)` policy
- `GRANT SELECT, INSERT, UPDATE, DELETE … TO authenticated` and `GRANT ALL … TO service_role` (no `anon` — every row is user-private)

`auth.users` inserts trigger `handle_new_user`, which seeds `profiles` and
assigns the **first signup** the `admin` role.
