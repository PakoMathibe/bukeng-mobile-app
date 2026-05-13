// store/paymentStore.ts
import { create } from 'zustand';
import {
  Order,
  PaymentIntent,
  Instalment,
  Transaction,
} from '@/types/transaction';

interface PaymentState {
  // State
  currentOrder: Order | null;
  paymentIntent: PaymentIntent | null;
  orders: Order[];
  instalments: Instalment[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  isProcessing: boolean;

  // Actions
  setCurrentOrder: (order: Order | null) => void;
  setPaymentIntent: (intent: PaymentIntent | null) => void;
  addOrder: (order: Order) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  setOrders: (orders: Order[]) => void;
  setInstalments: (instalments: Instalment[]) => void;
  updateInstalment: (
    instalmentId: string,
    updates: Partial<Instalment>
  ) => void;
  addTransaction: (transaction: Transaction) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setProcessing: (isProcessing: boolean) => void;
  clearCurrentOrder: () => void;
  clearPaymentState: () => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  currentOrder: null,
  paymentIntent: null,
  orders: [],
  instalments: [],
  transactions: [],
  isLoading: false,
  error: null,
  isProcessing: false,

  setCurrentOrder: (order) => set({ currentOrder: order }),

  setPaymentIntent: (intent) => set({ paymentIntent: intent }),

  addOrder: (order) =>
    set((state) => ({
      orders: [order, ...state.orders],
    })),

  updateOrder: (orderId, updates) =>
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === orderId
          ? { ...order, ...updates, updatedAt: new Date() }
          : order
      ),
      currentOrder:
        state.currentOrder?.id === orderId
          ? { ...state.currentOrder, ...updates, updatedAt: new Date() }
          : state.currentOrder,
    })),

  setOrders: (orders) => set({ orders }),

  setInstalments: (instalments) => set({ instalments }),

  updateInstalment: (instalmentId, updates) =>
    set((state) => ({
      instalments: state.instalments.map((instalment) =>
        instalment.id === instalmentId
          ? { ...instalment, ...updates }
          : instalment
      ),
      orders: state.orders.map((order) => ({
        ...order,
        instalments: order.instalments.map((instalment) =>
          instalment.id === instalmentId
            ? { ...instalment, ...updates }
            : instalment
        ),
      })),
      currentOrder: state.currentOrder
        ? {
            ...state.currentOrder,
            instalments: state.currentOrder.instalments.map((instalment) =>
              instalment.id === instalmentId
                ? { ...instalment, ...updates }
                : instalment
            ),
          }
        : null,
    })),

  addTransaction: (transaction) =>
    set((state) => ({
      transactions: [transaction, ...state.transactions],
    })),

  setTransactions: (transactions) => set({ transactions }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setProcessing: (isProcessing) => set({ isProcessing }),

  clearCurrentOrder: () => set({ currentOrder: null, paymentIntent: null }),

  clearPaymentState: () =>
    set({
      currentOrder: null,
      paymentIntent: null,
      error: null,
      isProcessing: false,
    }),
}));
