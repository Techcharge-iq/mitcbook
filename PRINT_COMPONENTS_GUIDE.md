# Invoice & Receipt Print Components - Production-Ready Implementation Guide

## Overview

This package provides production-ready React components for printing professional invoices and payment receipts. It includes:

- **InvoicePrint Component**: Full-featured invoice printing with optional date column
- **ReceiptPrint Component**: Payment receipt printing with invoice linkage
- **Print CSS**: Professional, print-optimized styling
- **Print Utilities**: Helper functions for formatting and calculations

## Features

✅ Professional invoice layout matching image specification
✅ Optional date column toggle
✅ Payment receipts with partial/full payment tracking
✅ Invoice number references in receipts
✅ Currency symbol support (INR, USD, EUR, GBP, OMR)
✅ Amount in words conversion
✅ VAT support
✅ Print-optimized CSS with A4 paper formatting
✅ Page break handling for multi-page documents
✅ Responsive design for mobile printing
✅ Company logo support
✅ Signature field support
✅ Bank details display
✅ SEO-friendly and accessible

## Installation

All components are already integrated into your project:

```
src/components/
  ├── InvoicePrint.tsx          # Invoice component
  ├── ReceiptPrint.tsx          # Receipt component
  ├── print-styles.css          # Professional print styles
  └── index-print.ts            # Export file

src/lib/
  └── printUtils.ts             # Utility functions
```

## Usage Examples

### 1. Basic Invoice Printing

```tsx
import { InvoicePrint } from '@/components/InvoicePrint';

function InvoicePreview() {
  const invoice = { /* your invoice data */ };
  const client = { /* your client data */ };
  const settings = { /* your business settings */ };

  return (
    <InvoicePrint
      invoice={invoice}
      client={client}
      settings={settings}
      showDateColumn={true}
      onPrint={() => console.log('Printing invoice')}
    />
  );
}
```

### 2. Invoice with Optional Date Column

```tsx
// Toggle date column based on invoice type
<InvoicePrint
  invoice={invoice}
  client={client}
  settings={settings}
  showDateColumn={invoice.invoiceType === 'project'} // Hide for project invoices
/>
```

### 3. Payment Receipt for Full Payment

```tsx
import { ReceiptPrint } from '@/components/ReceiptPrint';

function ReceiptPreview() {
  const payment = { /* your payment data */ };
  const client = { /* your client data */ };
  const settings = { /* your business settings */ };

  return (
    <ReceiptPrint
      payment={payment}
      client={client}
      settings={settings}
      invoiceNumber="INV/MDLTS/2026/001"
      invoiceAmount={1692.600}
    />
  );
}
```

### 4. Partial Payment Receipt

```tsx
// Same component automatically handles partial payments
const payment = {
  id: 'pay_123',
  amount: 500.00,        // Less than invoice total
  invoiceId: 'inv_456',
  date: new Date().toISOString(),
  method: 'bank',
  reference: 'TXN12345',
  notes: 'Partial payment received',
  invoiceType: 'sales',
  createdAt: new Date().toISOString(),
};

<ReceiptPrint
  payment={payment}
  client={client}
  settings={settings}
  invoiceNumber="INV/MDLTS/2026/001"
  invoiceAmount={1692.600}
/>
```

### 5. Using Print Utilities

```tsx
import {
  formatCurrencyForPrint,
  formatDateForPrint,
  convertAmountToWords,
  generateReceiptNumber,
  isPartialPayment,
  getRemainingBalance,
} from '@/components/index-print';

// Format currency
const formatted = formatCurrencyForPrint(1692.60, 'OMR'); // ر.ع.1692.60

// Format date
const date = formatDateForPrint('2026-06-15'); // 15/06/2026

// Convert to words
const words = convertAmountToWords(1692.60, 'OMR');
// "One Thousand Six Hundred Ninety Two Omani Rial and Sixty Fils Only"

// Generate receipt number
const receipt = generateReceiptNumber('INV/MDLTS/2026/001', 'pay_abc123');
// "RCP/INV/MDLTS/2026/001/PAY_ABC12"

// Check payment type
if (isPartialPayment(500, 1692.60)) {
  const balance = getRemainingBalance(1692.60, 500);
  console.log('Remaining:', balance); // 1192.60
}
```

## Component Props

### InvoicePrint Props

```typescript
interface InvoicePrintProps {
  invoice: Invoice;              // Invoice data
  client?: Client;               // Client/customer data
  settings: BusinessSettings;    // Business settings (company info, currency)
  showDateColumn?: boolean;      // Toggle date column (default: true)
  companyLogo?: string;          // Base64 or URL to company logo
  onPrint?: () => void;          // Callback when print button clicked
}
```

### ReceiptPrint Props

```typescript
interface ReceiptPrintProps {
  payment: Payment & { invoiceNumber?: string };  // Payment data
  client?: Client;               // Client/customer data
  settings: BusinessSettings;    // Business settings
  invoiceNumber: string;         // Invoice number for linkage
  invoiceAmount?: number;        // Total invoice amount
  companyLogo?: string;          // Base64 or URL to company logo
  onPrint?: () => void;          // Callback when print button clicked
}
```

## CSS Classes & Customization

The print styles are organized into sections:

### Invoice CSS Classes

```css
.invoice-print-container     /* Main container */
.invoice-header              /* Header section */
.invoice-metadata            /* Date/due date section */
.bill-section               /* Bill to section */
.invoice-table              /* Line items table */
.totals-section             /* Subtotal/VAT/Total */
.amount-in-words            /* Amount in words section */
.account-details            /* Bank details section */
.invoice-footer             /* Footer with signature */
```

### Receipt CSS Classes

```css
.receipt-print-container     /* Main container */
.receipt-header              /* Header section */
.receipt-metadata            /* Receipt metadata grid */
.receipt-received-from       /* Received from section */
.receipt-payment-details     /* Payment details table */
.receipt-amount-box          /* Amount box with progress */
.receipt-amount-words        /* Amount in words section */
.receipt-bank-details        /* Bank details section */
.receipt-footer              /* Footer section */
```

## Customization Guide

### 1. Change Colors

Edit `print-styles.css`:

```css
/* For invoices, change primary color from #2c3e50 to your color */
.company-name,
.section-title,
.table-header,
.total-row.total {
  color: #YOUR_COLOR;
}

/* For receipts, change primary color from #27ae60 to your color */
.receipt-title,
.receipt-badge,
.receipt-amount-box {
  background: linear-gradient(135deg, #YOUR_COLOR 0%, #DARKER_SHADE 100%);
}
```

### 2. Change Font

```css
.invoice-print-container,
.receipt-print-container {
  font-family: 'Your Font', 'Segoe UI', sans-serif;
}
```

### 3. Add Custom Logo

```tsx
<InvoicePrint
  invoice={invoice}
  client={client}
  settings={settings}
  companyLogo="data:image/png;base64,..."
/>
```

### 4. Hide Elements

```css
/* Hide date column */
.col-date {
  display: none;
}

/* Hide signature */
.signature-section {
  display: none;
}

/* Hide bank details */
.account-details {
  display: none;
}
```

## Integration with Existing Components

### In InvoiceForm.tsx

```tsx
import { InvoicePrint } from '@/components/InvoicePrint';
import { ReceiptPrint } from '@/components/ReceiptPrint';

export default function InvoiceForm() {
  const [showInvoicePrint, setShowInvoicePrint] = useState(false);
  const [showReceiptPrint, setShowReceiptPrint] = useState(false);

  return (
    <>
      {/* Existing form content */}
      <button onClick={() => setShowInvoicePrint(true)}>
        Print Invoice
      </button>

      {showInvoicePrint && (
        <InvoicePrint
          invoice={existingInvoice}
          client={client}
          settings={settings}
          showDateColumn={true}
          onPrint={() => setShowInvoicePrint(false)}
        />
      )}

      {showReceiptPrint && (
        <ReceiptPrint
          payment={payment}
          client={client}
          settings={settings}
          invoiceNumber={invoice.number}
          invoiceAmount={invoice.netTotal}
          onPrint={() => setShowReceiptPrint(false)}
        />
      )}
    </>
  );
}
```

### In PaymentsReceipts.tsx

```tsx
import { ReceiptPrint } from '@/components/ReceiptPrint';

export default function PaymentsReceipts() {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const selectedPayment = payments.find(p => p.id === selectedPaymentId);
  const relatedInvoice = invoices.find(i => i.id === selectedPayment?.invoiceId);

  return (
    <>
      {/* Payment list table */}
      <table>
        <tbody>
          {payments.map(payment => (
            <tr key={payment.id}>
              <td>{payment.amount}</td>
              <td>
                <button onClick={() => setSelectedPaymentId(payment.id)}>
                  Print Receipt
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedPayment && (
        <ReceiptPrint
          payment={selectedPayment}
          client={getClient(relatedInvoice?.clientId)}
          settings={settings}
          invoiceNumber={relatedInvoice?.number || ''}
          invoiceAmount={relatedInvoice?.netTotal}
          onPrint={() => setSelectedPaymentId(null)}
        />
      )}
    </>
  );
}
```

## Print Features

### A4 Paper Format
- 210mm × 297mm
- 20mm margins on all sides
- Proper scaling for different browsers

### Page Break Handling
```css
@media print {
  .invoice-table,
  .payment-details-table {
    page-break-inside: avoid;
  }

  .invoice-footer,
  .receipt-footer {
    page-break-inside: avoid;
  }
}
```

### Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support with print dialog

### Print Preview
Access print preview in browsers:
- **Windows**: Ctrl+P or Cmd+P
- **Mac**: Cmd+P
- **Linux**: Ctrl+P

## Performance Optimization

### Memory Usage
- Components are optimized for printing large invoices
- Styles are loaded once for multiple pages

### Render Performance
- Memoized components to prevent unnecessary re-renders
- CSS Grid for efficient layout

### Print Performance
- Optimized CSS media queries
- No heavy JavaScript during printing
- Color-adjusted for different print modes

## Accessibility

### Screen Reader Support
- Semantic HTML structure
- Proper heading hierarchy
- ARIA labels where needed

### High Contrast Mode
```css
@media print {
  /* Ensures readability in high contrast mode */
  .table-header {
    background: #000 !important;
    color: #fff !important;
  }
}
```

### Font Sizes
- Minimum 10pt for body text
- 14pt+ for headings
- Proper line spacing for readability

## Security Considerations

1. **No Sensitive Data**: Avoid storing passwords or sensitive keys
2. **Data Validation**: Validate all input data before printing
3. **User Privacy**: Consider what data is printed and stored
4. **Browser Security**: Use HTTPS in production

## Common Issues & Solutions

### Issue: Content Not Fitting on Page

**Solution**: 
```css
/* Reduce margins */
@page { margin: 0.5cm; }

/* Reduce font size */
.invoice-print-container { font-size: 10px; }

/* Hide optional columns */
.col-date { display: none; }
```

### Issue: Colors Not Printing

**Solution**: Ensure print-color-adjust is set
```css
* {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
```

### Issue: Page Breaks in Wrong Places

**Solution**: Set `page-break-inside: avoid` on specific elements
```css
.invoice-table tbody tr { page-break-inside: avoid; }
```

### Issue: Logo Not Showing

**Solution**: Use base64 data URLs or absolute URLs
```tsx
companyLogo="data:image/png;base64,iVBORw0KGgoAAAANS..."
// OR
companyLogo="https://example.com/logo.png"
```

## Future Enhancements

Possible improvements:
- [ ] PDF generation integration
- [ ] Email invoice/receipt functionality
- [ ] Multi-language support
- [ ] QR code generation for payments
- [ ] Digital signature support
- [ ] Barcode generation
- [ ] Cloud storage integration
- [ ] Print template customization UI

## Testing

### Manual Testing
1. Print preview (Ctrl+P)
2. Print to PDF
3. Physical printer testing
4. Mobile device printing
5. Different browser testing

### Visual Regression Testing
```tsx
// Use tools like Percy or Chromatic
export default {
  component: InvoicePrint,
  title: 'Components/InvoicePrint',
};

export const Default = (args) => <InvoicePrint {...args} />;
```

## Support & Documentation

For issues or questions:
1. Check CSS media queries for print-specific styles
2. Verify component props are passed correctly
3. Check browser console for JavaScript errors
4. Test with print preview before printing to paper

## License

These components are part of the Bookit application.
