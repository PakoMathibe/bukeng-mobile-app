// hooks/useAuth.ts
'use client';

import { useAuthStore } from '@/store/authStore';
import { AuthService } from '@/domains/auth/authService';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export function useAuth() {
  const { user, token, isLoading, setUser, setToken, setLoading, logout } = useAuthStore();
  const router = useRouter();

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
      setLoading(false);
    };
    initSession();
  }, [setUser, setLoading]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await AuthService.login(email, password);
      if (result.user) {
        setUser(result.user);
        // Store token in cookie for middleware
        document.cookie = `bukeng_token=${result.user.id}; path=/`;
        toast.success('Welcome back!');
        router.push('/dashboard');
      } else {
        toast.error(result.error || 'Login failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading, router]);

  const register = useCallback(async (data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    idNumber: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      const result = await AuthService.register(data);
      if (result.user) {
        setUser(result.user);
        document.cookie = `bukeng_token=${result.user.id}; path=/`;
        toast.success('Account created! Please complete verification.');
        router.push('/onboarding/start');
      } else {
        toast.error(result.error || 'Registration failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading, router]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await AuthService.signOut();
      logout();
      document.cookie = 'bukeng_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error: any) {
      toast.error(error.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  }, [logout, router, setLoading]);

  return {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout: signOut,
  };
}