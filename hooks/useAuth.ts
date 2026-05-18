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
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setUser, setToken, setLoading, router]);

  const register = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const result = await AuthService.register(data);
      setUser(result.user);
      setToken(result.token);
      document.cookie = `bukeng_token=${result.token}; path=/`;
      toast.success('Account created! Please verify your email.');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setUser, setToken, setLoading, router]);

  const signOut = useCallback(async () => {
    await AuthService.logout();
    logout();
    document.cookie = 'bukeng_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    toast.success('Logged out');
    router.push('/');
  }, [logout, router]);

  return { user, token, isLoading, isAuthenticated: !!user, login, register, logout: signOut };
}