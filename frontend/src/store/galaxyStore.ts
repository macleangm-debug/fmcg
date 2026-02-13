import { create } from 'zustand';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export type GalaxyAppId = 'retail_pro' | 'inventory' | 'payments' | 'bulk_sms' | 'invoicing' | 'accounting' | 'kwikpay' | 'unitxt' | 'crm' | 'expenses';
export type GalaxyAppStatus = 'available' | 'coming_soon' | 'beta';
export type SubscriptionStatus = 'active' | 'expired' | 'grace_period' | 'suspended';

export interface GalaxyApp {
  app_id: GalaxyAppId;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  status: GalaxyAppStatus;
  route: string;
  features: string[];
  pricing: string;
}

export interface AppSubscription {
  status: SubscriptionStatus;
  subscribed_at?: string;
  expires_at?: string;
  plan: string;
}

export interface UserAppAccess {
  app: GalaxyApp;
  subscription: AppSubscription;
}

// Ecosystem types
export interface EcosystemProduct {
  id: string;
  product_id: string;
  product_name: string;
  product_icon: string;
  product_color: string;
  status: 'active' | 'trial' | 'inactive';
  plan?: string;
  linked_at?: string;
  setup_completed: boolean;
  setup_route: string;
}

export interface AvailableProduct {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  color: string;
  category: string;
}

interface GalaxyState {
  apps: GalaxyApp[];
  userAppAccess: UserAppAccess[];
  // Ecosystem state
  linkedProducts: EcosystemProduct[];
  availableProducts: AvailableProduct[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchApps: () => Promise<void>;
  fetchUserAccess: (token: string) => Promise<void>;
  fetchEcosystemProducts: (token: string) => Promise<void>;
  subscribeToApp: (token: string, appId: GalaxyAppId) => Promise<{ success: boolean; message: string }>;
  linkProduct: (token: string, productId: string, plan?: string) => Promise<{ success: boolean; message: string; setup_route?: string }>;
  unlinkProduct: (token: string, productId: string, reason?: string) => Promise<{ success: boolean; message: string }>;
  generateSSOToken: (token: string, appId: GalaxyAppId) => Promise<string | null>;
  hasAppAccess: (appId: GalaxyAppId) => boolean;
  isProductLinked: (productId: string) => boolean;
  clearError: () => void;
}

export const useGalaxyStore = create<GalaxyState>((set, get) => ({
  apps: [],
  userAppAccess: [],
  linkedProducts: [],
  availableProducts: [],
  isLoading: false,
  error: null,

  fetchApps: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.get(`${API_URL}/api/galaxy/apps`);
      set({ apps: response.data, isLoading: false });
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to fetch apps';
      set({ error: message, isLoading: false });
    }
  },

  fetchUserAccess: async (token: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.get(`${API_URL}/api/galaxy/user/access`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ 
        userAppAccess: response.data.app_access || [],
        apps: response.data.available_apps || [],
        isLoading: false 
      });
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to fetch user access';
      set({ error: message, isLoading: false });
    }
  },

  fetchEcosystemProducts: async (token: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.get(`${API_URL}/api/ecosystem/my-products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ 
        linkedProducts: response.data.linked || [],
        availableProducts: response.data.available || [],
        isLoading: false 
      });
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to fetch ecosystem products';
      set({ error: message, isLoading: false });
    }
  },

  subscribeToApp: async (token: string, appId: GalaxyAppId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post(
        `${API_URL}/api/galaxy/subscribe/${appId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh user access after subscription
      await get().fetchUserAccess(token);
      
      set({ isLoading: false });
      return { success: true, message: response.data.message };
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to subscribe';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  linkProduct: async (token: string, productId: string, plan?: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post(
        `${API_URL}/api/ecosystem/link`,
        { product_id: productId, plan },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh ecosystem products after linking
      await get().fetchEcosystemProducts(token);
      
      set({ isLoading: false });
      return { 
        success: true, 
        message: response.data.message,
        setup_route: response.data.setup_route 
      };
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to link product';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  unlinkProduct: async (token: string, productId: string, reason?: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post(
        `${API_URL}/api/ecosystem/unlink`,
        { product_id: productId, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh ecosystem products after unlinking
      await get().fetchEcosystemProducts(token);
      
      set({ isLoading: false });
      return { success: true, message: response.data.message };
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to unlink product';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  generateSSOToken: async (token: string, appId: GalaxyAppId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post(
        `${API_URL}/api/galaxy/sso/token`,
        { app_id: appId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Store the app-specific token
      const appToken = response.data.app_token;
      await AsyncStorage.setItem(`sso_token_${appId}`, appToken);
      
      set({ isLoading: false });
      return appToken;
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to generate SSO token';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  hasAppAccess: (appId: GalaxyAppId) => {
    const { userAppAccess } = get();
    const access = userAppAccess.find(a => a.app.app_id === appId);
    return access?.subscription?.status === 'active';
  },

  isProductLinked: (productId: string) => {
    const { linkedProducts } = get();
    return linkedProducts.some(p => p.product_id === productId && (p.status === 'active' || p.status === 'trial'));
  },

  clearError: () => set({ error: null }),
}));
