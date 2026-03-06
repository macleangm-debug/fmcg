// Currency detection and configuration utilities

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  thousandSeparator: string;
  decimalSeparator: string;
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, thousandSeparator: '.', decimalSeparator: ',' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  
  // Africa
  TZS: { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', decimals: 0, thousandSeparator: ',', decimalSeparator: '.' },
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  UGX: { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', decimals: 0, thousandSeparator: ',', decimalSeparator: '.' },
  RWF: { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc', decimals: 0, thousandSeparator: ',', decimalSeparator: '.' },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  GHS: { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', decimals: 2, thousandSeparator: ' ', decimalSeparator: ',' },
  ZMW: { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  BWP: { code: 'BWP', symbol: 'P', name: 'Botswana Pula', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  MWK: { code: 'MWK', symbol: 'MK', name: 'Malawian Kwacha', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  ETB: { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  MAD: { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham', decimals: 2, thousandSeparator: '.', decimalSeparator: ',' },
  XOF: { code: 'XOF', symbol: 'CFA', name: 'CFA Franc', decimals: 0, thousandSeparator: ' ', decimalSeparator: ',' },
  XAF: { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA', decimals: 0, thousandSeparator: ' ', decimalSeparator: ',' },
  
  // Asia
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', decimals: 0, thousandSeparator: '.', decimalSeparator: ',' },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', decimals: 0, thousandSeparator: '.', decimalSeparator: ',' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0, thousandSeparator: ',', decimalSeparator: '.' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', decimals: 0, thousandSeparator: ',', decimalSeparator: '.' },
  PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  LKR: { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  NPR: { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  
  // Middle East
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  SAR: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  QAR: { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  KWD: { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', decimals: 3, thousandSeparator: ',', decimalSeparator: '.' },
  BHD: { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar', decimals: 3, thousandSeparator: ',', decimalSeparator: '.' },
  OMR: { code: 'OMR', symbol: 'ر.ع.', name: 'Omani Rial', decimals: 3, thousandSeparator: ',', decimalSeparator: '.' },
  JOD: { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar', decimals: 3, thousandSeparator: ',', decimalSeparator: '.' },
  ILS: { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', decimals: 2, thousandSeparator: '.', decimalSeparator: ',' },
  
  // Americas
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  MXN: { code: 'MXN', symbol: '$', name: 'Mexican Peso', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimals: 2, thousandSeparator: '.', decimalSeparator: ',' },
  ARS: { code: 'ARS', symbol: '$', name: 'Argentine Peso', decimals: 2, thousandSeparator: '.', decimalSeparator: ',' },
  CLP: { code: 'CLP', symbol: '$', name: 'Chilean Peso', decimals: 0, thousandSeparator: '.', decimalSeparator: ',' },
  COP: { code: 'COP', symbol: '$', name: 'Colombian Peso', decimals: 0, thousandSeparator: '.', decimalSeparator: ',' },
  PEN: { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  
  // Oceania
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  NZD: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', decimals: 2, thousandSeparator: ',', decimalSeparator: '.' },
  
  // Europe
  CHF: { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', decimals: 2, thousandSeparator: "'", decimalSeparator: '.' },
  SEK: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', decimals: 2, thousandSeparator: ' ', decimalSeparator: ',' },
  NOK: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', decimals: 2, thousandSeparator: ' ', decimalSeparator: ',' },
  DKK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone', decimals: 2, thousandSeparator: '.', decimalSeparator: ',' },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', decimals: 2, thousandSeparator: ' ', decimalSeparator: ',' },
  CZK: { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', decimals: 2, thousandSeparator: ' ', decimalSeparator: ',' },
  HUF: { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', decimals: 0, thousandSeparator: ' ', decimalSeparator: ',' },
  RON: { code: 'RON', symbol: 'lei', name: 'Romanian Leu', decimals: 2, thousandSeparator: '.', decimalSeparator: ',' },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', decimals: 2, thousandSeparator: ' ', decimalSeparator: ',' },
  UAH: { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', decimals: 2, thousandSeparator: ' ', decimalSeparator: ',' },
};

// Country to currency mapping
export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // Africa
  TZ: 'TZS', KE: 'KES', UG: 'UGX', RW: 'RWF',
  NG: 'NGN', GH: 'GHS', ZA: 'ZAR', ZM: 'ZMW',
  BW: 'BWP', MW: 'MWK', ET: 'ETB', EG: 'EGP',
  MA: 'MAD', SN: 'XOF', CI: 'XOF', CM: 'XAF',
  
  // Asia
  IN: 'INR', PH: 'PHP', ID: 'IDR', MY: 'MYR',
  SG: 'SGD', TH: 'THB', VN: 'VND', JP: 'JPY',
  CN: 'CNY', KR: 'KRW', PK: 'PKR', BD: 'BDT',
  LK: 'LKR', NP: 'NPR',
  
  // Middle East
  AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD',
  BH: 'BHD', OM: 'OMR', JO: 'JOD', IL: 'ILS',
  TR: 'TRY',
  
  // Americas
  US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL',
  AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN',
  
  // Oceania
  AU: 'AUD', NZ: 'NZD',
  
  // Europe
  GB: 'GBP', DE: 'EUR', FR: 'EUR', IT: 'EUR',
  ES: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR',
  PT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK',
  PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON',
  RU: 'RUB', UA: 'UAH',
};

/**
 * Auto-detect country from browser/device
 * Returns country code (e.g., 'TZ', 'US', 'KE')
 */
export async function detectCountry(): Promise<string> {
  try {
    // Try to get from browser locale first
    if (typeof navigator !== 'undefined' && navigator.language) {
      const locale = navigator.language;
      const parts = locale.split('-');
      if (parts.length >= 2) {
        const country = parts[1].toUpperCase();
        if (COUNTRY_CURRENCY_MAP[country]) {
          return country;
        }
      }
    }
    
    // Try IP-based geolocation as fallback (using free API)
    const response = await fetch('https://ipapi.co/json/', { 
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.country_code && COUNTRY_CURRENCY_MAP[data.country_code]) {
        return data.country_code;
      }
    }
  } catch (error) {
    console.log('Country detection failed:', error);
  }
  
  // Default to US if detection fails
  return 'US';
}

/**
 * Get currency for a country
 */
export function getCurrencyForCountry(countryCode: string): CurrencyInfo {
  const currencyCode = COUNTRY_CURRENCY_MAP[countryCode] || 'USD';
  return CURRENCIES[currencyCode] || CURRENCIES.USD;
}

/**
 * Format amount with currency
 */
export function formatCurrency(
  amount: number, 
  currencyCode: string = 'USD',
  showSymbol: boolean = true,
  abbreviated: boolean = false
): string {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
  
  let formattedAmount: string;
  
  if (abbreviated && Math.abs(amount) >= 1000000) {
    formattedAmount = (amount / 1000000).toFixed(1) + 'M';
  } else if (abbreviated && Math.abs(amount) >= 1000) {
    formattedAmount = (amount / 1000).toFixed(1) + 'K';
  } else {
    // Format with proper separators
    const fixed = amount.toFixed(currency.decimals);
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandSeparator);
    formattedAmount = currency.decimals > 0 
      ? parts.join(currency.decimalSeparator)
      : parts[0];
  }
  
  return showSymbol ? `${currency.symbol}${formattedAmount}` : formattedAmount;
}

/**
 * Get all available currencies for dropdown
 */
export function getAvailableCurrencies(): { code: string; name: string; symbol: string }[] {
  return Object.values(CURRENCIES)
    .map(c => ({ code: c.code, name: c.name, symbol: c.symbol }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get currencies by region for grouped dropdown
 */
export function getCurrenciesByRegion(): Record<string, CurrencyInfo[]> {
  return {
    'Africa': [
      CURRENCIES.TZS, CURRENCIES.KES, CURRENCIES.UGX, CURRENCIES.RWF,
      CURRENCIES.NGN, CURRENCIES.GHS, CURRENCIES.ZAR, CURRENCIES.ZMW,
      CURRENCIES.ETB, CURRENCIES.EGP, CURRENCIES.XOF,
    ].filter(Boolean),
    'Asia': [
      CURRENCIES.INR, CURRENCIES.PHP, CURRENCIES.IDR, CURRENCIES.MYR,
      CURRENCIES.SGD, CURRENCIES.THB, CURRENCIES.JPY, CURRENCIES.CNY,
      CURRENCIES.KRW, CURRENCIES.PKR, CURRENCIES.BDT,
    ].filter(Boolean),
    'Middle East': [
      CURRENCIES.AED, CURRENCIES.SAR, CURRENCIES.QAR, CURRENCIES.KWD,
      CURRENCIES.ILS, CURRENCIES.TRY,
    ].filter(Boolean),
    'Americas': [
      CURRENCIES.USD, CURRENCIES.CAD, CURRENCIES.MXN, CURRENCIES.BRL,
      CURRENCIES.ARS, CURRENCIES.CLP, CURRENCIES.COP, CURRENCIES.PEN,
    ].filter(Boolean),
    'Europe': [
      CURRENCIES.EUR, CURRENCIES.GBP, CURRENCIES.CHF, CURRENCIES.SEK,
      CURRENCIES.NOK, CURRENCIES.DKK, CURRENCIES.PLN, CURRENCIES.RUB,
    ].filter(Boolean),
    'Oceania': [
      CURRENCIES.AUD, CURRENCIES.NZD,
    ].filter(Boolean),
  };
}
