/**
 * Printer Utilities for POS System
 * Handles receipt generation and printing for ESC/POS thermal printers
 */

interface OrderItem {
  itemName: string;
  netWeightKg: number;
  pricePerKg: number;
  finalTotal: number;
  itemDiscountPercent?: number;
  unitType?: string;
  // Box details
  boxCount?: number;
  boxWeightKg?: number; // Total box weight deduction
  boxWeightPerBoxKg?: number;
}

interface Order {
  orderNumber: string;
  createdAt: string;
  cashierName?: string;
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  changeGiven?: number;
  items: OrderItem[];
  // Credit balance tracking
  customerPreviousBalance?: number;
  creditUsed?: number;
  amountPaid?: number;
  remainingBalance?: number;
  paidToAdmin?: number;
  paidToOldOrders?: number;
  adminCredit?: number;
  orderCredit?: number;
}

interface PrinterSettings {
  printerType: string;
  paperWidth: number;
  autoPrint: boolean;
  printCopies: number;
  receiptHeader: string | null;
  receiptFooter: string | null;
  showLogo: boolean;
  showBarcode: boolean;
  logoUrl?: string | null;
}

interface BusinessSettings {
  businessName: string;
  address?: string;
  phone?: string;
  email?: string;
}

/**
 * Generate receipt content as plain text for thermal printing
 */
export function generateReceiptText(
  order: Order,
  business: BusinessSettings,
  settings: PrinterSettings
): string {
  const width = settings.paperWidth === 58 ? 32 : 48;
  const lines: string[] = [];
  const printTime = new Date().toLocaleString();

  // Helper functions
  const center = (text: string) => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  };

  const line = (char: string = '=') => char.repeat(width);

  const row = (left: string, right: string) => {
    const spaces = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(spaces) + right;
  };

  // Logo placeholder
  if (settings.showLogo && settings.logoUrl) {
    lines.push(center('[LOGO]'));
    lines.push('');
  }

  // Business header
  lines.push(center(business.businessName.toUpperCase()));
  if (business.address) lines.push(center(business.address));
  if (business.phone) lines.push(center(`Tel: ${business.phone}`));
  if (business.email) lines.push(center(business.email));

  if (settings.receiptHeader) {
    lines.push('');
    settings.receiptHeader.split('\n').forEach(l => lines.push(center(l.trim())));
  }

  lines.push(line());

  // Order details
  lines.push(row('Order #:', order.orderNumber));
  lines.push(row('Date:', new Date(order.createdAt).toLocaleString()));
  lines.push(row('Printed:', printTime));
  if (order.cashierName) lines.push(row('Cashier:', order.cashierName));
  if (order.customerName) lines.push(row('Customer:', order.customerName));
  if (order.customerPhone) lines.push(row('Phone:', order.customerPhone));

  lines.push(line());

  // Items
  lines.push(center('ITEMS'));
  lines.push(line('-'));

  order.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.itemName}`);

    const unit = item.unitType === 'unit' ? 'units' : 'KG';
    const qty = `${item.netWeightKg.toFixed(3)} ${unit}`;
    const price = `@ ${item.pricePerKg.toFixed(2)}`;
    lines.push(row(`   ${qty} ${price}`, ''));

    // Box details
    if (item.boxCount && item.boxCount > 0) {
      lines.push(`   - Box Deduction: ${item.boxCount} x ${item.boxWeightPerBoxKg?.toFixed(3) || 0}kg`);
      lines.push(`     (Total: -${item.boxWeightKg?.toFixed(3) || 0} kg)`);
    }

    if (item.itemDiscountPercent && item.itemDiscountPercent > 0) {
      lines.push(row(`   Discount (${item.itemDiscountPercent}%):`, `-${(item.finalTotal * item.itemDiscountPercent / 100).toFixed(2)}`));
    }

    lines.push(row(`   Total:`, `${item.finalTotal.toFixed(2)}`));
    lines.push('');
  });

  lines.push(line());

  // Totals
  if (order.customerPreviousBalance && order.customerPreviousBalance > 0) {
    lines.push(row('Previous Balance:', `LKR ${order.customerPreviousBalance.toFixed(2)}`));
    if (order.adminCredit && order.adminCredit > 0) {
      lines.push(row('  - Admin Credit:', `LKR ${order.adminCredit.toFixed(2)}`));
    }
    if (order.orderCredit && order.orderCredit > 0) {
      lines.push(row('  - Old Orders:', `LKR ${order.orderCredit.toFixed(2)}`));
    }
    lines.push(line('-'));
  }

  lines.push(row('Current Order Subtotal:', `LKR ${order.subtotal.toFixed(2)}`));
  if (order.discountAmount > 0) {
    lines.push(row('Discount:', `-LKR ${order.discountAmount.toFixed(2)}`));
  }
  lines.push(row('Current Order Total:', `LKR ${order.total.toFixed(2)}`));

  if (order.customerPreviousBalance && order.customerPreviousBalance > 0) {
    lines.push(line('-'));
    const totalDue = order.customerPreviousBalance + order.total;
    lines.push(row('TOTAL DUE:', `LKR ${totalDue.toFixed(2)}`));
  } else {
    lines.push(line('-'));
    lines.push(row('TOTAL:', `LKR ${order.total.toFixed(2)}`));
  }

  lines.push(line('='));

  // Payment breakdown
  const totalPayment = (order.paidToAdmin || 0) + (order.paidToOldOrders || 0) + (order.amountPaid || 0);
  if (totalPayment > 0) {
    lines.push(row('Payment:', `LKR ${totalPayment.toFixed(2)}`));

    if (order.paidToAdmin && order.paidToAdmin > 0) {
      lines.push(row('  - To Admin Credit:', `LKR ${order.paidToAdmin.toFixed(2)}`));
    }
    if (order.paidToOldOrders && order.paidToOldOrders > 0) {
      lines.push(row('  - To Old Orders:', `LKR ${order.paidToOldOrders.toFixed(2)}`));
    }
    if (order.amountPaid && order.amountPaid > 0) {
      lines.push(row('  - To Current Order:', `LKR ${order.amountPaid.toFixed(2)}`));
    }
  }

  if (order.paymentMethod === 'cash') {
    lines.push(line('-'));
    lines.push(row('Cash Received:', `LKR ${(order.cashReceived || 0).toFixed(2)}`));
    lines.push(row('Change:', `LKR ${(order.changeGiven || 0).toFixed(2)}`));
  } else if (order.paymentMethod !== 'credit') {
    lines.push(line('-'));
    lines.push(row('Method:', order.paymentMethod.toUpperCase()));
  }

  if (order.remainingBalance !== undefined) {
    lines.push(line('-'));
    if (order.remainingBalance > 0) {
      lines.push(row('REMAINING BALANCE:', `LKR ${order.remainingBalance.toFixed(2)}`));
      if (order.adminCredit !== undefined && order.orderCredit !== undefined) {
        const remainingAdmin = Math.max(0, (order.adminCredit || 0) - (order.paidToAdmin || 0));
        const remainingOld = Math.max(0, (order.orderCredit || 0) - (order.paidToOldOrders || 0));
        const unpaidCurrent = order.total - (order.amountPaid || 0);
        if (remainingAdmin > 0) {
          lines.push(row('  - Admin Credit:', `LKR ${remainingAdmin.toFixed(2)}`));
        }
        if (remainingOld > 0) {
          lines.push(row('  - Old Orders:', `LKR ${remainingOld.toFixed(2)}`));
        }
        if (unpaidCurrent > 0) {
          lines.push(row('  - Current Order:', `LKR ${unpaidCurrent.toFixed(2)}`));
        }
      }
    } else {
      lines.push(row('BALANCE:', 'FULLY PAID'));
    }
  }

  lines.push(line());
  if (settings.showBarcode) {
    lines.push(center(`[BARCODE: ${order.orderNumber}]`));
    lines.push('');
  }

  if (settings.receiptFooter) {
    settings.receiptFooter.split('\n').forEach(l => lines.push(center(l.trim())));
  } else {
    lines.push(center('Thank you for your business!'));
  }

  lines.push('');
  lines.push(center('Powered by FD-POS System - 0777432106'));
  lines.push('');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate A5 paginated receipt with professional layout
 * Optimized to fit maximum products per page with compact headers
 */
function generateA5PaginatedReceipt(
  order: Order,
  business: BusinessSettings,
  settings: PrinterSettings,
  printTime: string
): string {
  // Calculate items per page (approximately 20-25 items per A5 page)
  const ITEMS_PER_PAGE = 20;
  const items = order.items;
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

  // Split items into pages
  const pages: OrderItem[][] = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push(items.slice(i * ITEMS_PER_PAGE, (i + 1) * ITEMS_PER_PAGE));
  }

  // Generate HTML for each page
  const pageHTMLs = pages.map((pageItems, pageIndex) => {
    const isFirstPage = pageIndex === 0;
    const isLastPage = pageIndex === totalPages - 1;
    const currentPage = pageIndex + 1;

    return `
    <div class="page" style="page-break-after: ${isLastPage ? 'auto' : 'always'};">
      <!-- Compact Page Header -->
      <div class="page-header">
        ${isFirstPage && settings.showLogo && settings.logoUrl ? `
        <div class="logo-container">
          <img src="${settings.logoUrl}" alt="${business.businessName} Logo" class="logo" />
        </div>
        ` : ''}

        <div class="business-info">
          <div class="business-name">${business.businessName.toUpperCase()}</div>
          <div class="contact-info">
            ${business.address ? `${business.address} | ` : ''}${business.phone ? `Tel: ${business.phone}` : ''}
          </div>
        </div>

        <div class="order-info">
          <div class="order-row">
            <span><strong>Order #:</strong> ${order.orderNumber}</span>
            <span><strong>Page:</strong> ${currentPage} of ${totalPages}</span>
          </div>
          ${isFirstPage ? `
          <div class="order-row">
            <span>Date: ${new Date(order.createdAt).toLocaleString()}</span>
          </div>
          ${order.cashierName ? `<div class="order-row"><span>Cashier: ${order.cashierName}</span></div>` : ''}
          ${order.customerName ? `<div class="order-row"><span>Customer: ${order.customerName}</span>${order.customerPhone ? ` <span>Tel: ${order.customerPhone}</span>` : ''}</div>` : ''}
          ` : `
          <div class="order-row">
            <span>${order.customerName || 'Walk-in Customer'}</span>
          </div>
          `}
        </div>
      </div>

      <div class="divider"></div>

      <!-- Products Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 40%;">Product</th>
            <th style="width: 15%;">Qty</th>
            <th style="width: 20%;">Rate</th>
            <th style="width: 20%; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${pageItems.map((item, idx) => {
            const globalIndex = pageIndex * ITEMS_PER_PAGE + idx + 1;
            const unit = item.unitType === 'unit' ? 'units' : 'KG';
            return `
            <tr>
              <td>${globalIndex}</td>
              <td>
                <div class="product-name">${item.itemName}</div>
                ${item.boxCount && item.boxCount > 0 ? `
                <div class="product-detail">Box: ${item.boxCount} × ${item.boxWeightPerBoxKg?.toFixed(3)}kg (-${item.boxWeightKg?.toFixed(3)}kg)</div>
                ` : ''}
                ${item.itemDiscountPercent && item.itemDiscountPercent > 0 ? `
                <div class="product-detail">Disc: ${item.itemDiscountPercent}%</div>
                ` : ''}
              </td>
              <td>${item.netWeightKg.toFixed(3)} ${unit}</td>
              <td>${item.pricePerKg.toFixed(2)}</td>
              <td style="text-align: right;"><strong>${item.finalTotal.toFixed(2)}</strong></td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      ${!isLastPage ? `
      <div class="page-footer">
        <div class="footer-note">Continued on next page...</div>
      </div>
      ` : `
      <!-- Totals Section (Last Page Only) -->
      <div class="divider"></div>

      <div class="totals-section">
        ${order.customerPreviousBalance && order.customerPreviousBalance > 0 ? `
        <div class="total-row highlight-danger">
          <span>Previous Balance:</span>
          <span>LKR ${order.customerPreviousBalance.toFixed(2)}</span>
        </div>
        ${order.adminCredit && order.adminCredit > 0 ? `
        <div class="total-row indent">
          <span>- Admin Credit:</span>
          <span>LKR ${order.adminCredit.toFixed(2)}</span>
        </div>
        ` : ''}
        ${order.orderCredit && order.orderCredit > 0 ? `
        <div class="total-row indent">
          <span>- Old Orders:</span>
          <span>LKR ${order.orderCredit.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="divider-thin"></div>
        ` : ''}

        <div class="total-row">
          <span>${order.customerPreviousBalance && order.customerPreviousBalance > 0 ? 'Current Order Subtotal:' : 'Subtotal:'}</span>
          <span>LKR ${order.subtotal.toFixed(2)}</span>
        </div>
        ${order.discountAmount > 0 ? `
        <div class="total-row">
          <span>Discount:</span>
          <span>-LKR ${order.discountAmount.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="total-row">
          <span>${order.customerPreviousBalance && order.customerPreviousBalance > 0 ? 'Current Order Total:' : ''}</span>
          <span>${order.customerPreviousBalance && order.customerPreviousBalance > 0 ? 'LKR ' + order.total.toFixed(2) : ''}</span>
        </div>

        <div class="divider-thin"></div>

        ${order.customerPreviousBalance && order.customerPreviousBalance > 0 ? `
        <div class="total-row grand-total">
          <span>TOTAL DUE:</span>
          <span>LKR ${(order.customerPreviousBalance + order.total).toFixed(2)}</span>
        </div>
        ` : `
        <div class="total-row grand-total">
          <span>GRAND TOTAL:</span>
          <span>LKR ${order.total.toFixed(2)}</span>
        </div>
        `}

        <div class="divider"></div>

        ${(() => {
          const totalPayment = (order.paidToAdmin || 0) + (order.paidToOldOrders || 0) + (order.amountPaid || 0);
          if (totalPayment > 0) {
            return `
        <div class="total-row">
          <span><strong>Payment:</strong></span>
          <span><strong>LKR ${totalPayment.toFixed(2)}</strong></span>
        </div>
        ${order.paidToAdmin && order.paidToAdmin > 0 ? `
        <div class="total-row indent">
          <span>- To Admin Credit:</span>
          <span>LKR ${order.paidToAdmin.toFixed(2)}</span>
        </div>
        ` : ''}
        ${order.paidToOldOrders && order.paidToOldOrders > 0 ? `
        <div class="total-row indent">
          <span>- To Old Orders:</span>
          <span>LKR ${order.paidToOldOrders.toFixed(2)}</span>
        </div>
        ` : ''}
        ${order.amountPaid && order.amountPaid > 0 ? `
        <div class="total-row indent">
          <span>- To Current Order:</span>
          <span>LKR ${order.amountPaid.toFixed(2)}</span>
        </div>
        ` : ''}
            `;
          }
          return '';
        })()}

        ${order.paymentMethod === 'cash' ? `
        <div class="divider-thin"></div>
        <div class="total-row">
          <span>Cash Received:</span>
          <span>LKR ${(order.cashReceived || 0).toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Change:</span>
          <span>LKR ${(order.changeGiven || 0).toFixed(2)}</span>
        </div>
        ` : order.paymentMethod !== 'credit' ? `
        <div class="divider-thin"></div>
        <div class="total-row">
          <span>Payment Method:</span>
          <span>${order.paymentMethod.toUpperCase()}</span>
        </div>
        ` : ''}

        ${order.remainingBalance !== undefined ? `
        <div class="divider"></div>
        <div class="total-row ${order.remainingBalance > 0 ? 'highlight-danger' : 'highlight-success'}">
          <span><strong>${order.remainingBalance > 0 ? 'REMAINING BALANCE:' : 'BALANCE:'}</strong></span>
          <span><strong>${order.remainingBalance > 0 ? 'LKR ' + order.remainingBalance.toFixed(2) : 'FULLY PAID'}</strong></span>
        </div>
        ${order.remainingBalance > 0 && order.adminCredit !== undefined && order.orderCredit !== undefined ? (() => {
          const remainingAdmin = Math.max(0, (order.adminCredit || 0) - (order.paidToAdmin || 0));
          const remainingOld = Math.max(0, (order.orderCredit || 0) - (order.paidToOldOrders || 0));
          const unpaidCurrent = order.total - (order.amountPaid || 0);
          return `
        ${remainingAdmin > 0 ? `
        <div class="total-row indent">
          <span>- Admin Credit:</span>
          <span>LKR ${remainingAdmin.toFixed(2)}</span>
        </div>
        ` : ''}
        ${remainingOld > 0 ? `
        <div class="total-row indent">
          <span>- Old Orders:</span>
          <span>LKR ${remainingOld.toFixed(2)}</span>
        </div>
        ` : ''}
        ${unpaidCurrent > 0 ? `
        <div class="total-row indent">
          <span>- Current Order:</span>
          <span>LKR ${unpaidCurrent.toFixed(2)}</span>
        </div>
        ` : ''}
          `;
        })() : ''}
        ` : ''}
      </div>

      <!-- Footer -->
      <div class="page-footer">
        ${settings.receiptFooter ? `
        <div class="footer-text">${settings.receiptFooter.split('\n').join('<br>')}</div>
        ` : `
        <div class="footer-text">Thank you for your business!</div>
        `}
        <div class="footer-powered">Powered by FD-POS System - 0777432106</div>
      </div>
      `}
    </div>
    `;
  }).join('');

  // Complete HTML document with optimized A5 styles
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${order.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @media print {
      body { margin: 0; padding: 0; }
      @page {
        size: A5 portrait;
        margin: 8mm 10mm;
      }
      .page { page-break-after: always; }
      .page:last-child { page-break-after: auto; }
    }

    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
      background: white;
    }

    .page {
      width: 148mm;
      min-height: 210mm;
      margin: 0 auto;
      padding: 0;
      background: white;
    }

    /* Header Styles - Compact */
    .page-header {
      margin-bottom: 8px;
    }

    .logo-container {
      text-align: center;
      margin-bottom: 8px;
    }

    .logo {
      max-width: 250px;
      max-height: 60px;
      height: auto;
      object-fit: contain;
    }

    .business-info {
      text-align: center;
      margin-bottom: 6px;
    }

    .business-name {
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }

    .contact-info {
      font-size: 9px;
      color: #333;
    }

    .order-info {
      font-size: 10px;
      margin-top: 6px;
    }

    .order-row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
    }

    /* Dividers */
    .divider {
      border-top: 2px solid #000;
      margin: 6px 0;
    }

    .divider-thin {
      border-top: 1px dashed #999;
      margin: 4px 0;
    }

    /* Products Table - Maximized */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      font-size: 10px;
    }

    .items-table thead {
      background: #f0f0f0;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
    }

    .items-table th {
      padding: 4px 3px;
      text-align: left;
      font-weight: bold;
      font-size: 9px;
    }

    .items-table tbody tr {
      border-bottom: 1px solid #e0e0e0;
    }

    .items-table tbody tr:last-child {
      border-bottom: 1px solid #000;
    }

    .items-table td {
      padding: 4px 3px;
      vertical-align: top;
    }

    .product-name {
      font-weight: bold;
      font-size: 10px;
    }

    .product-detail {
      font-size: 8px;
      color: #555;
      font-style: italic;
      margin-top: 1px;
    }

    /* Totals Section - Compact */
    .totals-section {
      margin: 8px 0;
      font-size: 11px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
    }

    .total-row.indent {
      padding-left: 20px;
      font-size: 9px;
      color: #555;
    }

    .total-row.grand-total {
      font-size: 14px;
      font-weight: bold;
      padding: 6px 0;
    }

    .total-row.highlight-danger {
      color: #d9534f;
      font-weight: bold;
    }

    .total-row.highlight-success {
      color: #5cb85c;
      font-weight: bold;
    }

    /* Footer - Minimal */
    .page-footer {
      margin-top: 10px;
      text-align: center;
      font-size: 9px;
    }

    .footer-note {
      font-weight: bold;
      font-size: 10px;
      margin-top: 10px;
    }

    .footer-text {
      margin: 6px 0;
    }

    .footer-powered {
      color: #666;
      font-size: 8px;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  ${pageHTMLs}
</body>
</html>
  `;
}

export function generateReceiptHTML(
  order: Order,
  business: BusinessSettings,
  settings: PrinterSettings
): string {
  const width = settings.paperWidth;
  const printTime = new Date().toLocaleString();

  // Check if A5 size (148mm width)
  const isA5 = width === 148;

  // For A5, use pagination to fit multiple products
  if (isA5) {
    return generateA5PaginatedReceipt(order, business, settings, printTime);
  }

  // Logo HTML with proper optimization
  const logoHTML = settings.showLogo && settings.logoUrl ? `
    <div class="logo-container">
      <img src="${settings.logoUrl}" alt="${business.businessName} Logo" class="logo" />
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt ${order.orderNumber}</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; }
      @page {
        size: ${isA5 ? 'A5' : width === 58 ? '58mm' : '80mm'} ${isA5 ? 'portrait' : 'auto'};
        margin: ${isA5 ? '10mm' : '0'};
      }
    }
    body {
      font-family: ${isA5 ? "'Arial', 'Helvetica', sans-serif" : "'Courier New', monospace"};
      font-size: ${isA5 ? '14px' : width === 58 ? '10px' : '12px'};
      line-height: ${isA5 ? '1.6' : '1.4'};
      max-width: ${isA5 ? '148mm' : width === 58 ? '200px' : '300px'};
      margin: ${isA5 ? '0 auto' : '20px auto'};
      padding: ${isA5 ? '15mm' : '10px'};
      background: white;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line {
      border-bottom: 1px solid ${isA5 ? '#333' : '#000'};
      margin: ${isA5 ? '8px 0' : '5px 0'};
    }
    .line-thick {
      border-bottom: ${isA5 ? '3px' : '2px'} solid #000;
      margin: ${isA5 ? '12px 0' : '5px 0'};
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin: ${isA5 ? '6px 0' : '2px 0'};
      align-items: center;
    }
    .item {
      margin: ${isA5 ? '15px 0' : '8px 0'};
      padding: ${isA5 ? '8px 0' : '0'};
      border-bottom: ${isA5 ? '1px dashed #ccc' : 'none'};
    }
    .item-details {
      margin-left: ${isA5 ? '20px' : '15px'};
      font-size: ${isA5 ? '0.95em' : '0.9em'};
    }
    .sub-detail {
      margin-left: ${isA5 ? '20px' : '15px'};
      font-size: ${isA5 ? '0.9em' : '0.85em'};
      color: #555;
      font-style: italic;
    }
    .logo-container {
      text-align: center;
      margin: ${isA5 ? '15px 0 20px 0' : '10px 0'};
      padding: ${isA5 ? '10px' : '5px'};
    }
    .logo {
      max-width: ${isA5 ? '350px' : width === 58 ? '150px' : '200px'};
      height: auto;
      max-height: ${isA5 ? '150px' : '100px'};
      object-fit: contain;
      display: inline-block;
    }
    .barcode {
      margin: ${isA5 ? '15px 0' : '10px 0'};
      padding: ${isA5 ? '10px' : '5px'};
      border: ${isA5 ? '2px' : '1px'} dashed #000;
      font-size: ${isA5 ? '0.9em' : '0.8em'};
    }
    .header-section {
      margin-bottom: ${isA5 ? '20px' : '10px'};
    }
    .business-name {
      font-size: ${isA5 ? '1.8em' : '1.2em'};
      font-weight: bold;
      margin: ${isA5 ? '10px 0' : '5px 0'};
      letter-spacing: ${isA5 ? '1px' : '0'};
    }
    .total-section {
      font-size: ${isA5 ? '1.3em' : '1.2em'};
      font-weight: bold;
      margin: ${isA5 ? '15px 0' : '10px 0'};
      padding: ${isA5 ? '10px' : '5px'} 0;
    }
  </style>
</head>
<body>
  <div class="header-section">
    ${logoHTML}

    <div class="center business-name">${business.businessName.toUpperCase()}</div>
    ${business.address ? `<div class="center" style="margin: ${isA5 ? '5px' : '2px'} 0;">${business.address}</div>` : ''}
    ${business.phone ? `<div class="center" style="margin: ${isA5 ? '5px' : '2px'} 0;">Tel: ${business.phone}</div>` : ''}
    ${business.email ? `<div class="center" style="margin: ${isA5 ? '5px' : '2px'} 0;">${business.email}</div>` : ''}

    ${settings.receiptHeader ? `<div class="center" style="margin-top: ${isA5 ? '15px' : '10px'};">${settings.receiptHeader.split('\n').join('<br>')}</div>` : ''}
  </div>

  <div class="line-thick"></div>
  
  <div class="row">
    <span>Order #:</span>
    <span class="bold">${order.orderNumber}</span>
  </div>
  <div class="row">
    <span>Date:</span>
    <span>${new Date(order.createdAt).toLocaleString()}</span>
  </div>
  ${order.cashierName ? `
  <div class="row">
    <span>Cashier:</span>
    <span>${order.cashierName}</span>
  </div>
  ` : ''}
  ${order.customerName ? `
  <div class="row">
    <span>Customer:</span>
    <span>${order.customerName}</span>
  </div>
  ` : ''}
  ${order.customerPhone ? `
  <div class="row">
    <span>Phone:</span>
    <span>${order.customerPhone}</span>
  </div>
  ` : ''}
  
  <div class="line-thick"></div>
  
  <div class="center bold">ITEMS</div>
  <div class="line"></div>
  
  ${order.items.map((item, index) => `
    <div class="item">
      <div class="bold">${index + 1}. ${item.itemName}</div>
      <div class="item-details">
        <div class="row">
          <span>${item.netWeightKg.toFixed(3)} ${item.unitType === 'unit' ? 'units' : 'KG'} @ LKR ${item.pricePerKg.toFixed(2)}</span>
          <span></span>
        </div>
        ${item.boxCount && item.boxCount > 0 ? `
        <div class="sub-detail">
           - Box Deduction: ${item.boxCount} x ${item.boxWeightPerBoxKg?.toFixed(3) || '0'}kg
           (Total: -${item.boxWeightKg?.toFixed(3) || '0'} kg)
        </div>
        ` : ''}
        ${item.itemDiscountPercent && item.itemDiscountPercent > 0 ? `
        <div class="row">
          <span>Discount (${item.itemDiscountPercent}%):</span>
          <span>-LKR ${(item.finalTotal * item.itemDiscountPercent / 100).toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="row">
          <span>Total:</span>
          <span class="bold">LKR ${item.finalTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  `).join('')}

  <div class="line-thick"></div>

  ${order.customerPreviousBalance && order.customerPreviousBalance > 0 ? `
  <div class="row" style="color: #d9534f;">
    <span class="bold">Previous Balance:</span>
    <span class="bold">LKR ${order.customerPreviousBalance.toFixed(2)}</span>
  </div>
  ${order.adminCredit && order.adminCredit > 0 ? `
  <div class="row" style="margin-left: 15px; font-size: 0.9em;">
    <span>- Admin Credit:</span>
    <span>LKR ${order.adminCredit.toFixed(2)}</span>
  </div>
  ` : ''}
  ${order.orderCredit && order.orderCredit > 0 ? `
  <div class="row" style="margin-left: 15px; font-size: 0.9em;">
    <span>- Old Orders:</span>
    <span>LKR ${order.orderCredit.toFixed(2)}</span>
  </div>
  ` : ''}
  <div class="line"></div>
  ` : ''}

  <div class="row">
    <span>${order.customerPreviousBalance && order.customerPreviousBalance > 0 ? 'Current Order Subtotal:' : 'Subtotal:'}</span>
    <span>LKR ${order.subtotal.toFixed(2)}</span>
  </div>
  ${order.discountAmount > 0 ? `
  <div class="row">
    <span>Discount:</span>
    <span>-LKR ${order.discountAmount.toFixed(2)}</span>
  </div>
  ` : ''}
  <div class="row">
    <span>${order.customerPreviousBalance && order.customerPreviousBalance > 0 ? 'Current Order Total:' : ''}</span>
    <span>${order.customerPreviousBalance && order.customerPreviousBalance > 0 ? 'LKR ' + order.total.toFixed(2) : ''}</span>
  </div>

  <div class="line"></div>

  ${order.customerPreviousBalance && order.customerPreviousBalance > 0 ? `
  <div class="row total-section">
    <span>TOTAL DUE:</span>
    <span>LKR ${(order.customerPreviousBalance + order.total).toFixed(2)}</span>
  </div>
  ` : `
  <div class="row total-section">
    <span>TOTAL:</span>
    <span>LKR ${order.total.toFixed(2)}</span>
  </div>
  `}

  <div class="line-thick"></div>

  ${(() => {
    const totalPayment = (order.paidToAdmin || 0) + (order.paidToOldOrders || 0) + (order.amountPaid || 0);
    if (totalPayment > 0) {
      return `
  <div class="row">
    <span class="bold">Payment:</span>
    <span class="bold">LKR ${totalPayment.toFixed(2)}</span>
  </div>
  ${order.paidToAdmin && order.paidToAdmin > 0 ? `
  <div class="row" style="margin-left: 15px; font-size: 0.9em;">
    <span>- To Admin Credit:</span>
    <span>LKR ${order.paidToAdmin.toFixed(2)}</span>
  </div>
  ` : ''}
  ${order.paidToOldOrders && order.paidToOldOrders > 0 ? `
  <div class="row" style="margin-left: 15px; font-size: 0.9em;">
    <span>- To Old Orders:</span>
    <span>LKR ${order.paidToOldOrders.toFixed(2)}</span>
  </div>
  ` : ''}
  ${order.amountPaid && order.amountPaid > 0 ? `
  <div class="row" style="margin-left: 15px; font-size: 0.9em;">
    <span>- To Current Order:</span>
    <span>LKR ${order.amountPaid.toFixed(2)}</span>
  </div>
  ` : ''}
      `;
    }
    return '';
  })()}

  ${order.paymentMethod === 'cash' ? `
  <div class="line"></div>
  <div class="row">
    <span>Cash Received:</span>
    <span>LKR ${(order.cashReceived || 0).toFixed(2)}</span>
  </div>
  <div class="row">
    <span>Change:</span>
    <span>LKR ${(order.changeGiven || 0).toFixed(2)}</span>
  </div>
  ` : order.paymentMethod !== 'credit' ? `
  <div class="line"></div>
  <div class="row">
    <span>Method:</span>
    <span>${order.paymentMethod.toUpperCase()}</span>
  </div>
  ` : ''}

  ${order.remainingBalance !== undefined ? `
  <div class="line"></div>
  <div class="row bold" style="font-size: 1.1em; ${order.remainingBalance > 0 ? 'color: #d9534f;' : 'color: #5cb85c;'}">
    <span>${order.remainingBalance > 0 ? 'REMAINING BALANCE:' : 'BALANCE:'}</span>
    <span>${order.remainingBalance > 0 ? 'LKR ' + order.remainingBalance.toFixed(2) : 'FULLY PAID'}</span>
  </div>
  ${order.remainingBalance > 0 && order.adminCredit !== undefined && order.orderCredit !== undefined ? (() => {
    const remainingAdmin = Math.max(0, (order.adminCredit || 0) - (order.paidToAdmin || 0));
    const remainingOld = Math.max(0, (order.orderCredit || 0) - (order.paidToOldOrders || 0));
    const unpaidCurrent = order.total - (order.amountPaid || 0);
    return `
  ${remainingAdmin > 0 ? `
  <div class="row" style="margin-left: 15px; font-size: 0.9em;">
    <span>- Admin Credit:</span>
    <span>LKR ${remainingAdmin.toFixed(2)}</span>
  </div>
  ` : ''}
  ${remainingOld > 0 ? `
  <div class="row" style="margin-left: 15px; font-size: 0.9em;">
    <span>- Old Orders:</span>
    <span>LKR ${remainingOld.toFixed(2)}</span>
  </div>
  ` : ''}
  ${unpaidCurrent > 0 ? `
  <div class="row" style="margin-left: 15px; font-size: 0.9em;">
    <span>- Current Order:</span>
    <span>LKR ${unpaidCurrent.toFixed(2)}</span>
  </div>
  ` : ''}
    `;
  })() : ''}
  ` : ''}

  <div class="line"></div>
  
  ${settings.showBarcode ? `
  <div class="center barcode">
    [BARCODE: ${order.orderNumber}]
  </div>
  ` : ''}
  
  ${settings.receiptFooter ? `
  <div class="center" style="margin-top: 10px;">${settings.receiptFooter.split('\n').join('<br>')}</div>
  ` : `
  <div class="center" style="margin-top: 10px;">Thank you for your business!</div>
  `}
  
  <div class="center" style="margin-top: 15px; font-size: 0.8em; color: #666;">
    Powered by FD-POS System - 0777432106
  </div>
</body>
</html>
  `;
}

/**
 * Print receipt to browser (opens print dialog)
 */
export function printReceiptBrowser(
  order: Order,
  business: BusinessSettings,
  settings: PrinterSettings
): void {
  const html = generateReceiptHTML(order, business, settings);
  const printWindow = window.open('', '_blank', 'width=400,height=600');

  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();

        // Auto-close window after print dialog closes
        printWindow.onafterprint = () => {
          setTimeout(() => {
            printWindow.close();
          }, 100);
        };

        // Fallback: close after 2 seconds if user cancels print
        setTimeout(() => {
          if (!printWindow.closed) {
            printWindow.close();
          }
        }, 2000);
      }, 250);
    };
  }
}

/**
 * Download receipt as text file
 */
export function downloadReceiptText(
  order: Order,
  business: BusinessSettings,
  settings: PrinterSettings
): void {
  const text = generateReceiptText(order, business, settings);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receipt-${order.orderNumber}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Send receipt to ESC/POS network printer (requires backend proxy)
 */
export async function printToNetworkPrinter(
  order: Order,
  business: BusinessSettings,
  settings: PrinterSettings,
  printerIP: string,
  printerPort: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const text = generateReceiptText(order, business, settings);

    // This would need a backend endpoint to handle actual network printing
    const response = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerIP,
        printerPort,
        content: text,
        copies: settings.printCopies,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to print');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Network printer error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Auto-print receipt based on settings
 */
export async function autoPrintReceipt(
  order: Order,
  business: BusinessSettings,
  settings: PrinterSettings,
  printerIP?: string,
  printerPort?: number
): Promise<void> {
  if (!settings.autoPrint || settings.printerType === 'disabled') {
    return;
  }

  // Print multiple copies if configured
  for (let i = 0; i < settings.printCopies; i++) {
    if (settings.printerType === 'thermal' && printerIP && printerPort) {
      // Try network printer first
      const result = await printToNetworkPrinter(order, business, settings, printerIP, printerPort);
      if (!result.success) {
        console.warn('Network printing failed, falling back to browser print');
        printReceiptBrowser(order, business, settings);
      }
    } else {
      // Fallback to browser print dialog
      printReceiptBrowser(order, business, settings);
    }

    // Small delay between copies
    if (i < settings.printCopies - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

/**
 * Generate receipt preview for display
 */
export function generateReceiptPreview(
  order: Order,
  business: BusinessSettings,
  settings: PrinterSettings
): string {
  return generateReceiptText(order, business, settings);
}
