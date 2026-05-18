// domains/auth/authService.ts
import { User } from '@/types/user';
import { RegisterInput, LoginInput } from '@/lib/validators';
import { logger } from '@/lib/logger';
import { supabaseAdmin, getSupabaseAdmin } from '@/services/supabase/admin';
import { supabase } from '@/services/supabase/client';

// For demo mode, simple token generator (no JWT needed in browser)
function generateMockToken(userId: string, email: string): string {
  return `mock_token_${userId}_${Date.now()}`;
}

export class AuthError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 400) {
    super(message);
    this.name = 'AuthError';
  }
}

export class AuthService {
  private static isSupabaseAvailable(): boolean {
    return !!supabaseAdmin && !!supabase;
  }

  static async register(data: RegisterInput): Promise<{ user: User; token: string }> {
    try {
      // DEMO MODE: No Supabase config
      if (!this.isSupabaseAvailable()) {
        logger.warn('[DEMO] Registration - using mock data');
        const mockUser: User = {
          id: `mock_${Date.now()}`,
          email: data.email,
          fullName: data.fullName,
          idNumber: data.idNumber,
          phoneNumber: data.phoneNumber,
          tier: 0,
          kycStatus: 'pending',
          accountStatus: 'active',
          creditLimit: 500,
          availableCredit: 500,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: null,
          emailVerified: false,
          phoneVerified: false,
        };
        const token = generateMockToken(mockUser.id, mockUser.email);
        return { user: mockUser, token };
      }

      // PRODUCTION MODE: Use Supabase (would need server-side token generation)
      // This part should be called from API route, not directly from client
      throw new Error('Production mode requires API route for registration');
    } catch (error) {
      logger.error('Registration failed', error);
      throw error;
    }
  }

  static async login(credentials: LoginInput): Promise<{ user: User; token: string }> {
    try {
      // DEMO MODE: No Supabase config
      if (!this.isSupabaseAvailable()) {
        logger.warn('[DEMO] Login - using mock data');
        const mockUser: User = {
          id: `mock_${Date.now()}`,
          email: credentials.email,
          fullName: credentials.email.split('@')[0] || 'Demo User',
          idNumber: '9001011234567',
          phoneNumber: '0712345678',
          tier: 1,
          kycStatus: 'pending',
          accountStatus: 'active',
          creditLimit: 1000,
          availableCredit: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
          emailVerified: true,
          phoneVerified: false,
        };
        const token = generateMockToken(mockUser.id, mockUser.email);
        return { user: mockUser, token };
      }

      // PRODUCTION MODE: Use Supabase
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (signInError) {
        throw new AuthError('Invalid email or password', 'AUTHENTICATION_ERROR', 401);
      }

      const admin = getSupabaseAdmin();
      if (!admin) {
        throw new Error('Supabase admin not available');
      }
      
      const { data: user, error: userError } = await admin
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError || !user) {
        throw new AuthError('User profile not found', 'AUTHENTICATION_ERROR', 401);
      }

      const { data: creditProfile } = await admin
        .from('credit_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // In production, token should be generated server-side
      const token = generateMockToken(user.id, user.email);
      logger.info(`User logged in: ${user.email}`, { userId: user.id });

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name || '',
          idNumber: user.id_number || '',
          phoneNumber: user.phone_number || '',
          tier: 1,
          kycStatus: 'pending',
          accountStatus: user.status || 'active',
          creditLimit: creditProfile?.credit_limit || 500,
          availableCredit: creditProfile?.available_credit || 500,
          createdAt: new Date(user.created_at),
          updatedAt: new Date(user.updated_at),
          lastLoginAt: new Date(),
          emailVerified: true,
          phoneVerified: false,
        },
        token,
      };
    } catch (error) {
      logger.error('Login failed', error);
      throw error;
    }
  }

  static async getUserById(userId: string): Promise<User | null> {
    try {
      if (!this.isSupabaseAvailable()) {
        if (userId.startsWith('mock_')) {
          return {
            id: userId,
            email: 'demo@bukeng.co.za',
            fullName: 'Demo User',
            idNumber: '9001011234567',
            phoneNumber: '0712345678',
            tier: 1,
            kycStatus: 'pending',
            accountStatus: 'active',
            creditLimit: 1000,
            availableCredit: 1000,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: null,
            emailVerified: true,
            phoneVerified: false,
          };
        }
        return null;
      }

      const admin = getSupabaseAdmin();
      if (!admin) return null;
      
      const { data: user, error } = await admin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !user) return null;

      const { data: creditProfile } = await admin
        .from('credit_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      return {
        id: user.id,
        email: user.email,
        fullName: user.full_name || '',
        idNumber: user.id_number || '',
        phoneNumber: user.phone_number || '',
        tier: 1,
        kycStatus: 'pending',
        accountStatus: user.status || 'active',
        creditLimit: creditProfile?.credit_limit || 500,
        availableCredit: creditProfile?.available_credit || 500,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
        lastLoginAt: null,
        emailVerified: true,
        phoneVerified: false,
      };
    } catch (error) {
      logger.error('Failed to get user', error);
      return null;
    }
  }

  static async logout(userId: string): Promise<void> {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      logger.info(`User logged out: ${userId}`);
    } catch (error) {
      logger.error('Logout failed', error);
    }
  }
}