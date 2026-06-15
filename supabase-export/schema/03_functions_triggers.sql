-- =====================================================================
-- Shared functions + triggers
-- =====================================================================

-- updated_at maintenance
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- has_role: avoids RLS recursion when checked from policies
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- handle_new_user: seed profile + assign first user as admin
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _is_first boolean;
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email))
  on conflict (user_id) do nothing;

  select not exists (select 1 from public.user_roles) into _is_first;

  insert into public.user_roles (user_id, role)
  values (new.id, case when _is_first then 'admin'::public.app_role else 'user'::public.app_role end)
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Attach updated_at trigger to every table that has the column
do $$
declare
  t text;
  tables text[] := array[
    'profiles','companies','clients','items','salesmen','projects',
    'quotations','invoices','purchase_invoices','payments','accounts',
    'journal_entries','vouchers','business_settings','account_balances'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.update_updated_at_column()',
      t
    );
  end loop;
end$$;
