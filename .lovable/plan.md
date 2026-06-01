## Goal
Display all monetary amounts with 3 decimal places (e.g. `1.000`) to match Omani Rial conventions. Percentages stay at 2 decimals.

## Approach
Introduce a single shared formatter and use it across the app, instead of hand-tweaking ~50 call sites with `toLocaleString('en-IN', { minimumFractionDigits: 2 })` and `toFixed(2)`.

### New file
- `src/lib/format.ts`
  - `MONEY_DECIMALS = 3`
  - `formatMoney(n: number)` → `n.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })`
  - `formatMoneyWithSymbol(n, symbol)` helper
  - `toMoneyFixed(n)` → `n.toFixed(3)` (for CSV exports / raw strings)

### Edits (replace inline 2-decimal money formatting with the helpers)
Currency/amount sites only — percentages (`%`) keep `toFixed(2)`:
- `src/lib/documentUtils.ts` (PDF/print totals, lines 307, 317, 321, 325, 329)
- `src/pages/Dashboard.tsx` (formatCurrency: change maximumFractionDigits to 3 and add minimumFractionDigits 3)
- `src/pages/InvoiceForm.tsx` (line totals, subtotal, VAT, grand total, project summary money fields — not the `%` ones)
- `src/pages/InvoicesList.tsx` (any money formatting present)
- `src/pages/QuotationForm.tsx` + `QuotationsList.tsx` (same patterns)
- `src/pages/PurchaseInvoiceForm.tsx` + `PurchaseInvoicesList.tsx`
- `src/pages/PaymentForm.tsx` + `PaymentsReceipts.tsx`
- `src/pages/ProjectsList.tsx` (money columns; leave `%` lines)
- `src/pages/ProjectForm.tsx` (totalActivityValue; leave `%`; also change activity value rounding from `toFixed(2)` → `toFixed(3)`)
- `src/pages/AccountStatement.tsx` (debit/credit/running balance display + CSV export)
- `src/pages/ClientStatement.tsx`
- `src/pages/ChartOfAccounts.tsx` (if it shows balances)
- `src/pages/VoucherDashboard.tsx`, `ExpensesVoucher.tsx`, `ContraVoucher.tsx`, `JournalVoucher.tsx`, `LoanGivenVoucher.tsx`, `LoanReceivedVoucher.tsx` (amount displays)
- `src/pages/reports/VatReturn.tsx`, `TrialBalance.tsx`, `BalanceSheet.tsx`, `ProfitAndLoss.tsx`, `AgingReport.tsx`, `ItemReport.tsx`, `SalesBySalesman.tsx` (amount cells + CSV exports)
- `src/pages/ItemsList.tsx` (price/cost columns)
- `src/components/ItemPicker.tsx` (price display, if formatted)

### Out of scope
- Stored data and calculations stay as JS numbers — only display formatting changes.
- Percentages remain at 2 decimals.
- No schema or settings changes; this is global to match OMR convention.
- No other features touched.

### Verification
Open Dashboard, an Invoice, a Quotation, and Account Statement in preview; confirm amounts render like `1.000` / `1,234.500`, percentages still show `12.50%`.

Estimated: 1 credit.
