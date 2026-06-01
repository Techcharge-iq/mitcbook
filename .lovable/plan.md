## Goal

1. Remove the "Network / Multi-user (LAN)" feature entirely. All data (projects, sales, purchases, vouchers, clients, items, payments, etc.) must live in the cloud database under the signed-in user and be reachable from any PC.
2. Fix the blank PDF for sales / purchase / project invoices.

No UI redesign. Minimal, targeted edits. 1 credit.

---

## Issue 1 — Remove LAN sharing, cloud-only data

### Root cause
`useRemoteCollection` still has a LAN code path (`apiClient.ts`) and the Settings screen still exposes a "Network / Multi-user" card with `lan.mode` / `lan.serverUrl`. Dashboard also renders `LocalInstallationSetup`. The cloud sync added last turn already covers all 11 collections — so once LAN is removed, the hook becomes "localStorage + Supabase" only, which is exactly what's wanted.

### Changes
- `src/hooks/useRemoteCollection.ts` — drop the two LAN `useEffect`s (initial list + 5 s polling) and the LAN branches inside `setAndPush`. Keep Supabase pull, realtime subscribe, and per-row upsert/delete. localStorage stays as the offline cache.
- `src/pages/Settings.tsx` — delete the entire "Network / Multi-user (LAN)" card (lan state, `saveNetwork`, `testConnection`, JSX block ~lines 596-655) and the `pingServer` import.
- `src/pages/Dashboard.tsx` — remove the `<LocalInstallationSetup />` render and its import.
- `src/App.tsx` — remove the `setConflictHandler` import + call (LAN-only).
- Delete files: `src/components/LocalInstallationSetup.tsx`, `src/lib/apiClient.ts`. (Leave `server/` directory and Electron native code alone — not referenced from the React app.)
- Clean up the stale `lan.mode` / `lan.serverUrl` localStorage keys on app start (one-line cleanup in `AppContext` so existing installs don't carry orphaned settings).

### Verification
- Sign in on PC A → create a project, sales invoice, purchase invoice, voucher → confirm row in Supabase under that `user_id`.
- Sign in with same Google account on PC B → all data shows within ~2 s (realtime) and after reload.
- Settings page no longer shows the Network card; Dashboard no longer shows the LAN setup card.

---

## Issue 2 — Blank PDF (real root cause)

### Root cause
`generatePDFBlob` passes a full HTML document (`<!DOCTYPE><html><head><style>…</style></head><body>…</body></html>`) to `html2pdf().from(html, 'string')`. html2pdf wraps the string in an off-screen `<div>` and sets it as `innerHTML`. The HTML parser **strips** `<html>`, `<head>`, and `<body>` tags when assigned via `innerHTML`, which also drops the `<style>` block that lived inside `<head>`. Result: html2canvas captures an unstyled, zero-height fragment → blank page. (Same underlying cause as before; `.from(html, 'string')` did not actually fix it.)

### Fix (minimal, no layout redesign)
In `src/lib/documentUtils.ts → generatePDFBlob`:
1. Build only the **body markup** as a string (keep all existing layout/HTML exactly as-is — just drop the `<!DOCTYPE><html><head>…</head><body>` wrapper and the closing tags).
2. Move the existing `<style>…</style>` block to be the **first child of the container** (styles inside a `<div>` are honored by html2canvas).
3. Create a real off-screen `<div>` (`position: fixed; left: -10000px; top: 0; width: 800px; background: #ffffff;`), set its `innerHTML` to `style + body`, append to `document.body`, pass the **element** to `html2pdf().from(element)`, await the blob, then remove the element.
4. Keep the existing html2pdf options (`scale: 2, useCORS: true, backgroundColor: '#ffffff'`, A4 portrait, 10 mm margins).
5. Keep the existing debug log; remove it once verified.

No changes to the visual layout, the CSS, the number formatting (3-decimal OMR), the date logic, or sales/purchase/project invoice handling.

### Verification
- Create a sales invoice → click PDF → file opens with full header, party block, items table, totals (3-decimal), amount-in-words.
- Same for purchase invoice and project invoice.
- Console shows `[PDF] generating … items: N netTotal: …`.

---

## Files touched

- edit: `src/hooks/useRemoteCollection.ts`
- edit: `src/pages/Settings.tsx`
- edit: `src/pages/Dashboard.tsx`
- edit: `src/App.tsx`
- edit: `src/contexts/AppContext.tsx` (one-time `lan.*` key cleanup)
- edit: `src/lib/documentUtils.ts` (PDF container fix)
- delete: `src/components/LocalInstallationSetup.tsx`
- delete: `src/lib/apiClient.ts`

No DB migration, no schema change, no UI redesign.
