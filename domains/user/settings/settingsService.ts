// domains/user/settings/settingsService.ts
import { AppError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { hashPassword, verifyPassword } from '@/lib/crypto';

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

// Mock database
const settingsDatabase: Map<string, UserSettings> = new Map();

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
  static async getSettings(userId: string): Promise<UserSettings> {
    try {
      let settings = settingsDatabase.get(userId);

      if (!settings) {
        settings = {
          userId,
          notifications: { ...defaultNotificationSettings },
          security: { ...defaultSecuritySettings },
          preferences: { ...defaultPreferenceSettings },
          updatedAt: new Date(),
        };
        settingsDatabase.set(userId, settings);
      }

      return settings;
    } catch (error) {
      logger.error('Failed to get settings', error);
      throw error;
    }
  }

  static async updateNotifications(
    userId: string,
    updates: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    try {
      const settings = await this.getSettings(userId);
      const updated = { ...settings.notifications, ...updates };
      settings.notifications = updated;
      settings.updatedAt = new Date();

      settingsDatabase.set(userId, settings);

      logger.info(`Notification settings updated for user ${userId}`);

      return updated;
    } catch (error) {
      logger.error('Failed to update notifications', error);
      throw error;
    }
  }

  static async updateSecurity(
    userId: string,
    updates: Partial<SecuritySettings>
  ): Promise<SecuritySettings> {
    try {
      const settings = await this.getSettings(userId);
      const updated = { ...settings.security, ...updates };
      settings.security = updated;
      settings.updatedAt = new Date();

      settingsDatabase.set(userId, settings);

      logger.info(`Security settings updated for user ${userId}`);

      return updated;
    } catch (error) {
      logger.error('Failed to update security', error);
      throw error;
    }
  }

  static async updatePreferences(
    userId: string,
    updates: Partial<PreferenceSettings>
  ): Promise<PreferenceSettings> {
    try {
      const settings = await this.getSettings(userId);
      const updated = { ...settings.preferences, ...updates };
      settings.preferences = updated;
      settings.updatedAt = new Date();

      settingsDatabase.set(userId, settings);

      logger.info(`Preferences updated for user ${userId}`);

      return updated;
    } catch (error) {
      logger.error('Failed to update preferences', error);
      throw error;
    }
  }

  static async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      const { AuthService } = await import('@/domains/auth/authService');
      const user = await AuthService.getUserById(userId);

      if (!user) {
        throw new AppError('User not found', 'USER_NOT_FOUND', 404);
      }

      // In production, retrieve actual password hash from database
      // This is a simplified version
      const isValid = await verifyPassword(
        oldPassword,
        'stored_hash_placeholder'
      );

      if (!isValid) {
        throw new ValidationError('Current password is incorrect');
      }

      const newHash = await hashPassword(newPassword);

      logger.info(`Password changed for user ${userId}`);

      return true;
    } catch (error) {
      logger.error('Failed to change password', error);
      throw error;
    }
  }

  static async deleteAccount(userId: string): Promise<void> {
    try {
      settingsDatabase.delete(userId);
      logger.info(`Account deleted for user ${userId}`);
    } catch (error) {
      logger.error('Failed to delete account', error);
      throw error;
    }
  }
}
