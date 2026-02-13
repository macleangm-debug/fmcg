import { create } from 'zustand';

export interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_amount: number;
  subtotal: number;
  image?: string;
}

interface CartState {
  items: CartItem[];
  customer_id: string | null;
  customer_name: string | null;
  addItem: (product: any, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  applyDiscount: (productId: string, discount: number) => void;
  setCustomer: (customerId: string | null, customerName: string | null) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTaxTotal: () => number;
  getDiscountTotal: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer_id: null,
  customer_name: null,

  addItem: (product: any, quantity: number = 1) => {
    const { items } = get();
    const existingIndex = items.findIndex(item => item.product_id === product.id);
    
    if (existingIndex >= 0) {
      const newItems = [...items];
      const newQty = newItems[existingIndex].quantity + quantity;
      const taxAmount = (product.price * newQty * (product.tax_rate || 0)) / 100;
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        quantity: newQty,
        tax_amount: taxAmount,
        subtotal: product.price * newQty,
      };
      set({ items: newItems });
    } else {
      const taxAmount = (product.price * quantity * (product.tax_rate || 0)) / 100;
      const newItem: CartItem = {
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: product.price,
        discount: 0,
        tax_amount: taxAmount,
        subtotal: product.price * quantity,
        image: product.image,
      };
      set({ items: [...items, newItem] });
    }
  },

  removeItem: (productId: string) => {
    const { items } = get();
    set({ items: items.filter(item => item.product_id !== productId) });
  },

  updateQuantity: (productId: string, quantity: number) => {
    const { items } = get();
    if (quantity <= 0) {
      set({ items: items.filter(item => item.product_id !== productId) });
      return;
    }
    
    const newItems = items.map(item => {
      if (item.product_id === productId) {
        const subtotal = item.unit_price * quantity;
        return {
          ...item,
          quantity,
          subtotal,
        };
      }
      return item;
    });
    set({ items: newItems });
  },

  applyDiscount: (productId: string, discount: number) => {
    const { items } = get();
    const newItems = items.map(item => {
      if (item.product_id === productId) {
        return { ...item, discount };
      }
      return item;
    });
    set({ items: newItems });
  },

  setCustomer: (customerId: string | null, customerName: string | null) => {
    set({ customer_id: customerId, customer_name: customerName });
  },

  clearCart: () => {
    set({ items: [], customer_id: null, customer_name: null });
  },

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.subtotal, 0);
  },

  getTaxTotal: () => {
    return get().items.reduce((sum, item) => sum + item.tax_amount, 0);
  },

  getDiscountTotal: () => {
    return get().items.reduce((sum, item) => sum + item.discount, 0);
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const tax = get().getTaxTotal();
    const discount = get().getDiscountTotal();
    return subtotal + tax - discount;
  },
}));
