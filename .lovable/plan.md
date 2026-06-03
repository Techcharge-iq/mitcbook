## Root causes found

1. **Invoice printing option is missing**
   - Sales invoice form only has a **PDF** download button and no browser **Print** action.
   - The invoice list also only has edit/delete actions, so printing is only reachable after opening an invoice.

2. **PDF can still render blank**
   - Current PDF generation still depends on `html2pdf.js` capturing an off-screen DOM node. This can produce a blank page when the renderer fails to capture the hidden content reliably.
   - I will replace only the capture step with direct `html2canvas` + `jsPDF`, and validate the canvas has real size before saving.

3. **Cloud sync is not properly working**
   - The hosted backend is healthy, but the key tables have **no Data API grants** for app access, so the frontend cannot reliably read/write them even though RLS policies exist.
   - `projects` cloud mapping misses the app’s `customerId` field because the database column is `vendor_id`; this makes projects load without their selected customer on another PC.
   - Invoice/purchase invoice cloud mapping also misses some app fields (`invoiceNumberMode`, `manualInvoiceNumber`, `vatEnabled`, etc.), causing incomplete records after sync.

## Minimal implementation plan

### 1. Fix database access for cloud sync
- Add grants for auth-only business tables:
  - `projects`
  - `invoices`
  - `purchase_invoices`
  - `vouchers`
  - `clients`
  - `journal_entries`
  - and related synced tables already used by the app (`quotations`, `payments`, `accounts`, `items`, `salesmen`, `business_settings`, `companies`, `profiles`, `user_roles`)
- Keep RLS unchanged: users can only access their own rows.
- No public/anonymous data access will be added.

### 2. Correct cloud field mapping
- Update `src/lib/cloudSync.ts` only:
  - map `Project.customerId` to existing `projects.vendor_id` column so projects round-trip correctly
  - preserve existing `Project.vendorId` locally as fallback only if needed
  - map invoice/purchase fields that already exist in the database (`invoice_number_mode`, `vat_enabled`, and compatible fields)
- Keep the current localStorage cache as offline cache, but cloud remains the source for signed-in cross-PC use.

### 3. Restore invoice print option
- Update `src/pages/InvoiceForm.tsx`:
  - add a **Print** button next to the existing PDF/Share buttons for saved invoices
  - use the same freshly fetched/rendered document content as PDF, then call the browser print dialog
- Keep UI changes minimal: one small icon button/label only.

### 4. Harden PDF rendering
- Update `src/lib/documentUtils.ts`:
  - keep the existing “re-fetch by ID before rendering” behavior
  - replace the final `html2pdf.js` worker capture with explicit `html2canvas(container)` and `jsPDF.addImage(...)`
  - validate that invoice data exists, DOM rendered with non-zero dimensions, and canvas rendered with non-zero dimensions before creating a PDF
  - add a reusable print helper for invoices/quotations using the same generated HTML

### 5. Verify
- Run a targeted app check after implementation.
- Confirm:
  - invoice form shows both **Print** and **PDF** options
  - PDF generation no longer depends on the blank-prone capture path
  - synced tables are reachable by authenticated users
  - projects, sales invoices, purchase invoices, and vouchers are mapped to cloud tables and load under the same account on another PC

## Files expected to change
- `src/lib/cloudSync.ts`
- `src/lib/documentUtils.ts`
- `src/pages/InvoiceForm.tsx`
- one database migration for grants only