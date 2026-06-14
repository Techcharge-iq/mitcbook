# Items Management — Goods & Services

Rework the existing Items page into a two-tab module (Goods, Services), add stock movement tracking, and ensure the Unit is shown next to Quantity everywhere items appear.

## 1. Data model (`src/types/index.ts`)

Extend `Item`:
- `kind: 'goods' | 'services'` (default `'goods'`)
- `code?: string` (Item / Service Code, auto-generated `GD-0001` / `SV-0001` if blank)
- `category?: string` (Goods only)
- `minStock?: number` (replaces `reorderLevel` semantically; keep `reorderLevel` as alias for back-compat)
- `active: boolean` (Status — default `true`)

Services derive from `kind === 'services'`: `stock`, `cost`, `minStock`, `category` are ignored/hidden.

Migration: any existing item without `kind` is treated as `goods`, `active = true`.

## 2. Stock movements (derived, no new table)

Stock history per Goods item is computed on demand from existing data:

| Source | Type | Sign |
|---|---|---|
| `PurchaseInvoice.items[]` | Purchased | + qty |
| `Invoice.items[]` | Sold | − qty |
| Manual stock adjustment (new voucher-lite, optional) | Adjusted | ± qty |

Current stock = `openingStock + Σ purchased − Σ sold + Σ adjustments`. Negative values are allowed and shown in red. Inventory valuation = `currentStock × cost`.

Helper in new file `src/lib/stockLedger.ts`:
```ts
getMovements(itemId, { invoices, purchases }): Movement[]
getStockBalance(item, movements): number
getInventoryValuation(item, movements): number
```

## 3. Items page (`src/pages/ItemsList.tsx`) — full rewrite

Layout:
- Header: title + "New Goods" / "New Service" buttons (context-aware to active tab)
- `Tabs` with two triggers: **Goods**, **Services**
- Per-tab: search input, filter chip (Active/Inactive/All), totals strip

### Goods tab
Table columns: Code · Name · Category · Unit · Cost · Price · Stock · Min · Status · Actions
- Stock cell red when `< minStock` or negative
- Row click → side sheet with:
  - Edit form (all goods fields)
  - **Movements** sub-tab: chronological list (date, ref no, type badge, qty in/out, running balance)
  - Totals: Total Purchased, Total Sold, Current Stock, Inventory Value

### Services tab
Table columns: Code · Name · Unit · Price · Status · Actions
- Row click → side sheet:
  - Edit form (service fields only)
  - **Usage** sub-tab: list of quotations/invoices using this service with totals
  - Totals: Times Used, Total Sales Value

### Forms
- Goods form: Code (auto), Name, Category, Unit (combobox: PCS/KG/BOX/LTR/MTR/SET/+custom), Cost, Price, Opening Stock, Min Stock, VAT toggle/%, Active
- Service form: Code (auto), Name, Unit (combobox: Job/Hour/Visit/Service/Day/+custom), Price, VAT toggle/%, Active

## 4. Unit visibility in transactions

Quotations, Sales Invoices, Purchase Bills already render line items via `ItemPicker`. Update line rows so a read-only **Unit** cell sits between Qty and Rate, populated from the selected item:

```
[Item] [Description] [Qty] [Unit] [Rate] [Amount]
```

Files touched:
- `src/pages/QuotationForm.tsx`
- `src/pages/InvoiceForm.tsx`
- `src/pages/PurchaseInvoiceForm.tsx`
- `src/lib/documentUtils.ts` — add Unit column to the PDF items table (Qty | Unit | Rate | Amount)

Inactive items are filtered out of `ItemPicker` results; Services skip the "stock" hint.

## 5. ItemPicker (`src/components/ItemPicker.tsx`)

- Two grouped sections in the dropdown: **Goods** and **Services**
- Show `unit` next to each option
- Quick-add modal: kind selector (Goods/Service) toggles which fields appear
- Hide inactive items

## 6. Reports / consistency

- `src/pages/reports/ItemReport.tsx`: split into Goods (qty + value) and Services (usage + sales value) sections, using the new movement helpers.
- Stock balance shown anywhere uses `getStockBalance` so negatives appear consistently.

## 7. Out of scope

- No DB/schema changes; items remain in `useApp` local/cloud collection.
- No changes to VAT math, totals, or PDF header/footer beyond adding the Unit column.
- Stock adjustment voucher is optional; movements page works with purchases+sales alone.

## Files changed/added

Added:
- `src/lib/stockLedger.ts`

Modified:
- `src/types/index.ts`
- `src/pages/ItemsList.tsx` (full rewrite)
- `src/components/ItemPicker.tsx`
- `src/pages/QuotationForm.tsx`
- `src/pages/InvoiceForm.tsx`
- `src/pages/PurchaseInvoiceForm.tsx`
- `src/lib/documentUtils.ts`
- `src/pages/reports/ItemReport.tsx`
