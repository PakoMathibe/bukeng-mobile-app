// services/supabase/userService.ts
import { supabase } from './client';
import { mapToUser, mapToUserRecord } from './userMapper';
import { User } from '@/types/user';

export class UserService {
  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      console.error('Failed to get user:', error);
      return null;
    }

    return mapToUser(data);
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapToUser(data);
  }

  /**
   * Create a new user profile
   */
  static async createUser(userData: Partial<User>): Promise<User | null> {
    const dbRecord = mapToUserRecord(userData);
    
    const { data, error } = await supabase
      .from('users')
      .insert(dbRecord)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Failed to create user:', error);
      return null;
    }

    return mapToUser(data);
  }

  /**
   * Update user profile
   */
  static async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const dbRecord = mapToUserRecord(updates);
    delete dbRecord.id;
    delete dbRecord.created_at;

    const { data, error } = await supabase
      .from('users')
      .update(dbRecord)
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Failed to update user:', error);
      return null;
    }

    if (!data) return null;

    return mapToUser(data);
  }

  /**
   * Delete user profile
   */
  static async deleteUser(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Failed to delete user:', error);
      return false;
    }

    return true;
  }

  /**
   * Get all users (admin only)
   */
  static async getAllUsers(limit: number = 100): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Failed to get users:', error);
      return [];
    }

    return (data || []).map(mapToUser);
  }

  /**
   * Update user's onboarding progress
   */
  static async updateOnboardingProgress(
    userId: string,
    progress: Record<string, unknown>
  ): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ onboarding_progress: progress })
      .eq('id', userId);

    if (error) {
      console.error('Failed to update onboarding progress:', error);
      return false;
    }

    return true;
  }

  /**
   * Get user's onboarding progress
   */
  static async getOnboardingProgress(userId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('users')
      .select('onboarding_progress')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.onboarding_progress || {};
  }
}