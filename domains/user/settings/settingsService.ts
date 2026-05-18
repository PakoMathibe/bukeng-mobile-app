// domains/user/settings/settingsService.ts
import { supabase } from '@/services/supabase/client';
import { AppError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { hashPassword, verifyPassword } from '@/lib/server-crypto';

export interface NotificationSettings {
  paymentReminders: boolean;
  paymentReminderDays: number;
  promotionalEmails: boolean;
  smsAlerts: boolean;
  appNotifications: boolean;
  emailDigest: boolean;
  digestFrequency: 'daily' | 'weekly' | 'monthly';
}

export interface SecuritySettings {
  twoFactorAuth: boolean;
  twoFactorMethod: 'sms' | 'authenticator' | null;
  biometricLogin: boolean;
  sessionTimeout: number; // minutes
  loginAlerts: boolean;
}

export interface PreferenceSettings {
  language: 'en' | 'zu' | 'xh' | 'af' | 'st' | 'tn';
  currency: 'ZAR';
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  reduceAnimations: boolean;
}

export interface UserSettings {
  userId: string;
  notifications: NotificationSettings;
  security: SecuritySettings;
  preferences: PreferenceSettings;
  updatedAt: Date;
}

const defaultNotificationSettings: NotificationSettings = {
  paymentReminders: true,
  paymentReminderDays: 2,
  promotionalEmails: false,
  smsAlerts: true,
  appNotifications: true,
  emailDigest: false,
  digestFrequency: 'weekly',
};

const defaultSecuritySettings: SecuritySettings = {
  twoFactorAuth: false,
  twoFactorMethod: null,
  biometricLogin: true,
  sessionTimeout: 30,
  loginAlerts: true,
};

const defaultPreferenceSettings: PreferenceSettings = {
  language: 'en',
  currency: 'ZAR',
  theme: 'light',
  fontSize: 'medium',
  reduceAnimations: false,
};

export class SettingsService {
  /**
   * Get user settings from database
   */
  static async getSettings(userId: string): Promise<UserSettings> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Failed to get settings:', error);
      }

      if (data) {
        return {
          userId: data.user_id,
          notifications: data.notifications || defaultNotificationSettings,
          security: data.security || defaultSecuritySettings,
          preferences: data.preferences || defaultPreferenceSettings,
          updatedAt: new Date(data.updated_at),
        };
      }

      // Create default settings for new user
      return this.createDefaultSettings(userId);
    } catch (error) {
      logger.error('Failed to get settings', error);
      return await this.createDefaultSettings(userId);
    }
  }

  /**
   * Create default settings for a new user
   */
  static async createDefaultSettings(userId: string): Promise<UserSettings> {
    const defaultSettings: UserSettings = {
      userId,
      notifications: { ...defaultNotificationSettings },
      security: { ...defaultSecuritySettings },
      preferences: { ...defaultPreferenceSettings },
      updatedAt: new Date(),
    };

    const { error } = await supabase.from('user_settings').insert({
      user_id: userId,
      notifications: defaultSettings.notifications,
      security: defaultSettings.security,
      preferences: defaultSettings.preferences,
    });

    if (error) {
      logger.error('Failed to create default settings:', error);
    }

    return defaultSettings;
  }

  /**
   * Update notification settings
   */
  static async updateNotifications(
    userId: string,
    updates: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    try {
      const settings = await this.getSettings(userId);
      const updated = { ...settings.notifications, ...updates };

      const { error } = await supabase
        .from('user_settings')
        .update({
          notifications: updated,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to update notifications:', error);
        throw new AppError('Failed to update settings', 'UPDATE_ERROR', 500);
      }

      logger.info(`Notification settings updated for user ${userId}`);

      return updated;
    } catch (error) {
      logger.error('Failed to update notifications', error);
      throw error;
    }
  }

  /**
   * Update security settings
   */
  static async updateSecurity(
    userId: string,
    updates: Partial<SecuritySettings>
  ): Promise<SecuritySettings> {
    try {
      const settings = await this.getSettings(userId);
      const updated = { ...settings.security, ...updates };

      const { error } = await supabase
        .from('user_settings')
        .update({
          security: updated,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to update security settings:', error);
        throw new AppError('Failed to update settings', 'UPDATE_ERROR', 500);
      }

      logger.info(`Security settings updated for user ${userId}`);

      return updated;
    } catch (error) {
      logger.error('Failed to update security', error);
      throw error;
    }
  }

  /**
   * Update preference settings
   */
  static async updatePreferences(
    userId: string,
    updates: Partial<PreferenceSettings>
  ): Promise<PreferenceSettings> {
    try {
      const settings = await this.getSettings(userId);
      const updated = { ...settings.preferences, ...updates };

      const { error } = await supabase
        .from('user_settings')
        .update({
          preferences: updated,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to update preferences:', error);
        throw new AppError('Failed to update settings', 'UPDATE_ERROR', 500);
      }

      logger.info(`Preferences updated for user ${userId}`);

      return updated;
    } catch (error) {
      logger.error('Failed to update preferences', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      const { AuthService } = await import('@/domains/auth/authService');
      
      // Get user to verify old password
      const user = await AuthService.getUserById(userId);
      if (!user) {
        throw new AppError('User not found', 'USER_NOT_FOUND', 404);
      }

      // In production, get the actual password hash from user_auth table
      const { data: authRecord } = await supabase
        .from('user_auth')
        .select('password_hash')
        .eq('user_id', userId)
        .single();

      if (!authRecord) {
        throw new AppError('Password not set', 'PASSWORD_NOT_SET', 400);
      }

      const isValid = await verifyPassword(oldPassword, authRecord.password_hash);
      if (!isValid) {
        throw new ValidationError('Current password is incorrect');
      }

      const newHash = await hashPassword(newPassword);
      
      const { error } = await supabase
        .from('user_auth')
        .update({ password_hash: newHash })
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to update password:', error);
        throw new AppError('Failed to change password', 'PASSWORD_UPDATE_ERROR', 500);
      }

      logger.info(`Password changed for user ${userId}`);

      return true;
    } catch (error) {
      logger.error('Failed to change password', error);
      throw error;
    }
  }

  /**
   * Delete user account
   */
  static async deleteAccount(userId: string): Promise<void> {
    try {
      const { AuthService } = await import('@/domains/auth/authService');
      
      // Delete user settings
      await supabase.from('user_settings').delete().eq('user_id', userId);
      
      // Delete user profile (cascade will handle related records)
      await supabase.from('users').delete().eq('id', userId);
      
      // Delete auth user (this should cascade, but explicit for safety)
      await AuthService.deleteUser?.(userId) || await supabase.auth.admin.deleteUser(userId);
      
      logger.info(`Account deleted for user ${userId}`);
    } catch (error) {
      logger.error('Failed to delete account', error);
      throw new AppError('Failed to delete account', 'DELETE_ERROR', 500);
    }
  }
}