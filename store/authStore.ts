// store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/user';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  logout: () => void;
  updateCredit: (amount: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      isInitialized: false,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setInitialized: (isInitialized) => set({ isInitialized }),

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          document.cookie =
            'bukeng_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        }
        set({ user: null, token: null, error: null });
      },

      updateCredit: (amount) =>
        set((state) => {
          if (!state.user) return state;
          return {
            user: {
              ...state.user,
              availableCredit: Math.max(0, state.user.availableCredit - amount),
              updatedAt: new Date(),
            },
          };
        }),
    }),
    {
      name: 'bukeng-auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
