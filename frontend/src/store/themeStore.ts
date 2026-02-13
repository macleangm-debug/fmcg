import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';
export type ViewMode = 'grid' | 'list';

interface ThemeState {
  mode: ThemeMode;
  viewMode: ViewMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  toggleViewMode: () => void;
  setViewMode: (mode: ViewMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      viewMode: 'grid',
      toggleTheme: () =>
        set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),
      setTheme: (mode) => set({ mode }),
      toggleViewMode: () =>
        set((state) => ({ viewMode: state.viewMode === 'grid' ? 'list' : 'grid' })),
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Theme colors
export const lightTheme = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#DC2626',
  sidebarBg: '#FFFFFF',
  sidebarText: '#374151',
  sidebarActiveText: '#2563EB',
  sidebarActiveBg: '#EFF6FF',
  cardBg: '#FFFFFF',
  inputBg: '#F9FAFB',
};

export const darkTheme = {
  background: '#111827',
  surface: '#1F2937',
  surfaceSecondary: '#374151',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  border: '#374151',
  primary: '#3B82F6',
  primaryLight: '#1E3A5F',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  sidebarBg: '#1F2937',
  sidebarText: '#D1D5DB',
  sidebarActiveText: '#60A5FA',
  sidebarActiveBg: '#1E3A5F',
  cardBg: '#1F2937',
  inputBg: '#374151',
};

export const getTheme = (mode: ThemeMode) => (mode === 'dark' ? darkTheme : lightTheme);
