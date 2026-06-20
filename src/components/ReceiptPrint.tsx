import React, { useRef } from 'react';
import { Payment, Client, BusinessSettings } from '@/types';
import { currencySymbols } from '@/types';
import './print-styles.css';

interface ReceiptPrintProps {
  payment: Payment & { invoiceNumber?: string };
  client?: Client;
  settings: BusinessSettings;
  invoiceNumber: string;
  invoiceAmount?: number;
  companyLogo?: string;
  onPrint?: () => void;
}

/**
 * Production-ready Receipt Print Component
 * Displays payment receipt with invoice linkage for partial/full payments
 */
export const ReceiptPrint = React.forwardRef<HTMLDivElement, ReceiptPrintProps>(
  ({
    payment,
    client,
    settings,
    invoiceNumber,
    invoiceAmount = 0,
    companyLogo,
    onPrint,
  }, ref) => {
    const printRef = useRef<HTMLDivElement>(null);
    const resolvedRef = ref || printRef;

    const currencySymbol = currencySymbols[settings.currency];

    // Generate receipt number
    const receiptNumber = `RCP/${invoiceNumber}/${payment.id?.slice(0, 8).toUpperCase()}`;

    // Calculate payment status
    const isPartialPayment = payment.amount < (invoiceAmount || 0);
    const paymentPercentage = invoiceAmount ? (payment.amount / invoiceAmount) * 100 : 100;

    // Format currency
    const formatCurrency = (amount: number) => {
      return `${currencySymbol}${amount.toFixed(2)}`;
    };

    // Format date
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

    // Format time
    const formatTime = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      } catch {
        return '';
      }
    };

    // Convert amount to words
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
            <title>Receipt ${receiptNumber}</title>
            <link rel="stylesheet" href="${window.location.origin}/print-styles.css">
            <style>
              body { margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
              @media print {
                body { margin: 0; padding: 0; }
              }
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

    const remainingBalance = Math.max(0, (invoiceAmount || 0) - payment.amount);

    return (
      <div>
        <div ref={resolvedRef} className="receipt-print-container">
          {/* Header */}
          <div className="receipt-header">
            <div className="receipt-header-left">
              {companyLogo || settings.logo ? (
                <img 
                  src={companyLogo || settings.logo} 
                  alt="Company Logo" 
                  className="company-logo-small"
                />
              ) : (
                <div className="company-logo-placeholder-small">{settings.name.charAt(0)}</div>
              )}
            </div>
            <div className="receipt-header-center">
              <h2 className="receipt-title">PAYMENT RECEIPT</h2>
              <p className="company-name-receipt">{settings.name}</p>
              <p className="company-info-receipt">{settings.address}</p>
            </div>
            <div className="receipt-header-right">
              <div className="receipt-badge">
                {isPartialPayment ? 'PARTIAL PAYMENT' : 'FULL PAYMENT'}
              </div>
            </div>
          </div>

          {/* Receipt Metadata */}
          <div className="receipt-metadata">
            <div className="metadata-grid">
              <div className="metadata-item">
                <span className="metadata-label">Receipt No:</span>
                <span className="metadata-value receipt-number">{receiptNumber}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Invoice Ref:</span>
                <span className="metadata-value invoice-ref">{invoiceNumber}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Receipt Date:</span>
                <span className="metadata-value">{formatDate(payment.date)}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Receipt Time:</span>
                <span className="metadata-value">{formatTime(payment.date)}</span>
              </div>
            </div>
          </div>

          {/* Received From */}
          <div className="receipt-received-from">
            <h3 className="receipt-section-title">RECEIVED FROM</h3>
            <div className="received-from-content">
              <p className="party-name-receipt"><strong>{client?.name || 'Customer'}</strong></p>
              {client?.address && <p className="party-info-receipt">{client.address}</p>}
              {client?.email && <p className="party-info-receipt">Email: {client.email}</p>}
              {client?.phone && <p className="party-info-receipt">Phone: {client.phone}</p>}
            </div>
          </div>

          {/* Payment Details */}
          <div className="receipt-payment-details">
            <h3 className="receipt-section-title">PAYMENT DETAILS</h3>
            <div className="payment-details-table">
              <div className="detail-row">
                <span className="detail-label">Invoice Amount:</span>
                <span className="detail-value">{formatCurrency(invoiceAmount)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Payment Method:</span>
                <span className="detail-value payment-method">
                  {payment.method ? payment.method.charAt(0).toUpperCase() + payment.method.slice(1) : 'Not specified'}
                </span>
              </div>
              {payment.reference && (
                <div className="detail-row">
                  <span className="detail-label">Payment Reference:</span>
                  <span className="detail-value payment-reference">{payment.reference}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Notes:</span>
                <span className="detail-value">{payment.notes || 'No notes'}</span>
              </div>
            </div>
          </div>

          {/* Amount Box */}
          <div className="receipt-amount-box">
            <div className="amount-box-row">
              <span className="amount-label">Amount Received:</span>
              <span className="amount-value primary">{formatCurrency(payment.amount)}</span>
            </div>
            {isPartialPayment && (
              <>
                <div className="amount-box-row">
                  <span className="amount-label">Remaining Balance:</span>
                  <span className="amount-value balance">{formatCurrency(remainingBalance)}</span>
                </div>
                <div className="payment-percentage">
                  <div className="percentage-label">{paymentPercentage.toFixed(1)}% of invoice paid</div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Amount in Words */}
          <div className="receipt-amount-words">
            <strong>Amount in Words:</strong> {amountToWords(payment.amount)}
          </div>

          {/* Footer Notes */}
          {settings.bankName && settings.bankAccountNumber && (
            <div className="receipt-bank-details">
              <h4>BANK DETAILS</h4>
              <p><strong>Bank Name:</strong> {settings.bankName}</p>
              <p><strong>Account No.:</strong> {settings.bankAccountNumber}</p>
            </div>
          )}

          {/* Footer */}
          <div className="receipt-footer">
            <div className="footer-divider" />
            <p className="footer-text">
              Thank you for your payment. This is an electronically generated receipt and does not require a signature.
            </p>
            <p className="footer-timestamp">
              Generated on {new Date().toLocaleString('en-GB')}
            </p>
          </div>
        </div>

        {/* Print Button (only shown on screen, not in print) */}
        <div className="print-button-container no-print">
          <button onClick={handlePrint} className="print-button">
            🖨️ Print Receipt
          </button>
        </div>
      </div>
    );
  }
);

ReceiptPrint.displayName = 'ReceiptPrint';

export default ReceiptPrint;
