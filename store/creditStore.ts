// store/creditStore.ts
import { create } from 'zustand';
import { CreditSummary, CreditHistory } from '@/types/credit';
import { CreditService } from '@/domains/credit/creditService';

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
  refreshCredit: (userId: string) => Promise<void>;
  resetCredit: () => void;
  clearError: () => void;
}

export const useCreditStore = create<CreditState>()(
  (set, get) => ({
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
            utilizationPercentage: state.summary.totalLimit > 0 
              ? (newUsed / state.summary.totalLimit) * 100 
              : 0,
            lastUpdated: new Date(),
          },
        };
      }),

    refreshCredit: async (userId: string) => {
      set({ isLoading: true, error: null });
      
      try {
        // Use CreditService (singular, not creditService)
        const summary = await CreditService.getCreditSummary(userId);
        const history = await CreditService.getCreditHistory(userId);
        
        set({ summary, history });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to refresh credit data';
        set({ error: errorMessage });
        console.error('Failed to refresh credit:', error);
      } finally {
        set({ isLoading: false });
      }
    },

    resetCredit: () => {
      set({
        summary: null,
        history: null,
        isLoading: false,
        error: null,
      });
    },

    clearError: () => {
      set({ error: null });
    },
  })
);