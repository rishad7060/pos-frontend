// Centralized POS Types - Single Source of Truth
// Import these instead of defining locally in each component

/**
 * Product interface representing inventory items
 */
export interface Product {
    id: number;
    name: string;
    description: string | null;
    defaultPricePerKg: number | null;
    category: string | null;
    isActive: boolean;
    sku: string | null;
    barcode?: string | null;
    imageUrl?: string | null;
    stockQuantity: number;
    reorderLevel?: number;
    unitType: string;
    costPrice?: number | null;
    alertsEnabled?: boolean;
    alertEmail?: string | null;
    minStockLevel?: number | null;
    maxStockLevel?: number | null;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Cart item with calculated values
 */
export interface CartItem {
    id: string;
    productId: number | null;
    itemName: string;
    quantityType: 'kg' | 'g' | 'box';
    itemWeightKg: number;
    itemWeightG: number;
    boxWeightKg: number;
    boxWeightG: number;
    boxCount: number;
    pricePerKg: number;
    itemDiscountPercent: number;
    // Calculated fields
    itemWeightTotalKg: number;
    boxWeightPerBoxKg: number;
    totalBoxWeightKg: number;
    netWeightKg: number;
    baseTotal: number;
    itemDiscountAmount: number;
    finalTotal: number;
    stockAvailable?: number;
}

/**
 * Product category
 */
export interface Category {
    id: number;
    name: string;
    description: string | null;
}

/**
 * Customer record
 */
export interface Customer {
    id: number;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    totalPurchases?: number;
    visitCount?: number;
    createdAt?: string;
}

/**
 * Order tab for multi-tab POS interface
 */
export interface OrderTab {
    id: string;
    name: string;
    cart: CartItem[];
    orderDiscount: number;
    customer: Customer | null;
    createdAt: number;
}

/**
 * Order item from completed order
 */
export interface OrderItem {
    id: number;
    itemName: string;
    netWeightKg: number;
    finalTotal: number;
    productId: number | null;
    itemWeightTotalKg: number;
    totalBoxWeightKg: number | null;
    boxCount: number | null;
    pricePerKg: number;
    itemDiscountAmount: number;
    itemDiscountPercent: number;
    baseTotal: number;
    unitType?: string;
}

/**
 * Completed order
 */
export interface Order {
    id: number;
    orderNumber: string;
    total: number;
    subtotal: number;
    discountAmount: number;
    discountPercent: number;
    createdAt: string;
    status: string;
    paymentMethod: string;
    itemCount?: number;
    cashReceived?: number;
    changeGiven?: number;
    cashier?: {
        id: number;
        fullName: string;
        email: string;
    };
    customer?: Customer | null;
    orderItems?: OrderItem[];
}

/**
 * Business settings for receipts
 */
export interface BusinessSettings {
    businessName: string;
    address?: string;
    phone?: string;
    email?: string;
    taxNumber?: string;
    currency?: string;
}

/**
 * Printer configuration
 */
export interface PrinterSettings {
    printerType: 'disabled' | 'browser' | 'network';
    printerName?: string;
    printerIp?: string;
    printerPort?: number;
    paperWidth: 58 | 80;
    autoPrint: boolean;
    showLogo: boolean;
    logoUrl?: string;
    receiptFooter?: string;
    showBarcode: boolean;
}

/**
 * Cashier permissions
 */
export interface CashierPermissions {
    canApplyDiscount: boolean;
    maxDiscountPercent: number;
    canEditPrices: boolean;
    canVoidOrders: boolean;
    canProcessRefunds: boolean;
    canOpenRegistry: boolean;
    canCloseRegistry: boolean;
    canViewReports: boolean;
    canUpdateStock: boolean;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
    data?: T;
    error?: {
        message: string;
        code: string;
    };
}
