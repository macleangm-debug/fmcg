/**
 * Number formatting utilities
 */

/**
 * Format a number with thousand separators (commas)
 * @param value - The number or string to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string with commas
 */
export const formatNumber = (value: number | string | undefined | null, decimals: number = 0): string => {
  if (value === undefined || value === null || value === '') return '';
  
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  
  if (isNaN(num)) return '';
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format a number for display with K/M suffix for large numbers
 * Used for dashboard summaries
 * @param value - The number to format
 * @returns Formatted string with K/M suffix if applicable
 */
export const formatNumberCompact = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return '0';
  
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return formatNumber(value);
};

/**
 * Parse a formatted number string back to a number
 * Removes commas and other formatting
 * @param value - The formatted string
 * @returns Parsed number or 0 if invalid
 */
export const parseFormattedNumber = (value: string | undefined | null): number => {
  if (!value) return 0;
  const cleaned = value.toString().replace(/,/g, '').replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

/**
 * Format input value while typing (for number inputs)
 * Keeps cursor position friendly
 * @param value - Current input value
 * @returns Formatted value with commas
 */
export const formatNumberInput = (value: string): string => {
  // Remove all non-numeric characters except decimal point
  const cleaned = value.replace(/[^\d.]/g, '');
  
  // Split by decimal point
  const parts = cleaned.split('.');
  
  // Format the integer part with commas
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Return formatted number
  return parts.join('.');
};

/**
 * Format currency with symbol and thousand separators
 * @param value - The number to format
 * @param symbol - Currency symbol (default: $)
 * @param decimals - Decimal places (default: 2)
 * @returns Formatted currency string
 */
export const formatCurrencyFull = (
  value: number | string | undefined | null,
  symbol: string = '$',
  decimals: number = 2
): string => {
  if (value === undefined || value === null || value === '') return `${symbol}0`;
  
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  
  if (isNaN(num)) return `${symbol}0`;
  
  return `${symbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

export default {
  formatNumber,
  formatNumberCompact,
  parseFormattedNumber,
  formatNumberInput,
  formatCurrencyFull,
};
