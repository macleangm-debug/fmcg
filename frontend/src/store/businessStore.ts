import { create } from 'zustand';
import { businessApi } from '../api/client';

interface BusinessSettings {
  name: string;
  currency: string;
  currencySymbol: string;
  countryCode: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  payment_details?: string;
  footer_message?: string;
}

interface BusinessStore {
  settings: BusinessSettings;
  businessDetails: BusinessSettings; // Alias for settings
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  formatCurrency: (amount: number, compact?: boolean) => string;
  formatNumber: (value: number, decimals?: number) => string;
  formatPhone: (phone: string) => string;
  getLastNineDigits: (phone: string) => string;
}

// Currency symbol mapping
const currencySymbols: { [key: string]: string } = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'KES': 'KSh',
  'TZS': 'TSh',
  'UGX': 'USh',
  'NGN': '₦',
  'ZAR': 'R',
  'INR': '₹',
  'JPY': '¥',
  'CNY': '¥',
  'AUD': 'A$',
  'CAD': 'C$',
  'CHF': 'CHF',
  'AED': 'د.إ',
  'SAR': '﷼',
  'BRL': 'R$',
  'MXN': 'MX$',
  'RWF': 'FRw',
  'ETB': 'Br',
  'GHS': 'GH₵',
};

export const useBusinessStore = create<BusinessStore>((set, get) => ({
  settings: {
    name: '',
    currency: 'USD',
    currencySymbol: '$',
    countryCode: '+255',
    country: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    payment_details: '',
    footer_message: '',
  },
  // businessDetails is a direct reference (will be same as settings)
  businessDetails: {
    name: '',
    currency: 'USD',
    currencySymbol: '$',
    countryCode: '+255',
    country: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    payment_details: '',
    footer_message: '',
  },
  isLoading: false,

  loadSettings: async () => {
    try {
      set({ isLoading: true });
      const response = await businessApi.get();
      const data = response.data;
      
      const currency = data.currency || 'USD';
      const currencySymbol = currencySymbols[currency] || currency;
      
      const businessData = {
        name: data.name || '',
        currency: currency,
        currencySymbol: currencySymbol,
        countryCode: data.country_code || '+255',
        country: data.country || '',
        city: data.city || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        payment_details: data.payment_details || '',
        footer_message: data.footer_message || '',
      };
      
      set({
        settings: businessData,
        businessDetails: businessData,
        isLoading: false,
      });
    } catch (error) {
      console.log('Failed to load business settings:', error);
      set({ isLoading: false });
    }
  },

  formatCurrency: (amount: number, compact: boolean = false) => {
    const { currencySymbol } = get().settings;
    
    // For compact display (K, M, B) only when explicitly requested
    if (compact && Math.abs(amount) >= 1000) {
      if (Math.abs(amount) >= 1000000000) {
        // Billions
        const value = amount / 1000000000;
        return `${currencySymbol} ${value.toFixed(1)}B`;
      } else if (Math.abs(amount) >= 1000000) {
        // Millions
        const value = amount / 1000000;
        return `${currencySymbol} ${value.toFixed(1)}M`;
      } else if (Math.abs(amount) >= 1000) {
        // Thousands
        const value = amount / 1000;
        return `${currencySymbol} ${value.toFixed(1)}K`;
      }
    }
    
    // For all amounts - use thousands separator (commas)
    const formattedAmount = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    // Add space between currency symbol and amount
    return `${currencySymbol} ${formattedAmount}`;
  },

  formatNumber: (value: number, decimals: number = 0) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },

  formatPhone: (phone: string) => {
    const { countryCode } = get().settings;
    const digits = get().getLastNineDigits(phone);
    return `${countryCode}${digits}`;
  },

  getLastNineDigits: (phone: string) => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    // Take last 9 digits (removes country code and leading zeros)
    return digitsOnly.slice(-9);
  },
}));
