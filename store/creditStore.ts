// store/creditStore.ts
import { create } from 'zustand';
import { CreditSummary, CreditHistory } from '@/types/credit';

interface CreditState {
  summary: CreditSummary | null;
  history: CreditHistory | null;
  isLoading: boolean;
  error: string | null;

  setSummary: (summary: CreditSummary | null) => void;
  setHistory: (history: CreditHistory | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  updateAvailableCredit: (amount: number) => void;
  refreshCredit: () => Promise<void>;
}

export const useCreditStore = create<CreditState>((set, get) => ({
  summary: null,
  history: null,
  isLoading: false,
  error: null,

  setSummary: (summary) => set({ summary }),
  setHistory: (history) => set({ history }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  updateAvailableCredit: (amount) =>
    set((state) => {
      if (!state.summary) return state;
      const newAvailable = Math.max(0, state.summary.availableCredit - amount);
      const newUsed = state.summary.totalLimit - newAvailable;
      return {
        summary: {
          ...state.summary,
          availableCredit: newAvailable,
          usedCredit: newUsed,
          utilizationPercentage: (newUsed / state.summary.totalLimit) * 100,
          lastUpdated: new Date(),
        },
      };
    }),

  refreshCredit: async () => {
    set({ isLoading: true, error: null });
    // This will be implemented with actual API call
    set({ isLoading: false });
  },
}));
