/**
 * Print Utility Functions
 * Handles print layout, formatting, and receipt generation
 */

import { Invoice, Payment, Client, BusinessSettings, LineItem } from '@/types';
import { currencySymbols } from '@/types';

/**
 * Format number to currency string with symbol
 */
export const formatCurrencyForPrint = (amount: number, currency: string): string => {
  const symbol = currencySymbols[currency as keyof typeof currencySymbols] || '$';
  return `${symbol}${amount.toFixed(2)}`;
};

/**
 * Format date to DD/MM/YYYY format
 */
export const formatDateForPrint = (dateStr: string | Date): string => {
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
};

/**
 * Format date and time together
 */
export const formatDateTimeForPrint = (dateStr: string | Date): string => {
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    const datePart = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timePart = date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return `${datePart} ${timePart}`;
  } catch {
    return String(dateStr);
  }
};

/**
 * Convert amount to words (supports INR, OMR, and other currencies)
 */
export const convertAmountToWords = (amount: number, currency: string): string => {
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

  const isOmani = currency === 'OMR';
  const currencyName = isOmani ? 'Omani Rial' : 'Rupee';
  const subUnitName = isOmani ? 'Fils' : 'Paisa';

  const intPart = Math.floor(amount);
  const decimalPart = Math.round((amount - intPart) * 100);

  let result = '';
  if (intPart === 0) {
    result = 'Zero';
  } else {
    let temp = intPart;
    const parts: string[] = [];
    const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];
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

/**
 * Calculate invoice totals
 */
export interface InvoiceTotals {
  subtotal: number;
  vatAmount: number;
  total: number;
  currency: string;
}

export const calculateInvoiceTotals = (
  items: LineItem[],
  vatEnabled: boolean,
  defaultVatPercentage: number
): InvoiceTotals => {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = items.reduce((sum, item) => sum + (item.vatAmount || 0), 0);

  return {
    subtotal,
    vatAmount,
    total: subtotal + vatAmount,
    currency: '',
  };
};

/**
 * Generate receipt number from invoice and payment
 */
export const generateReceiptNumber = (invoiceNumber: string, paymentId: string): string => {
  return `RCP/${invoiceNumber}/${paymentId.slice(0, 8).toUpperCase()}`;
};

/**
 * Calculate payment percentage
 */
export const calculatePaymentPercentage = (paymentAmount: number, invoiceAmount: number): number => {
  if (invoiceAmount === 0) return 100;
  return (paymentAmount / invoiceAmount) * 100;
};

/**
 * Check if payment is partial
 */
export const isPartialPayment = (paymentAmount: number, invoiceAmount: number, tolerance: number = 0.01): boolean => {
  return paymentAmount < (invoiceAmount - tolerance);
};

/**
 * Get remaining balance after payment
 */
export const getRemainingBalance = (invoiceAmount: number, paymentAmount: number): number => {
  return Math.max(0, invoiceAmount - paymentAmount);
};

/**
 * Trigger browser print dialog for an element
 */
export const printElement = (element: HTMLElement, title: string = 'Document'): void => {
  const printWindow = window.open('', '', 'height=600,width=800');
  if (printWindow) {
    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => (rule as CSSRule).cssText)
            .join('\n');
        } catch {
          return '';
        }
      })
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          ${styles}
          body { margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }
};

/**
 * Export invoice as PDF (requires PDF library integration)
 * This is a placeholder - integrate with your PDF library
 */
export const exportInvoiceToPDF = async (
  invoice: Invoice,
  client: Client | undefined,
  settings: BusinessSettings,
  showDateColumn: boolean = true
): Promise<Blob> => {
  // This would integrate with a PDF library like jsPDF or pdfkit
  // For now, returning a placeholder blob
  console.warn('PDF export requires integration with a PDF library');
  return new Blob(['PDF content'], { type: 'application/pdf' });
};

/**
 * Export receipt as PDF (requires PDF library integration)
 */
export const exportReceiptToPDF = async (
  payment: Payment,
  client: Client | undefined,
  settings: BusinessSettings,
  invoiceNumber: string
): Promise<Blob> => {
  // This would integrate with a PDF library like jsPDF or pdfkit
  // For now, returning a placeholder blob
  console.warn('PDF export requires integration with a PDF library');
  return new Blob(['PDF content'], { type: 'application/pdf' });
};

/**
 * Get payment method display text
 */
export const getPaymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    cash: 'Cash Payment',
    bank: 'Bank Transfer',
    card: 'Card Payment',
    cheque: 'Cheque',
    online: 'Online Payment',
  };
  return labels[method] || method;
};

/**
 * Format item description with line breaks
 */
export const formatItemDescription = (description: string, maxLength: number = 60): string => {
  if (description.length <= maxLength) return description;
  
  const words = description.split(' ');
  let lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines.join('\n');
};

/**
 * Check if page break is needed (useful for multi-page invoices)
 */
export const shouldAddPageBreak = (itemCount: number, itemsPerPage: number = 15): boolean => {
  return itemCount > itemsPerPage;
};

/**
 * Get invoice print configuration
 */
export interface InvoicePrintConfig {
  showDateColumn: boolean;
  showVAT: boolean;
  showAccountDetails: boolean;
  showSignature: boolean;
  showTermsAndConditions: boolean;
  pageSize: 'A4' | 'A5' | 'Letter';
  marginMm: number;
}

export const getDefaultInvoicePrintConfig = (): InvoicePrintConfig => ({
  showDateColumn: true,
  showVAT: true,
  showAccountDetails: true,
  showSignature: true,
  showTermsAndConditions: true,
  pageSize: 'A4',
  marginMm: 20,
});

/**
 * Get receipt print configuration
 */
export interface ReceiptPrintConfig {
  showBankDetails: boolean;
  showCompanyLogo: boolean;
  showPaymentMethod: boolean;
  pageSize: 'A4' | 'A5' | 'A6' | 'Label';
  marginMm: number;
}

export const getDefaultReceiptPrintConfig = (): ReceiptPrintConfig => ({
  showBankDetails: true,
  showCompanyLogo: true,
  showPaymentMethod: true,
  pageSize: 'A5',
  marginMm: 15,
});
