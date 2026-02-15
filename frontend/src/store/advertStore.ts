import { create } from 'zustand';
import axios from 'axios';
import { useLanguageStore } from './languageStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export interface Advert {
  id: string;
  title: string;
  description: string;
  cta_text?: string;
  cta_link?: string;
  background_color: string;
  text_color: string;
  icon?: string;
  image_url?: string;
}

interface AdvertState {
  adverts: Advert[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  fetchAdverts: (product?: string) => Promise<void>;
  clearAdverts: () => void;
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const useAdvertStore = create<AdvertState>((set, get) => ({
  adverts: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchAdverts: async (product: string = 'all') => {
    const { lastFetched, adverts } = get();
    const now = Date.now();

    // Return cached data if still valid
    if (lastFetched && now - lastFetched < CACHE_DURATION && adverts.length > 0) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const language = useLanguageStore.getState().currentLanguage;
      const response = await axios.get(`${API_URL}/api/adverts/public`, {
        params: { product, language },
      });

      set({
        adverts: response.data,
        isLoading: false,
        lastFetched: now,
      });
    } catch (error: any) {
      console.error('Failed to fetch adverts:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to load advertisements',
      });
    }
  },

  clearAdverts: () => {
    set({
      adverts: [],
      lastFetched: null,
    });
  },
}));

// Hook to get adverts with auto-fetch
export const useAdverts = (product?: string) => {
  const { adverts, isLoading, error, fetchAdverts } = useAdvertStore();
  const { currentLanguage } = useLanguageStore();

  // Re-fetch when language changes
  const fetchWithLanguage = async () => {
    useAdvertStore.getState().clearAdverts();
    await fetchAdverts(product);
  };

  return {
    adverts,
    isLoading,
    error,
    fetchAdverts: () => fetchAdverts(product),
    refetch: fetchWithLanguage,
  };
};
