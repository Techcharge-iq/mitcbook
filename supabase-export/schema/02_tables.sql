-- =====================================================================
-- Tables + GRANTs. RLS is enabled in 04_rls_policies.sql.
-- Every user-scoped table follows the same shape:
--   id uuid pk, user_id uuid (auth.users), company_id text, timestamps
-- =====================================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- ---------- user_roles ----------
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

-- ---------- companies ----------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.companies to authenticated;
grant all on public.companies to service_role;

-- ---------- clients ----------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null default 'default',
  name text not null,
  email text,
  phone text,
  address text,
  type text,
  payment_terms_days integer,
  tax_registration_number text,
  credit_limit numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;

-- ---------- items ----------
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null default 'default',
  name text not null,
  description text,
  unit text,
  rate numeric,
  cost numeric,
  stock numeric,
  reorder_level numeric,
  vat_applicable boolean,
  vat_percentage numeric,
  kind text,
  code text,
  category text,
  min_stock numeric,
  active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.items to authenticated;
grant all on public.items to service_role;

-- ---------- salesmen ----------
create table if not exists public.salesmen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null default 'default',
  name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.salesmen to authenticated;
grant all on public.salesmen to service_role;

-- ---------- projects ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null default 'default',
  name text not null,
  vendor_id text,
  total_value numeric,
  lpo_number text,
  start_date date,
  end_date date,
  status text,
  activities jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;

-- ---------- quotations ----------
create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null default 'default',
  number text,
  client_id text,
  salesman_id text,
  items jsonb default '[]'::jsonb,
  net_total numeric,
  status text,
  converted_invoice_id text,
  notes text,
  terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.quotations to authenticated;
grant all on public.quotations to service_role;

-- ---------- invoices ----------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null default 'default',
  number text,
  client_id text,
  salesman_id text,
  quotation_id text,
  invoice_type text,
  project_id text,
  project_summary jsonb,
  items jsonb default '[]'::jsonb,
  net_total numeric,
  status text,
  invoice_date date,
  due_date date,
  notes text,
  terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.invoices to authenticated;
grant all on public.invoices to service_role;

-- ---------- purchase_invoices ----------
create table if not exists public.purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null default 'default',
  number text,
  vendor_id text,
  items jsonb default '[]'::jsonb,
  net_total numeric,
  status text,
  invoice_date date,
  due_date date,
  notes text,
  terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.purchase_invoices to authenticated;
grant all on public.purchase_invoices to service_role;

-- ---------- payments ----------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null default 'default',
  invoice_id text,
  invoice_type text,
  amount numeric,
  date date,
  method text,
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;

-- ---------- accounts ----------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null default 'default',
  code text,
  name text not null,
  type text,
  kind text,
  parent_id text,
  is_system boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.accounts to authenticated;
grant all on public.accounts to service_role;

-- ---------- journal_entries ----------
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null default 'default',
  date date,
  reference text,
  reference_type text,
  reference_id text,
  description text,
  lines jsonb default '[]'::jsonb,
  idempotency_key text,
  reversal_of text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.journal_entries to authenticated;
grant all on public.journal_entries to service_role;

-- ---------- vouchers ----------
create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null default 'default',
  number text,
  type text,
  date date,
  party_name text,
  amount numeric,
  narration text,
  method text,
  reference text,
  details jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.vouchers to authenticated;
grant all on public.vouchers to service_role;

-- ---------- business_settings ----------
create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null default 'default',
  name text,
  email text,
  phone text,
  address text,
  logo text,
  currency text,
  tax_number text,
  theme text,
  vat_enabled boolean default true,
  default_vat_percentage numeric default 5,
  bank_name text,
  bank_account_number text,
  signature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_id)
);
grant select, insert, update, delete on public.business_settings to authenticated;
grant all on public.business_settings to service_role;

-- ---------- account_balances ----------
create table if not exists public.account_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null default 'default',
  account_id text not null,
  balance numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_id, account_id)
);
grant select, insert, update, delete on public.account_balances to authenticated;
grant all on public.account_balances to service_role;

-- ---------- audit_log ----------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null default 'default',
  type text,
  action text,
  target text,
  details text,
  value numeric,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
