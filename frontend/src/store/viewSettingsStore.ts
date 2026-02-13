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
  movementsView: ViewMode;
  invoiceViewMode: ViewMode;
  clientsView: ViewMode;
  invoicingProductsView: ViewMode;
  quotesView: ViewMode;
  recurringView: ViewMode;
  purchaseOrdersView: ViewMode;
  receivingView: ViewMode;
  
  // Setters
  setProductsView: (mode: ViewMode) => void;
  setCustomersView: (mode: ViewMode) => void;
  setCategoriesView: (mode: ViewMode) => void;
  setStaffView: (mode: ViewMode) => void;
  setExpensesView: (mode: ViewMode) => void;
  setPromotionsView: (mode: ViewMode) => void;
  setStockView: (mode: ViewMode) => void;
  setOrdersView: (mode: ViewMode) => void;
  setMovementsView: (mode: ViewMode) => void;
  setInvoiceViewMode: (mode: ViewMode) => void;
  setClientsView: (mode: ViewMode) => void;
  setInvoicingProductsView: (mode: ViewMode) => void;
  setQuotesView: (mode: ViewMode) => void;
  setRecurringView: (mode: ViewMode) => void;
  setPurchaseOrdersView: (mode: ViewMode) => void;
  setReceivingView: (mode: ViewMode) => void;
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
  movementsView: 'table',
  invoiceViewMode: 'table',
  clientsView: 'table',
  invoicingProductsView: 'table',
  quotesView: 'table',
  recurringView: 'grid',
  purchaseOrdersView: 'grid',
  receivingView: 'grid',
  
  setProductsView: (mode) => set({ productsView: mode }),
  setCustomersView: (mode) => set({ customersView: mode }),
  setCategoriesView: (mode) => set({ categoriesView: mode }),
  setStaffView: (mode) => set({ staffView: mode }),
  setExpensesView: (mode) => set({ expensesView: mode }),
  setPromotionsView: (mode) => set({ promotionsView: mode }),
  setStockView: (mode) => set({ stockView: mode }),
  setOrdersView: (mode) => set({ ordersView: mode }),
  setMovementsView: (mode) => set({ movementsView: mode }),
  setInvoiceViewMode: (mode) => set({ invoiceViewMode: mode }),
  setClientsView: (mode) => set({ clientsView: mode }),
  setInvoicingProductsView: (mode) => set({ invoicingProductsView: mode }),
  setQuotesView: (mode) => set({ quotesView: mode }),
  setRecurringView: (mode) => set({ recurringView: mode }),
  setPurchaseOrdersView: (mode) => set({ purchaseOrdersView: mode }),
  setReceivingView: (mode) => set({ receivingView: mode }),
}));
