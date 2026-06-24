-- ============================================================================
-- PHASE 1: MULTI-TENANT STRUCTURE
-- ============================================================================

-- 1. Create company_users junction table for multi-tenant access control
CREATE TABLE IF NOT EXISTS public.company_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_users TO authenticated;
GRANT ALL ON public.company_users TO service_role;

-- Enable RLS
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PHASE 2: ROW LEVEL SECURITY POLICIES FOR MULTI-TENANT DATA
-- ============================================================================

-- Helper function: Check if user has access to company
CREATE OR REPLACE FUNCTION public.user_has_company_access(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = _user_id AND company_id = _company_id
  ) OR public.has_role(_user_id, 'admin')
$$;

-- company_users RLS policies
DROP POLICY IF EXISTS "Users can view their company assignments" ON public.company_users;
CREATE POLICY "Users can view their company assignments" ON public.company_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage company users" ON public.company_users;
CREATE POLICY "Admins manage company users" ON public.company_users
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- PHASE 3: RLS POLICIES ON BUSINESS DATA TABLES
-- ============================================================================

-- CLIENTS: Users can only access clients in their assigned companies
DROP POLICY IF EXISTS "Users access own company clients" ON public.clients;
CREATE POLICY "Users access own company clients" ON public.clients
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users insert clients in own company" ON public.clients;
CREATE POLICY "Users insert clients in own company" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users update clients in own company" ON public.clients;
CREATE POLICY "Users update clients in own company" ON public.clients
  FOR UPDATE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users delete clients in own company" ON public.clients;
CREATE POLICY "Users delete clients in own company" ON public.clients
  FOR DELETE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

-- INVOICES
DROP POLICY IF EXISTS "Users access own company invoices" ON public.invoices;
CREATE POLICY "Users access own company invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users insert invoices in own company" ON public.invoices;
CREATE POLICY "Users insert invoices in own company" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users update invoices in own company" ON public.invoices;
CREATE POLICY "Users update invoices in own company" ON public.invoices
  FOR UPDATE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users delete invoices in own company" ON public.invoices;
CREATE POLICY "Users delete invoices in own company" ON public.invoices
  FOR DELETE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

-- QUOTATIONS
DROP POLICY IF EXISTS "Users access own company quotations" ON public.quotations;
CREATE POLICY "Users access own company quotations" ON public.quotations
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users insert quotations in own company" ON public.quotations;
CREATE POLICY "Users insert quotations in own company" ON public.quotations
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users update quotations in own company" ON public.quotations;
CREATE POLICY "Users update quotations in own company" ON public.quotations
  FOR UPDATE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users delete quotations in own company" ON public.quotations;
CREATE POLICY "Users delete quotations in own company" ON public.quotations
  FOR DELETE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

-- JOURNAL_ENTRIES
DROP POLICY IF EXISTS "Users access own company journal entries" ON public.journal_entries;
CREATE POLICY "Users access own company journal entries" ON public.journal_entries
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users insert journal entries in own company" ON public.journal_entries;
CREATE POLICY "Users insert journal entries in own company" ON public.journal_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users update journal entries in own company" ON public.journal_entries;
CREATE POLICY "Users update journal entries in own company" ON public.journal_entries
  FOR UPDATE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users delete journal entries in own company" ON public.journal_entries;
CREATE POLICY "Users delete journal entries in own company" ON public.journal_entries
  FOR DELETE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

-- ACCOUNTS
DROP POLICY IF EXISTS "Users access own company accounts" ON public.accounts;
CREATE POLICY "Users access own company accounts" ON public.accounts
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users insert accounts in own company" ON public.accounts;
CREATE POLICY "Users insert accounts in own company" ON public.accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users update accounts in own company" ON public.accounts;
CREATE POLICY "Users update accounts in own company" ON public.accounts
  FOR UPDATE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users delete accounts in own company" ON public.accounts;
CREATE POLICY "Users delete accounts in own company" ON public.accounts
  FOR DELETE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

-- PROJECTS
DROP POLICY IF EXISTS "Users access own company projects" ON public.projects;
CREATE POLICY "Users access own company projects" ON public.projects
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users insert projects in own company" ON public.projects;
CREATE POLICY "Users insert projects in own company" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users update projects in own company" ON public.projects;
CREATE POLICY "Users update projects in own company" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users delete projects in own company" ON public.projects;
CREATE POLICY "Users delete projects in own company" ON public.projects
  FOR DELETE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

-- BUSINESS_SETTINGS
DROP POLICY IF EXISTS "Users access own company settings" ON public.business_settings;
CREATE POLICY "Users access own company settings" ON public.business_settings
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users insert settings in own company" ON public.business_settings;
CREATE POLICY "Users insert settings in own company" ON public.business_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users update settings in own company" ON public.business_settings;
CREATE POLICY "Users update settings in own company" ON public.business_settings
  FOR UPDATE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

-- ITEMS
DROP POLICY IF EXISTS "Users access own company items" ON public.items;
CREATE POLICY "Users access own company items" ON public.items
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users insert items in own company" ON public.items;
CREATE POLICY "Users insert items in own company" ON public.items
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users update items in own company" ON public.items;
CREATE POLICY "Users update items in own company" ON public.items
  FOR UPDATE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users delete items in own company" ON public.items;
CREATE POLICY "Users delete items in own company" ON public.items
  FOR DELETE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

-- SALESMEN
DROP POLICY IF EXISTS "Users access own company salesmen" ON public.salesmen;
CREATE POLICY "Users access own company salesmen" ON public.salesmen
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users insert salesmen in own company" ON public.salesmen;
CREATE POLICY "Users insert salesmen in own company" ON public.salesmen
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users update salesmen in own company" ON public.salesmen;
CREATE POLICY "Users update salesmen in own company" ON public.salesmen
  FOR UPDATE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users delete salesmen in own company" ON public.salesmen;
CREATE POLICY "Users delete salesmen in own company" ON public.salesmen
  FOR DELETE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

-- PAYMENTS
DROP POLICY IF EXISTS "Users access own company payments" ON public.payments;
CREATE POLICY "Users access own company payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users insert payments in own company" ON public.payments;
CREATE POLICY "Users insert payments in own company" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users update payments in own company" ON public.payments;
CREATE POLICY "Users update payments in own company" ON public.payments
  FOR UPDATE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users delete payments in own company" ON public.payments;
CREATE POLICY "Users delete payments in own company" ON public.payments
  FOR DELETE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

-- PURCHASE_INVOICES
DROP POLICY IF EXISTS "Users access own company purchase invoices" ON public.purchase_invoices;
CREATE POLICY "Users access own company purchase invoices" ON public.purchase_invoices
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users insert purchase invoices in own company" ON public.purchase_invoices;
CREATE POLICY "Users insert purchase invoices in own company" ON public.purchase_invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users update purchase invoices in own company" ON public.purchase_invoices;
CREATE POLICY "Users update purchase invoices in own company" ON public.purchase_invoices
  FOR UPDATE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users delete purchase invoices in own company" ON public.purchase_invoices;
CREATE POLICY "Users delete purchase invoices in own company" ON public.purchase_invoices
  FOR DELETE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

-- VOUCHERS
DROP POLICY IF EXISTS "Users access own company vouchers" ON public.vouchers;
CREATE POLICY "Users access own company vouchers" ON public.vouchers
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users insert vouchers in own company" ON public.vouchers;
CREATE POLICY "Users insert vouchers in own company" ON public.vouchers
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users update vouchers in own company" ON public.vouchers;
CREATE POLICY "Users update vouchers in own company" ON public.vouchers
  FOR UPDATE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users delete vouchers in own company" ON public.vouchers;
CREATE POLICY "Users delete vouchers in own company" ON public.vouchers
  FOR DELETE TO authenticated
  USING (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

-- AUDIT_LOG
DROP POLICY IF EXISTS "Users access own company audit log" ON public.audit_log;
CREATE POLICY "Users access own company audit log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR 
    public.user_has_company_access(auth.uid(), company_id)
  );

DROP POLICY IF EXISTS "Users insert audit log in own company" ON public.audit_log;
CREATE POLICY "Users insert audit log in own company" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IS NOT NULL AND 
    public.user_has_company_access(auth.uid(), company_id)
  );

-- COMPANIES: Users can view companies they're assigned to
DROP POLICY IF EXISTS "Users view assigned companies" ON public.companies;
CREATE POLICY "Users view assigned companies" ON public.companies
  FOR SELECT TO authenticated
  USING (
    public.user_has_company_access(auth.uid(), id) OR 
    user_id = auth.uid()
  );

-- PROFILES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- PHASE 4: GRANT PERMISSIONS ON NEW TABLE
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_users TO authenticated;
GRANT ALL ON public.company_users TO service_role;

-- ============================================================================
-- PHASE 5: INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON public.company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON public.company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_company_id ON public.quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_id ON public.journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_company_id ON public.accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_items_company_id ON public.items(company_id);
CREATE INDEX IF NOT EXISTS idx_salesmen_company_id ON public.salesmen(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_company_id ON public.purchase_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_company_id ON public.vouchers(company_id);
CREATE INDEX IF NOT EXISTS idx_business_settings_company_id ON public.business_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_company_id ON public.audit_log(company_id);
