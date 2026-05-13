// hooks/useUser.ts
'use client';

import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';
import { toast } from 'sonner';

export function useUser() {
  const { user, setUser } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateProfile = async (data: Partial<typeof user>) => {
    setIsUpdating(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (user) {
        const updatedUser = { ...user, ...data, updatedAt: new Date() };
        setUser(updatedUser);
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update profile');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const updateSettings = async (settings: any) => {
    setIsUpdating(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    user,
    isUpdating,
    updateProfile,
    updateSettings,
  };
}
