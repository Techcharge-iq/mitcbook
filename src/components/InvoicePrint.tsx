import React, { useRef } from 'react';
import { Invoice, Client, BusinessSettings, LineItem, Payment, PaymentAllocation } from '@/types';
import { currencySymbols } from '@/types';
import './print-styles.css';

interface InvoicePrintProps {
  invoice: Invoice;
  client?: Client;
  settings: BusinessSettings;
  showDateColumn?: boolean;
  companyLogo?: string;
  onPrint?: () => void;
  payments?: Payment[]; // ✅ NEW: Payment history
  allocations?: PaymentAllocation[]; // ✅ NEW: Bill-wise allocations
}

/**
 * Production-ready Invoice Print Component
 * Follows professional invoice layout with optional date column
 * ✅ UPDATED: Now shows payment allocations and outstanding balance
 */
export const InvoicePrint = React.forwardRef<HTMLDivElement, InvoicePrintProps>(
  ({
    invoice,
    client,
    settings,
    showDateColumn = true,
    companyLogo,
    onPrint,
    payments = [],
    allocations = [],
  }, ref) => {
    const printRef = useRef<HTMLDivElement>(null);
    const resolvedRef = ref || printRef;

    const currencySymbol = currencySymbols[settings.currency];

    // Calculate totals
    const subtotal = invoice.items.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = invoice.items.reduce((sum, item) => sum + (item.vatAmount || 0), 0);
    const totalAmount = invoice.netTotal;

    // ✅ Calculate payment summary
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = totalAmount - totalPaid;
    const isFullyPaid = balanceDue <= 0;
    const isPartiallyPaid = totalPaid > 0 && balanceDue > 0;

    // ✅ Format currency
    const formatCurrency = (amount: number) => {
      return `${currencySymbol}${amount.toFixed(3)}`;
    };

    // ✅ Format date
    const formatDate = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      } catch {
        return dateStr;
      }
    };

    // ✅ Get status badge color
    const getStatusColor = (status: string) => {
      const colors: Record<string, string> = {
        draft: '#6b7280',
        sent: '#3b82f6',
        paid: '#10b981',
        partial: '#f59e0b',
        overdue: '#ef4444',
        cancelled: '#6b7280',
      };
      return colors[status] || '#6b7280';
    };

    // ✅ Convert amount to words
    const amountToWords = (amount: number): string => {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
      const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

      function convertBelowThousand(n: number): string {
        if (n === 0) return '';
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) {
          const t = Math.floor(n / 10);
          const r = n % 10;
          return tens[t] + (r ? ' ' + ones[r] : '');
        }
        const h = Math.floor(n / 100);
        const rest = n % 100;
        return ones[h] + ' Hundred' + (rest ? ' ' + convertBelowThousand(rest) : '');
      }

      const intPart = Math.floor(amount);
      const decimalPart = Math.round((amount - intPart) * 100);
      const currencyName = settings.currency === 'OMR' ? 'Omani Rial' : 'Rupee';
      const subUnitName = settings.currency === 'OMR' ? 'Fils' : 'Paisa';

      let result = '';
      if (intPart === 0) {
        result = 'Zero';
      } else {
        let temp = intPart;
        const parts: string[] = [];
        const scales = ['', 'Thousand', 'Million', 'Billion'];
        let scaleIndex = 0;

        while (temp > 0) {
          const chunk = temp % 1000;
          if (chunk !== 0) {
            const chunkWords = convertBelowThousand(chunk) + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '');
            parts.unshift(chunkWords);
          }
          temp = Math.floor(temp / 1000);
          scaleIndex++;
        }
        result = parts.join(' ');
      }

      result += ' ' + currencyName;
      if (decimalPart > 0) {
        result += ' and ' + convertBelowThousand(decimalPart) + ' ' + subUnitName;
      }
      result += ' Only';

      return result;
    };

    const handlePrint = () => {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice ${invoice.number}</title>
            <link rel="stylesheet" href="${window.location.origin}/print-styles.css">
            <style>
              body { margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
              @media print {
                body { margin: 0; padding: 0; }
              }
              /* ✅ Print styles for payment sections */
              .payment-summary-print {
                page-break-inside: avoid;
                margin: 15px 0;
              }
              .payment-history-print {
                page-break-inside: avoid;
                margin: 10px 0;
              }
              .payment-history-print table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
              }
              .payment-history-print th {
                background: #f3f4f6;
                padding: 6px 10px;
                text-align: left;
                font-weight: 600;
              }
              .payment-history-print td {
                padding: 6px 10px;
                border-bottom: 1px solid #e5e7eb;
              }
              .payment-history-print .text-right {
                text-align: right;
              }
              .outstanding-box {
                background: #f8fafc;
                border-radius: 8px;
                padding: 12px 16px;
                margin: 10px 0;
                border: 1px solid #e5e7eb;
              }
              .outstanding-box .row {
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
                font-size: 14px;
              }
              .outstanding-box .row.total {
                font-weight: bold;
                border-top: 2px solid #e5e7eb;
                padding-top: 8px;
                margin-top: 4px;
              }
              .outstanding-box .row.balance-due {
                font-size: 16px;
                color: #dc2626;
              }
              .outstanding-box .row.balance-paid {
                color: #16a34a;
              }
              .status-badge {
                display: inline-block;
                padding: 2px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .status-badge.draft { background: #f3f4f6; color: #6b7280; }
              .status-badge.sent { background: #dbeafe; color: #2563eb; }
              .status-badge.paid { background: #d1fae5; color: #059669; }
              .status-badge.partial { background: #fef3c7; color: #d97706; }
              .status-badge.overdue { background: #fee2e2; color: #dc2626; }
              .status-badge.cancelled { background: #f3f4f6; color: #6b7280; }
            </style>
          </head>
          <body>
            ${(printRef.current || resolvedRef.current)?.innerHTML || ''}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
      onPrint?.();
    };

    return (
      <div>
        <div ref={resolvedRef} className="invoice-print-container">
          {/* Header */}
          <div className="invoice-header">
            <div className="header-left">
              {companyLogo || settings.logo ? (
                <img 
                  src={companyLogo || settings.logo} 
                  alt="Company Logo" 
                  className="company-logo"
                />
              ) : (
                <div className="company-logo-placeholder">{settings.name.charAt(0)}</div>
              )}
            </div>
            <div className="header-center">
              <h1 className="company-name">{settings.name}</h1>
              <p className="company-info">{settings.address}</p>
              <p className="company-contact">
                {settings.phone && <span>Phone: {settings.phone}</span>}
                {settings.phone && settings.email && <span> • </span>}
                {settings.email && <span>Email: {settings.email}</span>}
              </p>
              {settings.taxNumber && (
                <p className="tax-number">Tax Reg: {settings.taxNumber}</p>
              )}
            </div>
            <div className="header-right">
              <div className="invoice-type">TAX INVOICE</div>
              <div className="invoice-number-section">
                <div className="invoice-label">Invoice No.</div>
                <div className="invoice-number">{invoice.number}</div>
              </div>
              <div className="invoice-status">
                <span 
                  className={`status-badge ${invoice.status}`}
                >
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>

          {/* Invoice Metadata */}
          <div className="invoice-metadata">
            <div className="metadata-section">
              <div className="metadata-row">
                <span className="metadata-label">Date:</span>
                <span className="metadata-value">{formatDate(invoice.invoiceDate || invoice.createdAt)}</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Due Date:</span>
                <span className="metadata-value">{formatDate(invoice.dueDate)}</span>
              </div>
              {invoice.retentionAmount && invoice.retentionAmount > 0 && (
                <div className="metadata-row">
                  <span className="metadata-label">Retention ({invoice.retentionPercentage || 3}%):</span>
                  <span className="metadata-value">{formatCurrency(invoice.retentionAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bill To Section */}
          <div className="bill-section">
            <div className="bill-to">
              <h3 className="section-title">BILL TO</h3>
              <div className="bill-content">
                <p className="party-name"><strong>{client?.name || 'Customer'}</strong></p>
                {client?.address && <p className="party-info">{client.address}</p>}
                {client?.email && <p className="party-info">Email: {client.email}</p>}
                {client?.phone && <p className="party-info">Phone: {client.phone}</p>}
                {client?.taxRegistrationNumber && (
                  <p className="party-info">Tax Reg: {client.taxRegistrationNumber}</p>
                )}
              </div>
            </div>
            {invoice.notes && (
              <div className="notes-section">
                <h3 className="section-title">NOTES</h3>
                <p className="notes-content">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* ✅ Payment Summary Box */}
          <div className="payment-summary-print">
            <div className="outstanding-box">
              <div className="row">
                <span>Total Invoice Amount</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              {totalPaid > 0 && (
                <div className="row balance-paid">
                  <span>Total Payments Received</span>
                  <span>{formatCurrency(totalPaid)}</span>
                </div>
              )}
              <div className={`row total ${isFullyPaid ? 'balance-paid' : 'balance-due'}`}>
                <span>{isFullyPaid ? '✅ FULLY PAID' : 'BALANCE DUE'}</span>
                <span>{formatCurrency(balanceDue)}</span>
              </div>
              {isPartiallyPaid && (
                <div className="row" style={{ fontSize: '12px', color: '#6b7280', paddingTop: '4px' }}>
                  <span>Payment Status</span>
                  <span className="status-badge partial">PARTIALLY PAID</span>
                </div>
              )}
              {isFullyPaid && (
                <div className="row" style={{ fontSize: '12px', color: '#6b7280', paddingTop: '4px' }}>
                  <span>Payment Status</span>
                  <span className="status-badge paid">PAID IN FULL</span>
                </div>
              )}
            </div>
          </div>

          {/* ✅ Payment History Table */}
          {payments.length > 0 && (
            <div className="payment-history-print">
              <h4 style={{ margin: '10px 0 8px 0', fontSize: '14px', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.5px' }}>
                PAYMENT HISTORY
              </h4>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Receipt No.</th>
                    <th>Method</th>
                    <th className="text-right">Amount</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.date || payment.receiptDate || payment.createdAt)}</td>
                      <td>{payment.receiptNumber || payment.reference || '-'}</td>
                      <td>{payment.method || payment.paymentMode || '-'}</td>
                      <td className="text-right">{formatCurrency(payment.amount)}</td>
                      <td>{payment.reference || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold', borderTop: '2px solid #e5e7eb' }}>
                    <td colSpan={3}>Total Paid</td>
                    <td className="text-right">{formatCurrency(totalPaid)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ✅ Bill-wise Allocation Details */}
          {allocations.length > 0 && (
            <div className="payment-history-print" style={{ marginTop: '15px' }}>
              <h4 style={{ margin: '10px 0 8px 0', fontSize: '14px', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.5px' }}>
                BILL-WISE ALLOCATION
              </h4>
              <table>
                <thead>
                  <tr>
                    <th>Bill No.</th>
                    <th>Bill Date</th>
                    <th>Due Date</th>
                    <th className="text-right">Bill Amount</th>
                    <th className="text-right">Paid</th>
                    <th className="text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((alloc) => (
                    <tr key={alloc.id}>
                      <td>{alloc.invoiceNumber}</td>
                      <td>{formatDate(alloc.billDate)}</td>
                      <td>{formatDate(alloc.dueDate)}</td>
                      <td className="text-right">{formatCurrency(alloc.billAmount)}</td>
                      <td className="text-right">{formatCurrency(alloc.adjustedAmount)}</td>
                      <td className="text-right">{formatCurrency(alloc.outstandingAfter)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold', borderTop: '2px solid #e5e7eb' }}>
                    <td colSpan={3}>Total</td>
                    <td className="text-right">{formatCurrency(allocations.reduce((sum, a) => sum + a.billAmount, 0))}</td>
                    <td className="text-right">{formatCurrency(allocations.reduce((sum, a) => sum + a.adjustedAmount, 0))}</td>
                    <td className="text-right">{formatCurrency(allocations.reduce((sum, a) => sum + a.outstandingAfter, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Line Items Table */}
          <table className="invoice-table">
            <thead>
              <tr className="table-header">
                {showDateColumn && <th className="col-date">DATE</th>}
                <th className="col-description">DESCRIPTION</th>
                <th className="col-qty">QTY</th>
                <th className="col-rate">RATE</th>
                {settings.vatEnabled && <th className="col-vat">VAT ({settings.defaultVatPercentage || 0}%)</th>}
                <th className="col-amount">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item: LineItem, index: number) => (
                <tr key={item.id || index} className="table-row">
                  {showDateColumn && (
                    <td className="col-date">
                      {formatDate(item.itemDate || invoice.invoiceDate || invoice.createdAt)}
                    </td>
                  )}
                  <td className="col-description">
                    <div className="item-name">{item.name}</div>
                    {item.description && (
                      <div className="item-description">{item.description}</div>
                    )}
                  </td>
                  <td className="col-qty text-right">{item.quantity}</td>
                  <td className="col-rate text-right">{formatCurrency(item.rate)}</td>
                  {settings.vatEnabled && (
                    <td className="col-vat text-right">
                      {item.vatAmount ? formatCurrency(item.vatAmount) : '-'}
                    </td>
                  )}
                  <td className="col-amount text-right">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="totals-section">
            <div className="totals-left" />
            <div className="totals-right">
              <div className="total-row subtotal">
                <span className="label">Subtotal</span>
                <span className="amount">{formatCurrency(subtotal)}</span>
              </div>
              {settings.vatEnabled && (
                <div className="total-row vat">
                  <span className="label">VAT {settings.defaultVatPercentage || 0}%</span>
                  <span className="amount">{formatCurrency(vatAmount)}</span>
                </div>
              )}
              <div className="total-row total">
                <span className="label">TOTAL</span>
                <span className="amount">{formatCurrency(totalAmount)}</span>
              </div>
              {invoice.retentionAmount && invoice.retentionAmount > 0 && (
                <div className="total-row retention" style={{ color: '#f59e0b' }}>
                  <span className="label">Retention ({invoice.retentionPercentage || 3}%)</span>
                  <span className="amount">-{formatCurrency(invoice.retentionAmount)}</span>
                </div>
              )}
              {invoice.retentionAmount && invoice.retentionAmount > 0 && (
                <div className="total-row net-due" style={{ fontWeight: 'bold', borderTop: '2px solid #e5e7eb', paddingTop: '8px' }}>
                  <span className="label">Net Amount Due</span>
                  <span className="amount">{formatCurrency(totalAmount - (invoice.retentionAmount || 0))}</span>
                </div>
              )}
            </div>
          </div>

          {/* Amount in Words */}
          <div className="amount-in-words">
            <strong>Amount in Words:</strong> {amountToWords(totalAmount)}
          </div>

          {/* Account Details */}
          {settings.bankName && settings.bankAccountNumber && (
            <div className="account-details">
              <h4>ACCOUNT DETAILS</h4>
              <p><strong>Bank:</strong> {settings.bankName}</p>
              <p><strong>Account No.:</strong> {settings.bankAccountNumber}</p>
            </div>
          )}

          {/* Terms Section */}
          {invoice.terms && (
            <div className="terms-section" style={{ marginTop: '15px', padding: '10px 0', borderTop: '1px solid #e5e7eb' }}>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>Terms & Conditions</h4>
              <p style={{ fontSize: '13px', color: '#4b5563' }}>{invoice.terms}</p>
            </div>
          )}

          {/* Footer */}
          <div className="invoice-footer">
            <div className="footer-left">
              <p className="company-name-footer">{settings.name}</p>
            </div>
            <div className="footer-right">
              {settings.signature && (
                <div className="signature-section">
                  <img 
                    src={settings.signature} 
                    alt="Signature" 
                    className="signature-image"
                  />
                  <div className="signature-label">Authorized Signature</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Print Button (only shown on screen, not in print) */}
        <div className="print-button-container no-print">
          <button onClick={handlePrint} className="print-button">
            🖨️ Print Invoice
          </button>
        </div>
      </div>
    );
  }
);

InvoicePrint.displayName = 'InvoicePrint';

export default InvoicePrint;