// hooks/useAuth.ts
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/apiClient';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';

export function useAuth() {
  const { user, token, isLoading, setUser, setToken, setLoading, logout } =
    useAuthStore();
  const router = useRouter();

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const response = await apiClient.post<{
          user: typeof user;
          token: string;
        }>('/auth/login', {
          email,
          password,
        });
        setUser(response.user);
        setToken(response.token);
        toast.success('Welcome back!');
        router.push('/dashboard');
        return response;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Login failed');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setUser, setToken, setLoading, router]
  );

  const register = useCallback(
    async (data: {
      fullName: string;
      email: string;
      phoneNumber: string;
      idNumber: string;
      password: string;
    }) => {
      setLoading(true);
      try {
        const response = await apiClient.post<{
          user: typeof user;
          token: string;
        }>('/auth/register', data);
        setUser(response.user);
        setToken(response.token);
        toast.success('Account created! Please complete verification.');
        router.push('/onboarding/start');
        return response;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Registration failed'
        );
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setUser, setToken, setLoading, router]
  );

  const logoutUser = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      router.push('/login');
      toast.success('Logged out successfully');
    }
  }, [logout, router]);

  return {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout: logoutUser,
  };
}
