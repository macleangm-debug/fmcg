/**
 * Currency Service
 * Handles multi-currency support including detection, conversion, and display
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import axios from 'axios';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 
              process.env.EXPO_PUBLIC_BACKEND_URL || 
              '/api';

// Currency configuration with display info
export const SUPPORTED_CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar', code: 'USD', locale: 'en-US' },
  KES: { symbol: 'KSh', name: 'Kenyan Shilling', code: 'KES', locale: 'sw-KE' },
  TZS: { symbol: 'TSh', name: 'Tanzanian Shilling', code: 'TZS', locale: 'sw-TZ' },
  UGX: { symbol: 'USh', name: 'Ugandan Shilling', code: 'UGX', locale: 'en-UG' },
  RWF: { symbol: 'FRw', name: 'Rwandan Franc', code: 'RWF', locale: 'rw-RW' },
  GHS: { symbol: 'GH₵', name: 'Ghanaian Cedi', code: 'GHS', locale: 'en-GH' },
  NGN: { symbol: '₦', name: 'Nigerian Naira', code: 'NGN', locale: 'en-NG' },
  ZAR: { symbol: 'R', name: 'South African Rand', code: 'ZAR', locale: 'en-ZA' },
};

// Country to currency mapping
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  KE: 'KES', // Kenya
  TZ: 'TZS', // Tanzania
  UG: 'UGX', // Uganda
  RW: 'RWF', // Rwanda
  GH: 'GHS', // Ghana
  NG: 'NGN', // Nigeria
  ZA: 'ZAR', // South Africa
  US: 'USD', // USA
  GB: 'USD', // UK - default to USD
};

export interface CurrencyRate {
  currency: string;
  baseRate: number;
  customerRate: number;
  marginPercent: number;
}

interface CachedRates {
  rates: Record<string, CurrencyRate>;
  timestamp: number;
}

const CACHE_KEY = 'currency_rates_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

class CurrencyService {
  private cachedRates: CachedRates | null = null;
  private detectedCurrency: string | null = null;
  private userSelectedCurrency: string | null = null;

  /**
   * Get auth headers for API calls
   */
  private async getAuthHeaders() {
    const token = await AsyncStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Detect user's country and return corresponding currency
   */
  async detectUserCurrency(): Promise<string> {
    // First check if user has manually selected a currency
    const savedCurrency = await AsyncStorage.getItem('user_selected_currency');
    if (savedCurrency && SUPPORTED_CURRENCIES[savedCurrency as keyof typeof SUPPORTED_CURRENCIES]) {
      this.userSelectedCurrency = savedCurrency;
      return savedCurrency;
    }

    // Try to detect from IP geolocation (free service)
    try {
      const response = await fetch('https://ipapi.co/json/', { 
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const countryCode = data.country_code;
        const currency = COUNTRY_CURRENCY_MAP[countryCode] || 'USD';
        this.detectedCurrency = currency;
        return currency;
      }
    } catch (error) {
      console.log('Could not detect currency from IP:', error);
    }

    // Fallback to USD
    return 'USD';
  }

  /**
   * Set user's preferred currency
   */
  async setUserCurrency(currency: string): Promise<void> {
    if (SUPPORTED_CURRENCIES[currency as keyof typeof SUPPORTED_CURRENCIES]) {
      this.userSelectedCurrency = currency;
      await AsyncStorage.setItem('user_selected_currency', currency);
    }
  }

  /**
   * Get current active currency
   */
  getActiveCurrency(): string {
    return this.userSelectedCurrency || this.detectedCurrency || 'USD';
  }

  /**
   * Fetch exchange rates from API (with margin applied)
   */
  async fetchRates(): Promise<Record<string, CurrencyRate>> {
    // Check cache first
    const cached = await this.loadCachedRates();
    if (cached) {
      return cached;
    }

    const rates: Record<string, CurrencyRate> = {};
    const headers = await this.getAuthHeaders();

    try {
      // Fetch rates for each supported currency
      const currencies = Object.keys(SUPPORTED_CURRENCIES).filter(c => c !== 'USD');
      
      await Promise.all(currencies.map(async (currency) => {
        try {
          const response = await axios.get(
            `${API_URL}/exchange-rates/customer-pricing/${currency}`,
            { headers }
          );
          
          rates[currency] = {
            currency,
            baseRate: response.data.base_rate,
            customerRate: response.data.customer_rate,
            marginPercent: response.data.margin_percent,
          };
        } catch (err) {
          console.log(`Could not fetch rate for ${currency}`);
        }
      }));

      // USD is always 1:1
      rates['USD'] = {
        currency: 'USD',
        baseRate: 1,
        customerRate: 1,
        marginPercent: 0,
      };

      // Cache the rates
      await this.cacheRates(rates);
      
      return rates;
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      return this.getFallbackRates();
    }
  }

  /**
   * Load cached rates if valid
   */
  private async loadCachedRates(): Promise<Record<string, CurrencyRate> | null> {
    if (this.cachedRates && Date.now() - this.cachedRates.timestamp < CACHE_DURATION) {
      return this.cachedRates.rates;
    }

    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CachedRates = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          this.cachedRates = parsed;
          return parsed.rates;
        }
      }
    } catch (error) {
      console.log('Error loading cached rates:', error);
    }

    return null;
  }

  /**
   * Cache exchange rates
   */
  private async cacheRates(rates: Record<string, CurrencyRate>): Promise<void> {
    const cached: CachedRates = {
      rates,
      timestamp: Date.now(),
    };
    this.cachedRates = cached;
    
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch (error) {
      console.log('Error caching rates:', error);
    }
  }

  /**
   * Get fallback rates when API is unavailable
   */
  private getFallbackRates(): Record<string, CurrencyRate> {
    return {
      USD: { currency: 'USD', baseRate: 1, customerRate: 1, marginPercent: 0 },
      KES: { currency: 'KES', baseRate: 130, customerRate: 136.5, marginPercent: 5 },
      TZS: { currency: 'TZS', baseRate: 2500, customerRate: 2625, marginPercent: 5 },
      UGX: { currency: 'UGX', baseRate: 3700, customerRate: 3885, marginPercent: 5 },
      RWF: { currency: 'RWF', baseRate: 1200, customerRate: 1260, marginPercent: 5 },
      GHS: { currency: 'GHS', baseRate: 12, customerRate: 12.6, marginPercent: 5 },
      NGN: { currency: 'NGN', baseRate: 1500, customerRate: 1575, marginPercent: 5 },
      ZAR: { currency: 'ZAR', baseRate: 18, customerRate: 18.9, marginPercent: 5 },
    };
  }

  /**
   * Convert USD to local currency
   */
  convertToLocal(usdAmount: number, currency: string, rates: Record<string, CurrencyRate>): number {
    const rate = rates[currency];
    if (!rate) return usdAmount;
    return Math.round(usdAmount * rate.customerRate * 100) / 100;
  }

  /**
   * Convert local currency to USD
   */
  convertToUSD(localAmount: number, currency: string, rates: Record<string, CurrencyRate>): number {
    const rate = rates[currency];
    if (!rate) return localAmount;
    return Math.round((localAmount / rate.customerRate) * 100) / 100;
  }

  /**
   * Format amount in specified currency
   */
  formatCurrency(amount: number, currency: string): string {
    const config = SUPPORTED_CURRENCIES[currency as keyof typeof SUPPORTED_CURRENCIES];
    if (!config) {
      return `$${amount.toFixed(2)}`;
    }

    // Format with locale-appropriate separators
    try {
      return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: config.code,
        minimumFractionDigits: 0,
        maximumFractionDigits: currency === 'USD' ? 2 : 0,
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `${config.symbol}${amount.toLocaleString()}`;
    }
  }

  /**
   * Get currency display info
   */
  getCurrencyInfo(currency: string) {
    return SUPPORTED_CURRENCIES[currency as keyof typeof SUPPORTED_CURRENCIES] || SUPPORTED_CURRENCIES.USD;
  }

  /**
   * Get all supported currencies for selection
   */
  getAllCurrencies() {
    return Object.values(SUPPORTED_CURRENCIES);
  }
}

export const currencyService = new CurrencyService();
export default currencyService;
