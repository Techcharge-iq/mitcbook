/**
 * EXAMPLE: Invoice & Receipt Print Integration
 * 
 * This file shows how to integrate InvoicePrint and ReceiptPrint components
 * into your existing InvoiceForm.tsx and PaymentsReceipts.tsx pages.
 * 
 * Copy and adapt these patterns to your existing components.
 */

// ============================================
// EXAMPLE 1: InvoiceForm Integration
// ============================================

import { useState, useRef } from 'react';
import { Invoice, Client, BusinessSettings } from '@/types';
import { InvoicePrint } from '@/components/InvoicePrint';
import { Button } from '@/components/ui/button';

interface InvoiceFormPrintProps {
  invoice: Invoice;
  client?: Client;
  settings: BusinessSettings;
}

export function InvoiceFormWithPrint({ invoice, client, settings }: InvoiceFormPrintProps) {
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [showDateColumn, setShowDateColumn] = useState(true);
  const invoicePrintRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (invoicePrintRef.current) {
      window.print();
    }
  };

  const handleToggleDateColumn = () => {
    setShowDateColumn(!showDateColumn);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="print-toolbar">
        <button onClick={() => setIsPrintPreviewOpen(!isPrintPreviewOpen)}>
          {isPrintPreviewOpen ? 'Hide Print Preview' : 'Show Print Preview'}
        </button>
        <button onClick={handleToggleDateColumn}>
          {showDateColumn ? 'Hide Date Column' : 'Show Date Column'}
        </button>
      </div>

      {/* Print Preview */}
      {isPrintPreviewOpen && (
        <div className="print-preview-container">
          <InvoicePrint
            ref={invoicePrintRef}
            invoice={invoice}
            client={client}
            settings={settings}
            showDateColumn={showDateColumn}
            onPrint={handlePrint}
          />
        </div>
      )}

      {/* Existing form content */}
      {/* ... */}
    </div>
  );
}

// ============================================
// EXAMPLE 2: Payment Receipt Integration
// ============================================

import { Payment } from '@/types';
import { ReceiptPrint } from '@/components/ReceiptPrint';

interface PaymentReceiptProps {
  payment: Payment;
  invoice: Invoice;
  client?: Client;
  settings: BusinessSettings;
}

export function PaymentReceiptView({
  payment,
  invoice,
  client,
  settings,
}: PaymentReceiptProps) {
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (receiptPrintRef.current) {
      window.print();
    }
  };

  const isPartial = payment.amount < invoice.netTotal;

  return (
    <div>
      <div className="payment-details">
        <h3>Payment Details</h3>
        <p>
          Amount: {payment.amount}
          {isPartial && ` (${((payment.amount / invoice.netTotal) * 100).toFixed(1)}% of invoice)`}
        </p>
        <p>Status: {isPartial ? 'Partial Payment' : 'Full Payment'}</p>
        <p>Method: {payment.method}</p>
        {payment.reference && <p>Reference: {payment.reference}</p>}
      </div>

      <button onClick={() => setIsPrintPreviewOpen(!isPrintPreviewOpen)}>
        {isPrintPreviewOpen ? 'Hide Receipt' : 'Print Receipt'}
      </button>

      {isPrintPreviewOpen && (
        <ReceiptPrint
          ref={receiptPrintRef}
          payment={payment}
          client={client}
          settings={settings}
          invoiceNumber={invoice.number}
          invoiceAmount={invoice.netTotal}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
}

// ============================================
// EXAMPLE 3: Using Print Utilities
// ============================================

import {
  formatCurrencyForPrint,
  convertAmountToWords,
  generateReceiptNumber,
  isPartialPayment,
  getRemainingBalance,
} from '@/lib/printUtils';

export function PaymentSummary({ payment, invoice, settings }: any) {
  const formatted = formatCurrencyForPrint(payment.amount, settings.currency);
  const words = convertAmountToWords(payment.amount, settings.currency);
  const receiptNum = generateReceiptNumber(invoice.number, payment.id);
  const partial = isPartialPayment(payment.amount, invoice.netTotal);
  const balance = getRemainingBalance(invoice.netTotal, payment.amount);

  return (
    <div className="payment-summary">
      <p>Payment Amount: {formatted}</p>
      <p>In Words: {words}</p>
      <p>Receipt #: {receiptNum}</p>
      {partial && <p>Remaining Balance: {formatCurrencyForPrint(balance, settings.currency)}</p>}
    </div>
  );
}

// ============================================
// EXAMPLE 4: Modal Dialog for Printing
// ============================================

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'invoice' | 'receipt';
  invoice: Invoice;
  payment?: Payment;
  client?: Client;
  settings: BusinessSettings;
}

export function PrintDialog({
  isOpen,
  onClose,
  type,
  invoice,
  payment,
  client,
  settings,
}: PrintDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write(printRef.current.innerHTML);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === 'invoice' ? 'Print Invoice' : 'Print Receipt'}
          </DialogTitle>
          <DialogDescription>
            Review the {type} before printing
          </DialogDescription>
        </DialogHeader>

        <div ref={printRef} className="bg-white p-4">
          {type === 'invoice' ? (
            <InvoicePrint
              invoice={invoice}
              client={client}
              settings={settings}
            />
          ) : (
            payment && (
              <ReceiptPrint
                payment={payment}
                client={client}
                settings={settings}
                invoiceNumber={invoice.number}
                invoiceAmount={invoice.netTotal}
              />
            )
          )}
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint}>
            🖨️ Print {type === 'invoice' ? 'Invoice' : 'Receipt'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// EXAMPLE 5: Print Settings Component
// ============================================

interface PrintSettingsProps {
  onChange: (settings: PrintSettings) => void;
}

export interface PrintSettings {
  showDateColumn: boolean;
  showVAT: boolean;
  showSignature: boolean;
  showBankDetails: boolean;
  pageSize: 'A4' | 'A5' | 'Letter';
}

export function PrintSettings({ onChange }: PrintSettingsProps) {
  const [settings, setSettings] = useState<PrintSettings>({
    showDateColumn: true,
    showVAT: true,
    showSignature: true,
    showBankDetails: true,
    pageSize: 'A4',
  });

  const handleChange = (key: keyof PrintSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onChange(newSettings);
  };

  return (
    <div className="print-settings">
      <h3>Print Settings</h3>
      
      <label>
        <input
          type="checkbox"
          checked={settings.showDateColumn}
          onChange={(e) => handleChange('showDateColumn', e.target.checked)}
        />
        Show Date Column
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.showVAT}
          onChange={(e) => handleChange('showVAT', e.target.checked)}
        />
        Show VAT
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.showSignature}
          onChange={(e) => handleChange('showSignature', e.target.checked)}
        />
        Show Signature
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.showBankDetails}
          onChange={(e) => handleChange('showBankDetails', e.target.checked)}
        />
        Show Bank Details
      </label>

      <label>
        Page Size:
        <select
          value={settings.pageSize}
          onChange={(e) => handleChange('pageSize', e.target.value)}
        >
          <option value="A4">A4</option>
          <option value="A5">A5</option>
          <option value="Letter">Letter</option>
        </select>
      </label>
    </div>
  );
}

// ============================================
// EXAMPLE 6: Batch Print Multiple Receipts
// ============================================

interface BatchPrintProps {
  invoices: Invoice[];
  payments: Payment[];
  client?: Client;
  settings: BusinessSettings;
}

export function BatchPrintReceipts({
  invoices,
  payments,
  client,
  settings,
}: BatchPrintProps) {
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);

  const handleSelectAll = () => {
    if (selectedPaymentIds.length === payments.length) {
      setSelectedPaymentIds([]);
    } else {
      setSelectedPaymentIds(payments.map((p) => p.id));
    }
  };

  const handlePrintSelected = () => {
    const selectedPayments = payments.filter((p) =>
      selectedPaymentIds.includes(p.id)
    );

    // Create a new window and print all receipts
    const printWindow = window.open('', 'print', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print Receipts</title>');
      printWindow.document.write('<link rel="stylesheet" href="/print-styles.css">');
      printWindow.document.write('</head><body>');

      selectedPayments.forEach((payment) => {
        const invoice = invoices.find((i) => i.id === payment.invoiceId);
        // Write receipt HTML for each payment
        printWindow.document.write(`
          <div style="page-break-after: always;">
            <!-- Receipt content would go here -->
          </div>
        `);
      });

      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div>
      <div>
        <label>
          <input
            type="checkbox"
            checked={selectedPaymentIds.length === payments.length}
            onChange={handleSelectAll}
          />
          Select All
        </label>
      </div>

      {payments.map((payment) => (
        <div key={payment.id}>
          <label>
            <input
              type="checkbox"
              checked={selectedPaymentIds.includes(payment.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedPaymentIds([...selectedPaymentIds, payment.id]);
                } else {
                  setSelectedPaymentIds(
                    selectedPaymentIds.filter((id) => id !== payment.id)
                  );
                }
              }}
            />
            Receipt for {payment.amount} ({payment.date})
          </label>
        </div>
      ))}

      <button
        onClick={handlePrintSelected}
        disabled={selectedPaymentIds.length === 0}
      >
        Print Selected Receipts
      </button>
    </div>
  );
}

// ============================================
// EXAMPLE 7: Export to PDF (requires library)
// ============================================

import { exportInvoiceToPDF, exportReceiptToPDF } from '@/lib/printUtils';

export async function exportInvoice(
  invoice: Invoice,
  client: Client | undefined,
  settings: BusinessSettings
) {
  try {
    const pdfBlob = await exportInvoiceToPDF(invoice, client, settings);
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${invoice.number}.pdf`;
    link.click();
  } catch (error) {
    console.error('Error exporting invoice:', error);
  }
}

export async function exportReceipt(
  payment: Payment,
  client: Client | undefined,
  settings: BusinessSettings,
  invoiceNumber: string
) {
  try {
    const pdfBlob = await exportReceiptToPDF(payment, client, settings, invoiceNumber);
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${invoiceNumber}.pdf`;
    link.click();
  } catch (error) {
    console.error('Error exporting receipt:', error);
  }
}
