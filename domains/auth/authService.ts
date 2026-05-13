// domains/auth/authService.ts - COMPLETE REWRITE
import { User } from '@/types/user';
import { RegisterInput, LoginInput } from '@/lib/validators';
import { AppError, AuthenticationError, ConflictError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { hashPassword, verifyPassword, generateToken } from '@/lib/crypto';
import { supabaseAdmin } from '@/services/supabase/admin';
import { supabase } from '@/services/supabase/client';

export class AuthService {
  static async register(
    data: RegisterInput
  ): Promise<{ user: User; token: string }> {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', data.email)
        .single();

      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Create auth user via Supabase Auth
      const { data: authUser, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: data.email,
          password: data.password,
          email_confirm: true,
          user_metadata: {
            full_name: data.fullName,
            phone_number: data.phoneNumber,
          },
        });

      if (authError) {
        throw new AppError(authError.message, 'AUTH_CREATE_ERROR', 500);
      }

      // Insert into users table
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authUser.user.id,
          email: data.email,
          full_name: data.fullName,
          phone_number: data.phoneNumber,
          id_number: data.idNumber,
          status: 'active',
        })
        .select()
        .single();

      if (userError) {
        throw new AppError(userError.message, 'USER_CREATE_ERROR', 500);
      }

      // Create user_auth record
      const { error: authRecordError } = await supabaseAdmin
        .from('user_auth')
        .insert({
          user_id: user.id,
          password_hash: await hashPassword(data.password),
          pin_hash: null,
          failed_attempts: 0,
        });

      if (authRecordError) {
        throw new AppError(authRecordError.message, 'AUTH_RECORD_ERROR', 500);
      }

      // Create credit profile
      const { error: creditError } = await supabaseAdmin
        .from('credit_profiles')
        .insert({
          user_id: user.id,
          credit_score: 500,
          credit_limit: 500,
          available_credit: 500,
          risk_level: 'medium',
        });

      if (creditError) {
        logger.warn('Credit profile creation failed', creditError);
        // Non-critical, continue
      }

      const token = generateToken(user.id, user.email);

      logger.info(`User registered: ${user.email}`, { userId: user.id });

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name || '',
          idNumber: user.id_number || '',
          phoneNumber: user.phone_number || '',
          tier: 0,
          kycStatus: 'pending',
          accountStatus: 'active',
          creditLimit: 500,
          availableCredit: 500,
          createdAt: new Date(user.created_at),
          updatedAt: new Date(user.updated_at),
          lastLoginAt: null,
          emailVerified: false,
          phoneVerified: false,
        },
        token,
      };
    } catch (error) {
      logger.error('Registration failed', error);
      throw error;
    }
  }

  static async login(
    credentials: LoginInput
  ): Promise<{ user: User; token: string }> {
    try {
      // Sign in with Supabase Auth
      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

      if (signInError) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Get user profile
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError || !user) {
        throw new AuthenticationError('User profile not found');
      }

      // Get credit profile
      const { data: creditProfile } = await supabaseAdmin
        .from('credit_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const token = generateToken(user.id, user.email);

      // Update last login
      await supabaseAdmin
        .from('users')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', user.id);

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
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !user) return null;

      const { data: creditProfile } = await supabaseAdmin
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
      await supabase.auth.signOut();
      logger.info(`User logged out: ${userId}`);
    } catch (error) {
      logger.error('Logout failed', error);
    }
  }
}
