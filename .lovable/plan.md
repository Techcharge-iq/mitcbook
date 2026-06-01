# Two-issue fix plan

## Root cause 1 — Blank PDF

`generatePDFBlob` in `src/lib/documentUtils.ts` builds a full HTML document (`<!DOCTYPE html><html><head><style>…</style></head><body>…</body></html>`) and assigns it to `container.innerHTML` of a `<div>`. The HTML parser **strips `<!DOCTYPE>`, `<html>`, `<head>`, and `<body>`** when assigning to a div's innerHTML. The `<style>` block survives but every selector is scoped to `body`/`html`/global tags that no longer exist as ancestors, and the container has no document-level layout. html2pdf.js then captures an off-screen `position: fixed` div whose computed layout collapses, producing a blank page.

The previous attempt added `width: 800px` and a white background, but the underlying problem is the wrapper: html2pdf.js needs to own the document, not us.

**Fix:** Pass the HTML as a string source to html2pdf.js. It renders the markup inside its own iframe where `<html>`, `<head>`, `<style>`, and `<body>` are honored.

```ts
const worker = html2pdf()
  .set({ margin: [10,10,10,10], filename, image: { type: 'jpeg', quality: 0.98 },
         html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
         jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } })
  .from(html, 'string')
  .toPdf();
return await worker.outputPdf('blob');
```

Remove the off-screen container code entirely. Add one `console.log` showing items count + netTotal during generation; remove once confirmed.

## Root cause 2 — Data not available on another PC

`src/contexts/AppContext.tsx` wires every collection (clients, quotations, invoices, projects, purchase_invoices, payments, vouchers, items, salesmen, journal_entries, accounts) through `useRemoteCollection`. That hook **only syncs to a self-hosted LAN Express server** (`src/lib/apiClient.ts`) and only when `localStorage.lan.mode === 'client'`. In the default (standalone) mode it falls through to `useLocalStorage` — so data lives only in that browser. Nothing ever reaches Supabase, even though the tables, RLS, and `user_id` defaults are already in place.

Settings (`business_settings`) and audit log are pure localStorage too.

**Fix:** Add Supabase as a sync backend inside `useRemoteCollection`, in addition to the existing LAN path:

- On mount, if there is a Supabase session (`supabase.auth.getSession()`), `select * from <table> where user_id = auth.uid()` and merge into localStorage state (cloud wins on conflict by `updated_at` when present, else replaces).
- On every local mutation, upsert the changed rows and delete removed rows via the Supabase client. Use the column-name map below since DB columns are snake_case and the app uses camelCase.
- Subscribe to `postgres_changes` on each table filtered by `user_id=eq.<uid>` to receive live updates from other devices.
- LocalStorage stays as the source of truth for offline use; standalone-mode users without a login keep working exactly as today.

Collection → table mapping (all exist already):
`clients→clients`, `quotations→quotations`, `invoices→invoices`, `projects→projects`, `purchaseInvoices→purchase_invoices`, `payments→payments`, `accounts→accounts`, `journalEntries→journal_entries`, `vouchers→vouchers`, `items→items`, `salesmen→salesmen`.

For `settings` (currently pure localStorage) add a small dedicated effect in `AppContext` that loads/saves the single `business_settings` row for the user. For `auditLog` we leave it local (it is large, per-device, and not user-critical across devices) — call this out so it is an explicit choice.

A tiny field-mapper module (`src/lib/cloudSync.ts`) converts each entity between camelCase ↔ snake_case for the columns shown in `<supabase-tables>`. No schema changes needed.

## Files changed

- `src/lib/documentUtils.ts` — switch to `.from(html, 'string')`, drop the off-screen container, add temporary debug log.
- `src/lib/cloudSync.ts` (new) — field mappers + helpers `loadAll`, `upsertRow`, `deleteRow`, `subscribe` per collection.
- `src/hooks/useRemoteCollection.ts` — add Supabase pull/push/realtime alongside the existing LAN code path; both can run; localStorage remains canonical.
- `src/contexts/AppContext.tsx` — load/save `business_settings` from Supabase when logged in.

## Verification

1. Create a sales invoice and a purchase invoice → click PDF → confirm header, items table, totals, amount-in-words, and notes all render. Repeat for a project invoice.
2. Console log shows the populated items array and netTotal at generation time.
3. Sign in on browser A, create a client + invoice. Sign in on browser B with the same Google account → both records appear within ~2s (realtime) and after a hard reload.
4. Toggle offline → mutations still write to localStorage and replay to Supabase on reconnect (existing localStorage path is untouched).

## Out of scope / explicit non-goals

- No UI changes, no PDF layout changes.
- `audit_log` stays local-only by design; flag for follow-up if cross-device history is wanted.
- No new tables, RLS, or migrations — schema already supports this.
