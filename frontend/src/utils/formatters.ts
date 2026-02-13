/**
 * Utility functions for formatting currency, numbers, dates, etc.
 */

/**
 * Format currency with symbol and proper spacing
 * @param amount - The number to format
 * @param symbol - Currency symbol (e.g., "$", "KSh", "₦")
 * @param locale - Locale for number formatting (default: 'en-US')
 * @returns Formatted currency string with space between symbol and amount
 */
export const formatCurrency = (
  amount: number | string,
  symbol: string = '$',
  locale: string = 'en-US'
): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return `${symbol} 0.00`;
  }
  
  // Format the number with proper thousand separators and decimal places
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
  
  // Return with space between symbol and amount
  return `${symbol} ${formattedNumber}`;
};

/**
 * Format number with thousand separators
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @param locale - Locale for number formatting (default: 'en-US')
 */
export const formatNumber = (
  value: number | string,
  decimals: number = 0,
  locale: string = 'en-US'
): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0';
  }
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);
};

/**
 * Format percentage
 * @param value - The decimal value (e.g., 0.15 for 15%)
 * @param decimals - Number of decimal places (default: 1)
 */
export const formatPercent = (
  value: number | string,
  decimals: number = 1
): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0%';
  }
  
  return `${(numValue * 100).toFixed(decimals)}%`;
};

/**
 * Format date in a readable format
 * @param date - Date string or Date object
 * @param format - 'short' | 'medium' | 'long' (default: 'medium')
 * @param locale - Locale for date formatting (default: 'en-US')
 */
export const formatDate = (
  date: string | Date,
  format: 'short' | 'medium' | 'long' = 'medium',
  locale: string = 'en-US'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const options: Intl.DateTimeFormatOptions = {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' },
  }[format];
  
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
};

/**
 * Format phone number
 * @param phone - Phone number string
 * @param countryCode - Country code (e.g., '+254')
 */
export const formatPhone = (phone: string, countryCode?: string): string => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  if (countryCode) {
    return `${countryCode} ${digits}`;
  }
  
  return digits;
};

/**
 * Compact number format (e.g., 1.2K, 3.5M)
 * @param value - The number to format
 */
export const formatCompactNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};
