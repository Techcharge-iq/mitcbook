
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vouchers          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salesmen          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles          TO authenticated;
GRANT SELECT                          ON public.user_roles       TO authenticated;
GRANT SELECT, INSERT                  ON public.audit_log        TO authenticated;

GRANT ALL ON
  public.clients, public.quotations, public.invoices, public.projects,
  public.purchase_invoices, public.payments, public.accounts,
  public.journal_entries, public.vouchers, public.items, public.salesmen,
  public.companies, public.business_settings, public.profiles,
  public.user_roles, public.audit_log
TO service_role;
