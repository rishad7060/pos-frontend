/**
 * Utility functions for safe number operations
 * Handles conversion of Decimal types and other edge cases
 */

/**
 * Safely convert any value to a number, handling Decimal types, strings, etc.
 */
export function toNumber(value: any): number {
  if (value === null || value === undefined) {
    return 0;
  }
  
  // If already a number, return it
  if (typeof value === 'number') {
    return value;
  }
  
  // If it's a string, parse it
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  // If it's a Decimal object (Prisma), try to convert it
  if (typeof value === 'object' && value !== null) {
    // Prisma Decimal has a toNumber() method
    if (typeof value.toNumber === 'function') {
      return value.toNumber();
    }
    // Some Decimal implementations use toString()
    if (typeof value.toString === 'function') {
      const str = value.toString();
      const parsed = parseFloat(str);
      return isNaN(parsed) ? 0 : parsed;
    }
  }
  
  // Fallback: try Number() conversion
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Safely format a number with toFixed, handling Decimal types
 */
export function formatNumber(value: any, decimals: number = 2): string {
  const num = toNumber(value);
  return num.toFixed(decimals);
}

/**
 * Safely format currency
 */
export function formatCurrency(value: any): string {
  return `LKR ${formatNumber(value, 2)}`;
}


