-- =====================================================================
-- Row Level Security: each user only sees their own rows.
-- =====================================================================

-- profiles: user owns their profile row
alter table public.profiles enable row level security;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_roles: read-only for the owning user, writes go through service_role/triggers
alter table public.user_roles enable row level security;
drop policy if exists "read own roles" on public.user_roles;
create policy "read own roles" on public.user_roles
  for select to authenticated
  using (auth.uid() = user_id);

-- Generic per-table policy generator for user_id-scoped tables
do $$
declare
  t text;
  tables text[] := array[
    'companies','clients','items','salesmen','projects',
    'quotations','invoices','purchase_invoices','payments','accounts',
    'journal_entries','vouchers','business_settings','account_balances','audit_log'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I
         for all to authenticated
         using (auth.uid() = user_id)
         with check (auth.uid() = user_id)',
      t
    );
  end loop;
end$$;
