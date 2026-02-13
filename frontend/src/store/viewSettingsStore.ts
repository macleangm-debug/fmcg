import { create } from 'zustand';

export type ViewMode = 'grid' | 'table';

interface ViewSettingsState {
  // View mode for different sections
  productsView: ViewMode;
  customersView: ViewMode;
  categoriesView: ViewMode;
  staffView: ViewMode;
  expensesView: ViewMode;
  promotionsView: ViewMode;
  stockView: ViewMode;
  ordersView: ViewMode;
  
  // Setters
  setProductsView: (mode: ViewMode) => void;
  setCustomersView: (mode: ViewMode) => void;
  setCategoriesView: (mode: ViewMode) => void;
  setStaffView: (mode: ViewMode) => void;
  setExpensesView: (mode: ViewMode) => void;
  setPromotionsView: (mode: ViewMode) => void;
  setStockView: (mode: ViewMode) => void;
  setOrdersView: (mode: ViewMode) => void;
}

export const useViewSettingsStore = create<ViewSettingsState>()((set) => ({
  // Default to table view for web
  productsView: 'table',
  customersView: 'table',
  categoriesView: 'table',
  staffView: 'table',
  expensesView: 'table',
  promotionsView: 'table',
  stockView: 'table',
  ordersView: 'table',
  
  setProductsView: (mode) => set({ productsView: mode }),
  setCustomersView: (mode) => set({ customersView: mode }),
  setCategoriesView: (mode) => set({ categoriesView: mode }),
  setStaffView: (mode) => set({ staffView: mode }),
  setExpensesView: (mode) => set({ expensesView: mode }),
  setPromotionsView: (mode) => set({ promotionsView: mode }),
  setStockView: (mode) => set({ stockView: mode }),
  setOrdersView: (mode) => set({ ordersView: mode }),
}));
