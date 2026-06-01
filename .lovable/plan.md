## Fix 1: Blank PDF

**Root cause:** In `src/lib/documentUtils.ts` (`generatePDFBlob`), the hidden container is created with `position: fixed; left: -10000px` but no explicit `width`. html2canvas measures it as 0-width and renders an empty canvas, so html2pdf outputs a blank page. The HTML also has a malformed `.parties` wrapper (missing opening `<div class="parties">`, with an orphan `</div>`), which doesn't help.

**Fix (minimal, in `documentUtils.ts` only):**
- Give the off-screen container an explicit width: `container.style.width = '800px'` (matches `body { max-width: 800px }`).
- Fix the malformed parties block — add the missing `<div class="parties">` wrapper around `Bill To` so the existing layout closes cleanly.
- No layout/style redesign.

This fix applies to Sales, Purchase, and Project invoices since they all go through the same `generatePDF` helper.

## Fix 2: Invoice Date field on Sales & Purchase invoices

Add a dedicated `invoiceDate` field (separate from `createdAt`, which is the system timestamp).

**Database** (one migration):
- `ALTER TABLE public.invoices ADD COLUMN invoice_date date;`
- `ALTER TABLE public.purchase_invoices ADD COLUMN invoice_date date;`
- Backfill existing rows: `UPDATE … SET invoice_date = created_at::date WHERE invoice_date IS NULL;`

**Types** (`src/types/index.ts`):
- Add `invoiceDate: string` to `Invoice` and `PurchaseInvoice`.

**AppContext local SQLite persistence** (`src/contexts/AppContext.tsx`):
- Add `invoice_date` to the two `INSERT OR REPLACE` statements for `invoices` and `purchase_invoices`, plus the matching row-load mappers (`invoiceDate: i.invoice_date ?? i.created_at`).

**Forms:**
- `src/pages/InvoiceForm.tsx`: add `const [invoiceDate, setInvoiceDate] = useState(existingInvoice?.invoiceDate || new Date().toISOString().split('T')[0])`, render a `<Input type="date">` next to the existing Due Date input, include `invoiceDate` in both the update and create payloads.
- `src/pages/PurchaseInvoiceForm.tsx`: same change, mirroring the existing dueDate pattern.

**PDF** (`src/lib/documentUtils.ts`):
- Change the "Date:" line in the header to prefer `docData.invoiceDate` (fall back to `createdAt` so legacy records still render).

**Reports / lists:** No schema-breaking change — `invoiceDate` falls back to `createdAt`, so existing list columns and reports keep working without edits. Only the PDF and the two forms display the new field.

## Out of scope (unchanged)
- No changes to quotations, payments, journal posting, accounting logic, RLS policies, or list/report files.
- No PDF layout redesign.

## Verification
1. Open an existing Sales Invoice → click PDF → confirm it renders with header, items, totals (not blank).
2. Same for a Purchase Invoice and a Project Invoice.
3. Create a new Sales Invoice with Invoice Date = yesterday → save → reopen → date persists. Repeat for Purchase Invoice.
4. PDF shows the selected Invoice Date.

Estimated: 1 credit.