## Goal

Harden PDF generation so it never renders empty (re-fetch latest record by ID on click), add a visible sync status indicator, and verify all key collections round-trip through the cloud.

## 1. Harden PDF — re-fetch by ID on click

**File:** `src/lib/cloudSync.ts`
- Add `cloudFetchById(collection, id)` helper using `supabase.from(table).select('*').eq('id', id).eq('user_id', uid).maybeSingle()`, returning a `fromRow`-mapped object or `null`.

**File:** `src/lib/documentUtils.ts`
- In `generatePDFBlob`, before rendering, if a `userId` session exists call `cloudFetchById` for the doc (`invoice` / `quotation`) and merge the fresh row over the in-memory `docData` (preserve `items` shape). Also re-fetch the `client` by `clientId` if missing or stale. If offline / not signed in, fall back to the passed `docData`.
- Guard: if after re-fetch `items.length === 0` AND `netTotal === 0`, throw a clear error ("Invoice has no data yet — please save first") so the caller toast surfaces it instead of producing a blank PDF.

**Files:** `src/pages/InvoiceForm.tsx`, `src/pages/QuotationForm.tsx`, and add the same flow to `src/pages/PurchaseInvoiceForm.tsx` PDF button (if present; otherwise leave as-is).
- No UI change. `handleDownloadPDF` already passes `existingInvoice`; documentUtils does the re-fetch internally so call sites stay one-line.

## 2. Sync status indicator

**New file:** `src/components/SyncStatusIndicator.tsx`
- Small badge rendered in `AppLayout` header (top-right, next to existing controls). Shows one of: `Synced` (green dot), `Saving…` (amber pulsing), `Offline` (gray), `Update received` (blue flash for 2s).
- No layout redesign — single inline pill with icon + short label, hidden on very small screens (icon-only).

**File:** `src/lib/cloudSync.ts`
- Add a tiny pub/sub: `syncBus` with `emit('saving' | 'saved' | 'error' | 'remote-update')` and `subscribe(cb)`.
- Emit `saving` at start of `cloudUpsert`/`cloudDelete`, `saved` on success, `error` on failure.

**File:** `src/hooks/useRemoteCollection.ts`
- In the realtime subscription callback, call `syncBus.emit('remote-update')` so the indicator can flash.
- Track online/offline via `navigator.onLine` + `online`/`offline` window events inside the indicator component.

**File:** `src/components/layout/AppLayout.tsx`
- Mount `<SyncStatusIndicator />` in the existing header bar. No other UI changes.

## 3. Cloud round-trip verification

No code change required if checks pass. Verification steps after build:
- Sign in on PC A, create one Project, one Sales Invoice, one Purchase Invoice, one Voucher.
- Confirm rows appear in `projects`, `invoices`, `purchase_invoices`, `vouchers` tables (via the existing realtime push from `useRemoteCollection`).
- Sign in on PC B with the same Google account, confirm the four records load on initial pull and that the indicator flashes "Update received" when PC A makes a change.

If any collection is missing, the fix is limited to adding/correcting its entry in `COLLECTIONS` inside `src/lib/cloudSync.ts` — all four are already mapped, so no schema change is expected.

## Out of scope

- PDF layout redesign
- New tables / migrations
- LAN/server reinstatement
- Auth changes

## Credit budget

Single implementation pass, ~5 file touches + 1 new component. One credit.
