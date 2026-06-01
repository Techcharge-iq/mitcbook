ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_date date;
ALTER TABLE public.purchase_invoices ADD COLUMN IF NOT EXISTS invoice_date date;
UPDATE public.invoices SET invoice_date = created_at::date WHERE invoice_date IS NULL;
UPDATE public.purchase_invoices SET invoice_date = created_at::date WHERE invoice_date IS NULL;