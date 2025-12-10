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
  lines.push(row('Subtotal:', `LKR ${order.subtotal.toFixed(2)}`));
  if (order.discountAmount > 0) {
    lines.push(row('Discount:', `-LKR ${order.discountAmount.toFixed(2)}`));
  }
  lines.push(line('-'));
  lines.push(row('TOTAL:', `LKR ${order.total.toFixed(2)}`));
  lines.push(line('='));

  // Payment
  if (order.paymentMethod === 'cash') {
    lines.push(row('Cash:', `LKR ${(order.cashReceived || 0).toFixed(2)}`));
    lines.push(row('Change:', `LKR ${(order.changeGiven || 0).toFixed(2)}`));
  } else {
    lines.push(row('Payment:', order.paymentMethod.toUpperCase()));
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

export function generateReceiptHTML(
  order: Order,
  business: BusinessSettings,
  settings: PrinterSettings
): string {
  const width = settings.paperWidth;
  const printTime = new Date().toLocaleString();

  // Logo HTML with proper thermal optimization
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
        size: ${width === 58 ? '58mm' : '80mm'} auto;
        margin: 0;
      }
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: ${width === 58 ? '10px' : '12px'};
      line-height: 1.4;
      max-width: ${width === 58 ? '200px' : '300px'};
      margin: 20px auto;
      padding: 10px;
      background: white;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-bottom: 1px solid #000; margin: 5px 0; }
    .line-thick { border-bottom: 2px solid #000; margin: 5px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .item { margin: 8px 0; }
    .item-details { margin-left: 15px; font-size: 0.9em; }
    .sub-detail { margin-left: 15px; font-size: 0.85em; color: #444; font-style: italic; }
    .logo-container { 
      text-align: center; 
      margin: 10px 0; 
      padding: 5px;
    }
    .logo { 
      max-width: ${width === 58 ? '150px' : '200px'}; 
      height: auto; 
      max-height: 100px;
      object-fit: contain;
      display: inline-block;
    }
    .barcode { 
      margin: 10px 0; 
      padding: 5px; 
      border: 1px dashed #000; 
      font-size: 0.8em;
    }
  </style>
</head>
<body>
  ${logoHTML}
  
  <div class="center bold" style="font-size: 1.2em;">${business.businessName.toUpperCase()}</div>
  ${business.address ? `<div class="center">${business.address}</div>` : ''}
  ${business.phone ? `<div class="center">Tel: ${business.phone}</div>` : ''}
  ${business.email ? `<div class="center">${business.email}</div>` : ''}
  
  ${settings.receiptHeader ? `<div class="center" style="margin-top: 10px;">${settings.receiptHeader.split('\n').join('<br>')}</div>` : ''}
  
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
  
  <div class="row">
    <span>Subtotal:</span>
    <span>LKR ${order.subtotal.toFixed(2)}</span>
  </div>
  ${order.discountAmount > 0 ? `
  <div class="row">
    <span>Discount:</span>
    <span>-LKR ${order.discountAmount.toFixed(2)}</span>
  </div>
  ` : ''}
  
  <div class="line"></div>
  
  <div class="row bold" style="font-size: 1.2em;">
    <span>TOTAL:</span>
    <span>LKR ${order.total.toFixed(2)}</span>
  </div>
  
  <div class="line-thick"></div>
  
  ${order.paymentMethod === 'cash' ? `
  <div class="row">
    <span>Cash:</span>
    <span>LKR ${(order.cashReceived || 0).toFixed(2)}</span>
  </div>
  <div class="row">
    <span>Change:</span>
    <span>LKR ${(order.changeGiven || 0).toFixed(2)}</span>
  </div>
  ` : order.paymentMethod === 'card' ? `
  <div class="row">
    <span>Payment:</span>
    <span>Card</span>
  </div>
  ` : order.paymentMethod === 'mobile' ? `
  <div class="row">
    <span>Payment:</span>
    <span>Mobile</span>
  </div>
  ` : `
  <div class="row">
    <span>Payment:</span>
    <span>Split Payment</span>
  </div>
  `}
  
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
