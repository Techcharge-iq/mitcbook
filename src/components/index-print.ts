/**
 * Print Components & Utilities
 * Main export file for all invoice and receipt printing functionality
 */

// Components
export { InvoicePrint } from './InvoicePrint';
export { ReceiptPrint } from './ReceiptPrint';

// Styles (imported in components)
// import './print-styles.css';

// Types and utilities from printUtils
export {
  formatCurrencyForPrint,
  formatDateForPrint,
  formatDateTimeForPrint,
  convertAmountToWords,
  calculateInvoiceTotals,
  generateReceiptNumber,
  calculatePaymentPercentage,
  isPartialPayment,
  getRemainingBalance,
  printElement,
  exportInvoiceToPDF,
  exportReceiptToPDF,
  getPaymentMethodLabel,
  formatItemDescription,
  shouldAddPageBreak,
  getDefaultInvoicePrintConfig,
  getDefaultReceiptPrintConfig,
  type InvoiceTotals,
  type InvoicePrintConfig,
  type ReceiptPrintConfig,
} from '../../lib/printUtils';
