import type { Quotation, Invoice, Client, BusinessSettings } from '@/types';
import { currencySymbols } from '@/types';
import { cloudFetchById, getUserId } from '@/lib/cloudSync';

interface DocumentData {
  type: 'quotation' | 'invoice';
  document: Quotation | Invoice;
  client?: Client;
  settings: BusinessSettings;
}

// Convert number to words for amount display
function numberToWords(num: number, currency: string): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

  const isOmani = currency === 'OMR';
  const currencyUnit = isOmani ? 'Omani Rial' : 'Rupee';
  const currencyUnitPlural = isOmani ? 'Omani Rials' : 'Rupees';
  const subUnit = isOmani ? 'Fils' : 'Paise';
  const subUnitDivisor = isOmani ? 1000 : 100; // OMR uses 3 decimals (fils)

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

  const intPart = Math.floor(num);
  const decimalPart = Math.round((num - intPart) * subUnitDivisor);

  let result = '';
  if (intPart === 0) {
    result = 'Zero';
  } else {
    let temp = intPart;
    let scaleIndex = 0;
    const parts: string[] = [];
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

  result += ' ' + (intPart === 1 ? currencyUnit : currencyUnitPlural);

  if (decimalPart > 0) {
    result += ' and ' + convertBelowThousand(decimalPart) + ' ' + subUnit;
  }

  return result + ' Only';
}

// ---------------- FIXED FUNCTION ----------------
export async function generatePDF({ type, document: docData, client, settings }: DocumentData) {
  const pdfBlob = await generatePDFBlob({ type, document: docData, client, settings });

  const filename = `${type}-${docData.number}.pdf`;
  const objectUrl = window.URL.createObjectURL(pdfBlob);

  const anchor = window.document.createElement('a'); // ✅ FIXED
  anchor.href = objectUrl;
  anchor.download = filename;

  window.document.body.appendChild(anchor); // ✅ FIXED
  anchor.click();
  anchor.remove();

  window.URL.revokeObjectURL(objectUrl);
}

// ---------------- WHATSAPP ----------------
export async function shareViaWhatsApp({ type, document: docData, client, settings }: DocumentData) {
  const currencySymbol = currencySymbols[settings.currency];
  const isInvoice = type === 'invoice';

  const netTotal = docData.netTotal;

  const message = encodeURIComponent(
    `Hi ${client?.name || 'Client'},\n\n` +
    `${isInvoice ? 'Invoice' : 'Quotation'}: ${docData.number}\n` +
    `Amount: ${currencySymbol}${netTotal}\n`
  );

  const phone = client?.phone?.replace(/\D/g, '') || '';
  const url = phone
    ? `https://wa.me/${phone}?text=${message}`
    : `https://wa.me/?text=${message}`;

  window.open(url, '_blank');

  // Run PDF generation in the background so share stays user-gesture initiated
  void generatePDF({ type, document: docData, client, settings }).catch((err) => {
    console.error('PDF error:', err);
  });
}
// Helper function to generate PDF as blob
export async function generatePDFBlob({ type, document: docData, client, settings }: DocumentData) {
  // Re-fetch the latest record from the cloud so we never render stale/empty data.
  try {
    const uid = await getUserId();
    if (uid && docData?.id) {
      const collection = type === 'invoice' ? 'invoices' : 'quotations';
      const fresh = await cloudFetchById<any>(collection, docData.id);
      if (fresh) {
        docData = { ...docData, ...fresh } as any;
      }
      if ((!client || client.id !== (docData as any).clientId) && (docData as any).clientId) {
        const freshClient = await cloudFetchById<Client>('clients', (docData as any).clientId);
        if (freshClient) client = freshClient;
      }
    }
  } catch (e) {
    console.warn('[PDF] re-fetch failed, using in-memory data:', e);
  }

  if ((!docData?.items || docData.items.length === 0) && (!docData?.netTotal || docData.netTotal === 0)) {
    throw new Error('This document has no data yet. Please save it first, then download the PDF.');
  }

  const currencySymbol = currencySymbols[settings.currency];
  const isInvoice = type === 'invoice';
  const invoice = isInvoice ? (docData as Invoice) : null;
  const docTypeLabel = isInvoice ? 'TAX INVOICE' : 'QUOTATION';
  const subtotal = docData.items.reduce((s, i) => s + (i.total || 0), 0);
  const vatEnabledFlag = (docData as any).vatEnabled !== false; // default on
  const vatRate = vatEnabledFlag ? (settings.defaultVatPercentage ?? 5) : 0;
  const vatAmount = +(subtotal * vatRate / 100).toFixed(3);
  const grandTotal = +(subtotal + vatAmount).toFixed(3);
  const showVat = vatAmount > 0;
  const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  const styleHtml = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      .pdf-root {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 0;
        color: #1a1a2e;
        width: 800px;
        background: #ffffff;
      }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
      .logo-section { display: flex; align-items: center; gap: 16px; }
      .logo { width: 110px; height: 110px; object-fit: contain; }
      .business-name { font-size: 24px; font-weight: bold; color: #3b82f6; }
      .doc-info { text-align: right; }
      .doc-type { font-size: 28px; font-weight: bold; text-transform: uppercase; color: ${isInvoice ? '#10b981' : '#3b82f6'}; }
      .doc-number { font-size: 14px; color: #6b7280; margin-top: 4px; }
      .doc-date { font-size: 14px; color: #6b7280; }
      .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
      .party-section h3 { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; letter-spacing: 0.5px; }
      .party-name { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
      .party-details { font-size: 14px; color: #4b5563; line-height: 1.6; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      th { background: #f3f4f6; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; }
      th:last-child { text-align: right; }
      td { padding: 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
      td:last-child { text-align: right; }
      .item-name { font-weight: 500; }
      .item-desc { font-size: 13px; color: #6b7280; margin-top: 2px; }
      .totals { display: flex; justify-content: flex-end; margin-bottom: 40px; }
      .totals-box { width: 280px; background: #f8fafc; border-radius: 8px; padding: 20px; }
      .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
      .total-row.grand { font-size: 20px; font-weight: bold; border-top: 2px solid #e5e7eb; margin-top: 8px; padding-top: 16px; color: #1a1a2e; }
      .amount-in-words { margin-bottom: 30px; padding: 15px; background: #fafbfc; border-radius: 8px; }
      .amount-in-words p { font-size: 13px; color: #4b5563; line-height: 1.6; }
      .notes-section { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
      .notes-section h4 { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
      .notes-section p { font-size: 14px; color: #4b5563; line-height: 1.6; }
      .footer { text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
    </style>
  `;

  const bodyHtml = `
    <div class="pdf-root">
      <div class="header">
        <div class="logo-section">
          ${settings.logo ? `<img src="${settings.logo}" class="logo" alt="Logo">` : ''}
          <div>
            <div class="business-name">${settings.name || 'Your Business'}</div>
            <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">
              ${settings.email || ''}
              ${settings.phone ? ` • ${settings.phone}<br>` : ''}
              ${settings.address ? `${settings.address}<br>` : ''}
              ${settings.taxNumber ? `GST: ${settings.taxNumber}` : ''}
            </div>
          </div>
        </div>
        <div class="doc-info">
          <div class="doc-type">${docTypeLabel}</div>
          <div class="doc-number">${docData.number}</div>
          <div class="doc-date">Date: ${new Date((isInvoice && invoice?.invoiceDate) ? invoice.invoiceDate : (docData as any).invoiceDate || docData.createdAt).toLocaleDateString('en-IN')}</div>
          ${isInvoice && invoice?.dueDate ? `<div class="doc-date">Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</div>` : ''}
        </div>
      </div>
      <div class="parties">
        <div class="party-section">
          <h3>Bill To</h3>
          <div class="party-name">${client?.name || 'Client'}</div>
          <div class="party-details">
            ${client?.email ? `${client.email}<br>` : ''}
            ${client?.phone ? `${client.phone}<br>` : ''}
            ${client?.address || ''}
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 50px;">S.No</th>
            <th>Description</th>
            <th style="width: 80px;">Qty</th>
            <th style="width: 120px;">Rate</th>
            <th style="width: 120px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${docData.items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>
                <div class="item-name">${item.name}</div>
                ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
              </td>
              <td>${item.quantity}</td>
              <td>${currencySymbol}${item.rate.toLocaleString('en-IN')}</td>
              <td>${currencySymbol}${fmt(item.total || 0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-box">
          <div class="total-row">
            <span>Subtotal</span>
            <span>${currencySymbol}${fmt(subtotal)}</span>
          </div>
          ${showVat ? `
          <div class="total-row">
            <span>VAT (${vatRate}%)</span>
            <span>${currencySymbol}${fmt(vatAmount)}</span>
          </div>` : ''}
          <div class="total-row grand">
            <span>${showVat ? 'Grand Total' : 'Total'}</span>
            <span>${currencySymbol}${fmt(grandTotal)}</span>
          </div>
        </div>
      </div>

      <div class="amount-in-words">
        <p><strong>Amount in Words:</strong> ${numberToWords(grandTotal, settings.currency)}</p>
      </div>


      ${(settings.bankName || settings.bankAccountNumber) ? `
        <div class="notes-section">
          <h4>Account Details</h4>
          <p>
            ${settings.bankName ? `<strong>Bank:</strong> ${settings.bankName}<br>` : ''}
            ${settings.bankAccountNumber ? `<strong>Account No:</strong> ${settings.bankAccountNumber}` : ''}
          </p>
        </div>
      ` : ''}

      ${docData.notes ? `
        <div class="notes-section">
          <h4>Notes</h4>
          <p>${docData.notes}</p>
        </div>
      ` : ''}

      ${docData.terms ? `
        <div class="notes-section">
          <h4>Terms & Conditions</h4>
          <p>${docData.terms}</p>
        </div>
      ` : ''}

      <div class="footer">Thank you for your business!</div>
    </div>
  `;

  console.log('[PDF] generating', type, docData.number, 'items:', docData.items?.length ?? 0, 'netTotal:', docData.netTotal);

  const container = window.document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.background = '#ffffff';
  container.innerHTML = styleHtml + bodyHtml;
  window.document.body.appendChild(container);

  // Ensure layout settles and any logo image loads before snapshot
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if ((img as HTMLImageElement).complete) return resolve();
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
  );

  try {
    if (!container.offsetWidth || !container.offsetHeight) {
      throw new Error('PDF content failed to render. Try again.');
    }

    const [{ default: html2canvas }, jsPDFModule] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    const JsPDF = (jsPDFModule as any).jsPDF ?? (jsPDFModule as any).default;

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: container.scrollWidth,
      windowHeight: container.scrollHeight,
    });

    if (!canvas.width || !canvas.height) {
      throw new Error('PDF canvas was empty. Try again.');
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * usableWidth) / canvas.width;

    if (imgHeight <= pageHeight - margin * 2) {
      pdf.addImage(imgData, 'JPEG', margin, margin, usableWidth, imgHeight);
    } else {
      // Multi-page: slice the canvas vertically
      const pageContentHeightPx = ((pageHeight - margin * 2) * canvas.width) / usableWidth;
      let renderedPx = 0;
      let pageIndex = 0;
      while (renderedPx < canvas.height) {
        const sliceHeightPx = Math.min(pageContentHeightPx, canvas.height - renderedPx);
        const sliceCanvas = window.document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context unavailable');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
        const sliceHeightMm = (sliceHeightPx * usableWidth) / canvas.width;
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(sliceData, 'JPEG', margin, margin, usableWidth, sliceHeightMm);
        renderedPx += sliceHeightPx;
        pageIndex++;
      }
    }

    return pdf.output('blob');
  } finally {
    container.remove();
  }
}

// ---------------- PRINT ----------------
export async function printDocument({ type, document: docData, client, settings }: DocumentData) {
  const pdfBlob = await generatePDFBlob({ type, document: docData, client, settings });
  const objectUrl = window.URL.createObjectURL(pdfBlob);
  const iframe = window.document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = objectUrl;
  window.document.body.appendChild(iframe);
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('[print] failed:', e);
    }
    // Cleanup later — give the print dialog time to open.
    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
      iframe.remove();
    }, 60_000);
  };
}
