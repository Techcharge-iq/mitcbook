# Invoice & Quotation PDF Layout Polish

All changes are confined to `src/lib/documentUtils.ts`. No calculation, VAT, header, logo, or items-table changes.

## 1. Two-column section under header

Replace the current single-column `.parties` block (Bill To only) with a two-column grid:

```
┌──────────────────────────────┬──────────────────────────────┐
│ BILL TO                      │ NOTES                        │
│ Client name                  │ {docData.notes}              │
│ email / phone / address      │                              │
│                              │ PAYMENT TERMS  (smaller)     │
│                              │ {docData.terms}              │
└──────────────────────────────┴──────────────────────────────┘
```

- Both columns top-aligned (`align-items: start`).
- Right column hidden cleanly when both `notes` and `terms` are empty.
- Payment Terms label + body rendered at `font-size: 12px` (vs 14px for Notes body).
- Remove the existing bottom `notes-section` / `terms` blocks so content is not duplicated.
- Tighten `margin-bottom` on header (40px → 20px) and parties block (40px → 24px) to reduce whitespace.

The `notes` field already exists on `Invoice`/`Quotation` types and on the form — no schema or form changes required. Right column simply surfaces what is already saved.

## 2. Closing "Regards" block above footer

Insert directly above the existing `.footer`:

```
Regards,

{settings.name}
Authorized Signatory
```

Right-aligned, ~40px top margin, signatory line in muted color.

## 3. Amount in Words — always tracks Grand Total

Rewrite `numberToWords` with a clean thousands-based scale (Thousand / Million / Billion) so any value rounds correctly:

- `2310.000` → `Two Thousand Three Hundred Ten Omani Rials Only`
- `262.500`  → `Two Hundred Sixty Two Omani Rials and Five Hundred Fils Only`

Called with `grandTotal` (already wired) so it stays in sync with the totals box.

## 4. OMR currency formatting

Add a single formatter used everywhere a money value is printed (item rate, item amount, subtotal, VAT, grand total):

```ts
const money = (n: number) =>
  `${currencySymbol}${n.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}`;
```

- Produces `OMR 2,310.000` (comma thousands, 3-decimal fils).
- Replaces the current mix of `toLocaleString('en-IN')` (which would print `2,310.000` but inconsistently) and the bare `fmt()` helper.
- `currencySymbol` already comes from `currencySymbols[settings.currency]`; no `ر.ع` fallback is introduced.

## 5. Single-page fit

The multi-page slicing in `generatePDFBlob` stays as a safety net, but the layout tightening above (smaller header/parties margins, removal of duplicate bottom notes/terms blocks) keeps a typical 5–10 line invoice on one A4 page.

## Out of scope

- No changes to `InvoiceForm` / `PurchaseInvoiceForm` / `QuotationForm`.
- No changes to VAT math, subtotal, grand total, or items table columns.
- No new DB fields — `notes` and `terms` already persist.
