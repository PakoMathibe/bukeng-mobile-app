// store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/user';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;  // Track hydration state
  
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
  
  // Selectors (computed values)
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      _hasHydrated: false,

      setUser: (user) => set({ user }),
      
      setToken: (token) => set({ token }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      logout: () => {
        // Clear cookie
        document.cookie = 'bukeng_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        // Clear localStorage (handled by persist middleware)
        set({ user: null, token: null, error: null });
      },
      
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      
      isAuthenticated: () => {
        return !!get().user && !!get().token;
      },
    }),
    {
      name: 'bukeng-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);