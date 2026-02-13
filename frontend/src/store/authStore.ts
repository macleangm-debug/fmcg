import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin' | 'manager' | 'sales_staff' | 'finance';
  phone?: string;
  is_active: boolean;
  created_at: string;
  business_id?: string;
  business_name?: string;
}

interface SocialAuthData {
  email: string;
  name: string;
  google_id?: string;
  apple_id?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; isSuperadmin: boolean }>;
  register: (name: string, email: string, password: string, role?: string) => Promise<boolean>;
  socialLogin: (provider: 'google' | 'apple', data: SocialAuthData) => Promise<{ success: boolean; isSuperadmin?: boolean }>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });
      
      const { access_token, user } = response.data;
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      set({
        token: access_token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      
      return { success: true, isSuperadmin: user.role === 'superadmin' };
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Login failed';
      set({ error: message, isLoading: false });
      return { success: false, isSuperadmin: false };
    }
  },

  register: async (name: string, email: string, password: string, role: string = 'sales_staff') => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        name,
        email,
        password,
        role,
      });
      
      const { access_token, user } = response.data;
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      set({
        token: access_token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Registration failed';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  socialLogin: async (provider, data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post(`${API_URL}/api/auth/social`, {
        provider,
        ...data,
      });
      
      const { access_token, user } = response.data;
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      set({
        token: access_token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      
      return { success: true, isSuperadmin: user.role === 'superadmin' };
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Social login failed';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  loadUser: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
