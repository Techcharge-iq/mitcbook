# Fix: VAT must use the invoice-level toggle, not per-item flags

## Root cause

`InvoiceForm` (and `PurchaseInvoiceForm`) computes VAT as `Σ item.vatAmount` where each `item.vatAmount` is only set when `item.vatApplicable === true`. New rows added via the "Add item" button default to `vatApplicable: false`, so even with the **VAT Enabled** toggle on, those rows contribute zero VAT. Same logic flows into the PDF, so the PDF shows no VAT row.

The user-visible contract is simpler: **"VAT enabled → apply 5% to the subtotal, full stop."** Per-line VAT flags are an internal detail.

## Fix

### 1. `src/pages/InvoiceForm.tsx`

Replace the per-item VAT sum with a global derivation:

```ts
const vatRate = vatEnabled ? (settings.defaultVatPercentage ?? 5) : 0;
const subtotal = useMemo(() => items.reduce((s, i) => s + (i.total || 0), 0), [items]);
const vatTotal = useMemo(() => +(subtotal * vatRate / 100).toFixed(3), [subtotal, vatRate]);
const grandTotal = +(subtotal + vatTotal).toFixed(3);
```

(Replaces lines 81–83. `netTotal` references in the file that refer to "subtotal" get renamed; references that meant "grand total" use `grandTotal`. No behavior change on save — `netTotal` persisted on the invoice already meant `grandTotal`.)

Also when saving, also persist a `vatAmount` field on the invoice so the PDF can render reliably even when the cloud round-trip drops the toggle flag.

### 2. `src/pages/PurchaseInvoiceForm.tsx`

Same swap — global `subtotal × rate / 100` instead of summing item VAT.

### 3. `src/lib/documentUtils.ts`

Derive VAT identically and ignore per-item flags:

```ts
const subtotal = docData.items.reduce((s, i) => s + (i.total || 0), 0);
const vatEnabled = (docData as any).vatEnabled !== false; // default true
const vatRate = vatEnabled ? (settings.defaultVatPercentage ?? 5) : 0;
const vatAmount = +(subtotal * vatRate / 100).toFixed(3);
const grandTotal = +(subtotal + vatAmount).toFixed(3);
const showVat = vatAmount > 0;
```

The "VAT (5%)" label uses `vatRate` dynamically: `VAT (${vatRate}%)`.

### 4. Verification

- Add a blank invoice line, type `quantity=1`, `rate=100`, VAT toggle on, defaultVatPercentage=5 → on-screen totals: Subtotal 100, VAT 5.000, Grand Total 105.000. PDF matches.
- Change quantity to 2.5 → Subtotal 250, VAT 12.500, Grand Total 262.500. Both screens match instantly.
- Toggle VAT off → VAT row disappears on screen and in PDF; Total = Subtotal.
- Toggle VAT back on → reappears with same values.

## Out of scope

- No DB migration. The existing `vatEnabled` flag on the local invoice/quotation/purchase invoice record is the source of truth; PDF defaults to "VAT on" if the flag is missing after a cloud reload (matches the app default).
- Per-item `vatApplicable` / `vatPercentage` / `vatAmount` fields remain on `LineItem` for backward compatibility but are no longer used to compute totals.
- No UI redesign — only the totals math and the PDF totals block change.
