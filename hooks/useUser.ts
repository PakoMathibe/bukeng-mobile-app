// hooks/useUser.ts
'use client';

import { useAuthStore } from '@/store/authStore';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { UserService } from '@/domains/user/userService';
import { UserSettings } from '@/types/user';

export function useUser() {
  const { user, setUser } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateProfile = useCallback(async (data: Partial<typeof user>) => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setIsUpdating(true);

    try {
      const updatedUser = await UserService.updateProfile(user.id, data);
      setUser(updatedUser);
      toast.success('Profile updated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [user, setUser]);

  const updateSettings = useCallback(async (settings: Partial<UserSettings>) => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setIsUpdating(true);

    try {
      await UserService.updateSettings(user.id, settings);
      toast.success('Settings saved');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    if (!user) return;

    try {
      const freshUser = await UserService.getUserById(user.id);
      if (freshUser) {
        setUser(freshUser);
      }
    } catch (error) {
      toast.error('Failed to refresh user data');
    }
  }, [user, setUser]);

  return {
    user,
    isUpdating,
    updateProfile,
    updateSettings,
    refreshUser,
  };
}