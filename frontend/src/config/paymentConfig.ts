// Country-based payment methods configuration
// Each country has specific payment options available

export interface MobileMoneyProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  ussdCode?: string;
}

export interface CountryPaymentConfig {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  phoneCode: string;
  paymentMethods: string[];
  mobileMoneyProviders: MobileMoneyProvider[];
  bankTransferEnabled: boolean;
  cardEnabled: boolean;
}

export const COUNTRY_PAYMENT_CONFIGS: Record<string, CountryPaymentConfig> = {
  // East Africa
  TZ: {
    code: 'TZ',
    name: 'Tanzania',
    currency: 'TZS',
    currencySymbol: 'TSh',
    phoneCode: '+255',
    paymentMethods: ['cash', 'mobile_money', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [
      { id: 'mpesa', name: 'M-Pesa', icon: 'phone-portrait', color: '#E31837' },
      { id: 'tigopesa', name: 'Tigo Pesa', icon: 'phone-portrait', color: '#0066B3' },
      { id: 'airtelmoney', name: 'Airtel Money', icon: 'phone-portrait', color: '#ED1C24' },
      { id: 'halopesa', name: 'HaloPesa', icon: 'phone-portrait', color: '#FF6B00' },
    ],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  KE: {
    code: 'KE',
    name: 'Kenya',
    currency: 'KES',
    currencySymbol: 'KSh',
    phoneCode: '+254',
    paymentMethods: ['cash', 'mobile_money', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [
      { id: 'mpesa', name: 'M-Pesa', icon: 'phone-portrait', color: '#4CAF50' },
      { id: 'airtelmoney', name: 'Airtel Money', icon: 'phone-portrait', color: '#ED1C24' },
    ],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  UG: {
    code: 'UG',
    name: 'Uganda',
    currency: 'UGX',
    currencySymbol: 'USh',
    phoneCode: '+256',
    paymentMethods: ['cash', 'mobile_money', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [
      { id: 'mtnmomo', name: 'MTN Mobile Money', icon: 'phone-portrait', color: '#FFCC00' },
      { id: 'airtelmoney', name: 'Airtel Money', icon: 'phone-portrait', color: '#ED1C24' },
    ],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  RW: {
    code: 'RW',
    name: 'Rwanda',
    currency: 'RWF',
    currencySymbol: 'FRw',
    phoneCode: '+250',
    paymentMethods: ['cash', 'mobile_money', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [
      { id: 'mtnmomo', name: 'MTN Mobile Money', icon: 'phone-portrait', color: '#FFCC00' },
      { id: 'airtelmoney', name: 'Airtel Money', icon: 'phone-portrait', color: '#ED1C24' },
    ],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  
  // West Africa
  NG: {
    code: 'NG',
    name: 'Nigeria',
    currency: 'NGN',
    currencySymbol: '₦',
    phoneCode: '+234',
    paymentMethods: ['cash', 'mobile_money', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [
      { id: 'opay', name: 'OPay', icon: 'phone-portrait', color: '#1DCE80' },
      { id: 'palmpay', name: 'PalmPay', icon: 'phone-portrait', color: '#6B4EFF' },
      { id: 'kuda', name: 'Kuda', icon: 'phone-portrait', color: '#40196D' },
    ],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  GH: {
    code: 'GH',
    name: 'Ghana',
    currency: 'GHS',
    currencySymbol: 'GH₵',
    phoneCode: '+233',
    paymentMethods: ['cash', 'mobile_money', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [
      { id: 'mtnmomo', name: 'MTN Mobile Money', icon: 'phone-portrait', color: '#FFCC00' },
      { id: 'vodafonecash', name: 'Vodafone Cash', icon: 'phone-portrait', color: '#E60000' },
      { id: 'airteltigo', name: 'AirtelTigo Money', icon: 'phone-portrait', color: '#ED1C24' },
    ],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  
  // Southern Africa
  ZA: {
    code: 'ZA',
    name: 'South Africa',
    currency: 'ZAR',
    currencySymbol: 'R',
    phoneCode: '+27',
    paymentMethods: ['cash', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [], // Less common in SA
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  ZM: {
    code: 'ZM',
    name: 'Zambia',
    currency: 'ZMW',
    currencySymbol: 'ZK',
    phoneCode: '+260',
    paymentMethods: ['cash', 'mobile_money', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [
      { id: 'mtnmomo', name: 'MTN Mobile Money', icon: 'phone-portrait', color: '#FFCC00' },
      { id: 'airtelmoney', name: 'Airtel Money', icon: 'phone-portrait', color: '#ED1C24' },
    ],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  
  // Asia
  IN: {
    code: 'IN',
    name: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    phoneCode: '+91',
    paymentMethods: ['cash', 'mobile_money', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [
      { id: 'paytm', name: 'Paytm', icon: 'phone-portrait', color: '#00BAF2' },
      { id: 'phonepe', name: 'PhonePe', icon: 'phone-portrait', color: '#5F259F' },
      { id: 'gpay', name: 'Google Pay', icon: 'phone-portrait', color: '#4285F4' },
    ],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  PH: {
    code: 'PH',
    name: 'Philippines',
    currency: 'PHP',
    currencySymbol: '₱',
    phoneCode: '+63',
    paymentMethods: ['cash', 'mobile_money', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [
      { id: 'gcash', name: 'GCash', icon: 'phone-portrait', color: '#007DFE' },
      { id: 'maya', name: 'Maya', icon: 'phone-portrait', color: '#00D66C' },
    ],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  ID: {
    code: 'ID',
    name: 'Indonesia',
    currency: 'IDR',
    currencySymbol: 'Rp',
    phoneCode: '+62',
    paymentMethods: ['cash', 'mobile_money', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [
      { id: 'gopay', name: 'GoPay', icon: 'phone-portrait', color: '#00AA13' },
      { id: 'ovo', name: 'OVO', icon: 'phone-portrait', color: '#4C3494' },
      { id: 'dana', name: 'DANA', icon: 'phone-portrait', color: '#118EEA' },
    ],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  
  // Americas
  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    phoneCode: '+1',
    paymentMethods: ['cash', 'card', 'mobile_money', 'credit'],
    mobileMoneyProviders: [
      { id: 'venmo', name: 'Venmo', icon: 'phone-portrait', color: '#008CFF' },
      { id: 'cashapp', name: 'Cash App', icon: 'phone-portrait', color: '#00D632' },
      { id: 'zelle', name: 'Zelle', icon: 'phone-portrait', color: '#6D1ED4' },
    ],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    phoneCode: '+44',
    paymentMethods: ['cash', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    currency: 'CAD',
    currencySymbol: 'C$',
    phoneCode: '+1',
    paymentMethods: ['cash', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  
  // Europe
  EU: {
    code: 'EU',
    name: 'European Union',
    currency: 'EUR',
    currencySymbol: '€',
    phoneCode: '+',
    paymentMethods: ['cash', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    currency: 'EUR',
    currencySymbol: '€',
    phoneCode: '+49',
    paymentMethods: ['cash', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  FR: {
    code: 'FR',
    name: 'France',
    currency: 'EUR',
    currencySymbol: '€',
    phoneCode: '+33',
    paymentMethods: ['cash', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  
  // Middle East
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: 'د.إ',
    phoneCode: '+971',
    paymentMethods: ['cash', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  SA: {
    code: 'SA',
    name: 'Saudi Arabia',
    currency: 'SAR',
    currencySymbol: '﷼',
    phoneCode: '+966',
    paymentMethods: ['cash', 'card', 'mobile_money', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [
      { id: 'stcpay', name: 'STC Pay', icon: 'phone-portrait', color: '#4B0082' },
    ],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
  
  // Default / International
  INT: {
    code: 'INT',
    name: 'International',
    currency: 'USD',
    currencySymbol: '$',
    phoneCode: '+',
    paymentMethods: ['cash', 'card', 'bank_transfer', 'credit'],
    mobileMoneyProviders: [],
    bankTransferEnabled: true,
    cardEnabled: true,
  },
};

// Get payment config for a country
export function getPaymentConfigForCountry(countryCode: string): CountryPaymentConfig {
  return COUNTRY_PAYMENT_CONFIGS[countryCode] || COUNTRY_PAYMENT_CONFIGS.INT;
}

// Get all available countries
export function getAvailableCountries(): { code: string; name: string; currency: string }[] {
  return Object.values(COUNTRY_PAYMENT_CONFIGS)
    .filter(c => c.code !== 'INT')
    .map(c => ({ code: c.code, name: c.name, currency: c.currency }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Payment method display config
export const PAYMENT_METHOD_CONFIG = {
  cash: {
    id: 'cash',
    name: 'Cash',
    icon: 'cash-outline',
    color: '#10B981',
    bgColor: '#D1FAE5',
    requiresInternet: false,
  },
  card: {
    id: 'card',
    name: 'Card',
    icon: 'card-outline',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    requiresInternet: true,
  },
  mobile_money: {
    id: 'mobile_money',
    name: 'Mobile Money',
    icon: 'phone-portrait-outline',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    requiresInternet: true,
  },
  bank_transfer: {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    icon: 'business-outline',
    color: '#6366F1',
    bgColor: '#E0E7FF',
    requiresInternet: true,
  },
  credit: {
    id: 'credit',
    name: 'Credit',
    icon: 'time-outline',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    requiresInternet: false,
  },
  kwikpay: {
    id: 'kwikpay',
    name: 'KwikPay',
    icon: 'flash-outline',
    color: '#EC4899',
    bgColor: '#FCE7F3',
    requiresInternet: true,
  },
};
