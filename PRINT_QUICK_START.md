# Quick Start: Integrating Print Components

## 🚀 Immediate Integration Steps (5 minutes)

### Step 1: Add Print Components to InvoiceForm

Open `src/pages/InvoiceForm.tsx` and add:

```tsx
import { InvoicePrint } from '@/components/InvoicePrint';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

// In your component:
const [showInvoicePrint, setShowInvoicePrint] = useState(false);

// In your JSX:
<Button 
  onClick={() => setShowInvoicePrint(!showInvoicePrint)}
  variant="outline"
>
  <Printer className="w-4 h-4 mr-2" />
  {showInvoicePrint ? 'Hide Preview' : 'Print Preview'}
</Button>

{showInvoicePrint && (
  <div className="mt-6 p-4 bg-white border rounded-lg">
    <InvoicePrint
      invoice={existingInvoice}
      client={client}
      settings={settings}
      showDateColumn={true}
    />
  </div>
)}
```

### Step 2: Add Print Components to PaymentsReceipts

Open `src/pages/PaymentsReceipts.tsx` and add:

```tsx
import { ReceiptPrint } from '@/components/ReceiptPrint';
import { Button } from '@/components/ui/button';

// In your payment row:
const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

// In your table:
<td>
  <Button 
    size="sm"
    onClick={() => setSelectedPaymentId(payment.id)}
  >
    Print Receipt
  </Button>
</td>

// Add modal/dialog:
{selectedPaymentId && (
  <ReceiptPrint
    payment={payments.find(p => p.id === selectedPaymentId)!}
    client={client}
    settings={settings}
    invoiceNumber={invoice.number}
    invoiceAmount={invoice.netTotal}
    onPrint={() => setSelectedPaymentId(null)}
  />
)}
```

### Step 3: Ensure CSS is Loaded

The `print-styles.css` is imported in both components automatically.

### Step 4: Update Your Business Settings

Add to BusinessSettings if not already present:
```tsx
{
  bankName: "Bank Moscat",
  bankAccountNumber: "31160968845840018",
  signature: null, // Optional: base64 encoded signature image
}
```

## 🎨 Customization (Optional)

### Change Invoice Color Scheme

In `src/components/print-styles.css`, search for `.invoice-header` and change colors:

```css
/* Change from #2c3e50 (dark blue) to your brand color */
.invoice-header,
.company-name,
.table-header,
.total-row.total {
  background: #YOUR_COLOR !important;
  color: white;
}
```

### Change Receipt Color Scheme

Search for `.receipt-header` and modify:

```css
/* Change from #27ae60 (green) to your brand color */
.receipt-header,
.receipt-title,
.receipt-badge,
.receipt-amount-box {
  background: linear-gradient(135deg, #YOUR_COLOR, #DARKER_SHADE) !important;
}
```

### Add Company Logo

```tsx
// Get logo from settings
const logo = settings.logo; // Base64 or URL

<InvoicePrint
  invoice={invoice}
  client={client}
  settings={settings}
  companyLogo={logo}
/>
```

## ✅ Testing

### Test Invoice Printing
1. Open invoice form
2. Click "Print Preview"
3. Click "🖨️ Print Invoice" button
4. Select printer or "Print to PDF"
5. Verify layout and data accuracy

### Test Receipt Printing
1. Navigate to Payments/Receipts
2. Click "Print Receipt" on a payment
3. Verify invoice reference (e.g., INV/MDLTS/2026/001)
4. For partial payments, check progress bar shows correct percentage
5. Click "🖨️ Print Receipt" button

### Print Preview Shortcut
In any print preview: Press `Ctrl+P` (or `Cmd+P` on Mac) to access native print dialog

## 📋 Verification Checklist

Before deploying, verify:

- [ ] Components import without errors
- [ ] Print preview displays correctly (layout looks like image)
- [ ] Date column can be toggled on/off
- [ ] Receipt links back to invoice number
- [ ] Partial payments show percentage and remaining balance
- [ ] Currency symbols display (₹, ر.ع., $, etc.)
- [ ] Amount in words shows correctly
- [ ] Print to PDF works
- [ ] Signature displays (if uploaded)
- [ ] Bank details display (if configured)

## 🔧 Troubleshooting

### Print Preview Not Showing
```tsx
// Ensure state update triggers re-render
const [showPrint, setShowPrint] = useState(false);

// Use key prop to force re-render if needed
<InvoicePrint key={invoice.id} {...props} />
```

### Styling Not Applied
```tsx
// Ensure CSS is imported at component level
import './print-styles.css'; // Add this if missing
```

### Currency Not Showing
```tsx
// Verify settings.currency is one of: INR, USD, EUR, GBP, OMR
console.log('Currency:', settings.currency);
```

### Logo Not Displaying
```tsx
// Use base64 data URL
const base64Logo = 'data:image/png;base64,iVBORw0KGgoAAAA...';

// OR use direct URL (must support CORS)
<InvoicePrint companyLogo="https://example.com/logo.png" {...props} />
```

## 📚 Additional Resources

- Full Guide: See `PRINT_COMPONENTS_GUIDE.md`
- Code Examples: See `PRINT_COMPONENTS_EXAMPLES.tsx`
- Print Utilities: Import from `@/lib/printUtils`

## 💡 Pro Tips

1. **Toolbar Button**: Add print preview toggle to invoice toolbar
2. **Shortcut**: Users can press `Ctrl+P` in preview for quick print
3. **Mobile**: Preview works on mobile but printing depends on device support
4. **PDF Export**: Can integrate jsPDF/html2pdf later for true PDF generation
5. **Batch Print**: See example in `PRINT_COMPONENTS_EXAMPLES.tsx` for printing multiple receipts

## 🚨 Common Issues & Fixes

### Issue: Page Breaks Happen Mid-Table
**Fix**: Reduce font size or hide optional columns
```css
@media print {
  .invoice-print-container { font-size: 10px; }
  .col-date { display: none; }
}
```

### Issue: Colors Not Printing
**Fix**: Ensure color-adjust is set (already in CSS)
```css
* {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
```

### Issue: Receipt Number Showing Random ID
**Fix**: Verify `invoiceNumber` prop is passed correctly
```tsx
<ReceiptPrint
  payment={payment}
  invoiceNumber={invoice.number} // Must be string like "INV/MDLTS/2026/001"
  {...props}
/>
```

## 🎯 Next Phase (Optional Enhancements)

- [ ] Add PDF export button (integrate jsPDF library)
- [ ] Add email receipt functionality
- [ ] Add QR code to receipt linking to invoice
- [ ] Add print template customization UI
- [ ] Add batch receipt printing
- [ ] Add receipt archive/history view

---

**Ready to integrate? Start with Step 1 above!** 🚀
