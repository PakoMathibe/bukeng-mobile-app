// hooks/useAuth.ts
'use client';

import { useAuthStore } from '@/store/authStore';
import { AuthService } from '@/domains/auth/authService';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';

export function useAuth() {
  const { user, token, isLoading, setUser, setToken, setLoading, logout } = useAuthStore();
  const router = useRouter();

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await AuthService.login({ email, password });
      setUser(result.user);
      setToken(result.token);
      document.cookie = `bukeng_token=${result.token}; path=/`;
      localStorage.setItem('auth_token', result.token);
      toast.success('Welcome back!');
      return result;
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setUser, setToken, setLoading]);

  const register = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const result = await AuthService.register(data);
      setUser(result.user);
      setToken(result.token);
      document.cookie = `bukeng_token=${result.token}; path=/`;
      localStorage.setItem('auth_token', result.token);
      toast.success('Account created! Please complete verification.');
      return result;
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setUser, setToken, setLoading]);

  return {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };
}