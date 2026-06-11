# Fix: Invoice PDF — "TAX INVOICE" title and clean VAT totals

Scope: `src/lib/documentUtils.ts` only (the shared PDF template). No form/state changes — `InvoiceForm.tsx` already computes per-line `vatAmount` from the 5% default and the `vatEnabled` toggle correctly, and stores `netTotal = subtotal + VAT`.

## Changes in `src/lib/documentUtils.ts`

### 1. Title

In the header (`<div class="doc-type">${type}</div>`, line 196), render `"TAX INVOICE"` when `type === 'invoice'`, and keep `"QUOTATION"` otherwise. CSS `text-transform: uppercase` stays.

```ts
const docTypeLabel = isInvoice ? 'TAX INVOICE' : 'QUOTATION';
// ...
<div class="doc-type">${docTypeLabel}</div>
```

### 2. Totals block (lines 240–259)

Replace the four-row block (Subtotal / VAT / Total After VAT / Grand Total — the last two are duplicates) with three derived-from-items rows:

```ts
const subtotal = docData.items.reduce((s, i) => s + (i.total || 0), 0);
const vatAmount = docData.items.reduce(
  (s, i) => s + (i.vatApplicable ? (i.vatAmount ?? 0) : 0),
  0,
);
const grandTotal = subtotal + vatAmount;
const showVat = vatAmount > 0;
```

Rendered:

```html
<div class="totals-box">
  <div class="total-row">
    <span>Subtotal</span>
    <span>{currency}{subtotal.toFixed(3)}</span>
  </div>
  {showVat && (
    <div class="total-row">
      <span>VAT (5%)</span>
      <span>{currency}{vatAmount.toFixed(3)}</span>
    </div>
  )}
  <div class="total-row grand">
    <span>{showVat ? 'Grand Total' : 'Total'}</span>
    <span>{currency}{grandTotal.toFixed(3)}</span>
  </div>
</div>
```

Notes:
- `grandTotal` is recomputed from items in the PDF (no hardcoded value, no reliance on the stored `netTotal`). This guarantees the printed total matches whatever items the user sees.
- The line-item "Amount" column (line 234) currently adds per-line VAT into the row total, which makes column sums not equal the Subtotal. Change it back to `item.total` so column math is consistent: Subtotal = Σ Amount, VAT shown once, Grand Total = Subtotal + VAT.
- The "Amount in Words" line uses `grandTotal` (was `docData.netTotal`) so it stays in sync when VAT is toggled.

### 3. VAT-only behavior

No new state. VAT visibility is driven by `vatAmount > 0`, which is already controlled by the form's `vatEnabled` toggle:
- VAT enabled → each item carries `vatApplicable = true`, `vatPercentage = 5`, `vatAmount = total * 0.05` → row shows.
- VAT disabled → items have `vatAmount = 0` → row hidden, label switches to "Total".

### 4. Test verification (run manually after build)

- Subtotal 100 OMR with VAT on → VAT row shows `OMR 5.000`, Grand Total `OMR 105.000`.
- Subtotal 250 OMR with VAT on → VAT row shows `OMR 12.500`, Grand Total `OMR 262.500`.
- VAT off → no VAT row, Total = Subtotal.
- Open PDF preview and downloaded PDF — both render identically since they share the same HTML template.

## Out of scope

- No changes to `InvoiceForm.tsx`, `QuotationForm.tsx`, or `PurchaseInvoiceForm.tsx`. Their on-screen totals already match this PDF math (Subtotal + VAT = Grand Total).
- No DB / cloud-sync changes. `vatEnabled` continues to live on the local invoice record and gates whether items carry `vatAmount`; the PDF derives display purely from the items it receives.
- Quotation title stays "QUOTATION".
