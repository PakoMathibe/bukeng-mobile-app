// domains/auth/authService.ts
import { supabase } from '@/services/supabase/client';
import { mapToUser, mapToUserRecord } from '@/services/supabase/userMapper';
import { User } from '@/types/user';

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber: string;
    idNumber?: string;
  }): Promise<{ user: User; token: string }> {
    // Create user in Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone_number: data.phoneNumber,
        },
      },
    });

    if (signUpError) {
      console.error('Supabase signup error:', signUpError);
      throw new Error(signUpError.message);
    }

    if (!authData.user) {
      throw new Error('User creation failed');
    }

    // Insert into users table - with retry
    let insertError: any = null;
    let retries = 3;
    
    while (retries > 0) {
      const { error } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: data.email,
          full_name: data.fullName,
          phone_number: data.phoneNumber,
          id_number: data.idNumber || null,
          status: 'active',
          tier: 0,
          kyc_status: 'pending',
          credit_limit: 0,
          available_credit: 0,
        });
      
      if (!error) {
        insertError = null;
        break;
      }
      
      insertError = error;
      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (insertError) {
      console.error('Failed to insert user profile after retries:', insertError);
      // Don't throw - user is already created in auth
    }

    // Also create credit profile
    const { error: creditError } = await supabase
      .from('credit_profiles')
      .insert({
        user_id: authData.user.id,
        credit_score: 500,
        credit_limit: 500,
        available_credit: 500,
        used_credit: 0,
        risk_level: 'medium',
        on_time_payments: 0,
        late_payments: 0,
      });

    if (creditError) {
      console.error('Failed to create credit profile:', creditError);
      // Non-critical, continue
    }

    // Get the created user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    const user = mapToUser(profile || {
      id: authData.user.id,
      email: data.email,
      full_name: data.fullName,
      phone_number: data.phoneNumber,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { user, token: authData.session?.access_token || '' };
  }

  /**
   * Login an existing user
   */
  static async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase login error:', error);
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Login failed');
    }

    // Ensure user profile exists (create if missing)
    const { data: existingProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!existingProfile) {
      // Create missing profile
      await supabase.from('users').insert({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || '',
        phone_number: data.user.user_metadata?.phone_number || '',
        status: 'active',
        tier: 0,
        kyc_status: 'pending',
        credit_limit: 0,
        available_credit: 0,
      });
    }

    // Get user profile from users table
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    // Ensure credit profile exists
    const { data: existingCredit } = await supabase
      .from('credit_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (!existingCredit) {
      await supabase.from('credit_profiles').insert({
        user_id: data.user.id,
        credit_score: 500,
        credit_limit: 500,
        available_credit: 500,
        used_credit: 0,
        risk_level: 'medium',
        on_time_payments: 0,
        late_payments: 0,
      });
    }

    const user = mapToUser(profile || {
      id: data.user.id,
      email: data.user.email!,
      full_name: data.user.user_metadata?.full_name || '',
      phone_number: data.user.user_metadata?.phone_number || '',
      status: 'active',
      created_at: data.user.created_at,
      updated_at: new Date().toISOString(),
    });

    // Update last login
    await supabase
      .from('users')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', data.user.id);

    return { user, token: data.session.access_token };
  }

  /**
   * Get current authenticated user
   */
  static async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    // Ensure profile exists
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return null;
    }

    return mapToUser(profile);
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !profile) {
      return null;
    }

    return mapToUser(profile);
  }

  /**
   * Update user profile
   */
  static async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const dbRecord = mapToUserRecord(updates);
    delete dbRecord.id;
    delete dbRecord.created_at;

    const { data: updated, error } = await supabase
      .from('users')
      .update(dbRecord)
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Failed to update user:', error);
      throw new Error(error.message);
    }

    if (!updated) {
      throw new Error('User not found');
    }

    return mapToUser(updated);
  }

  /**
   * Update user's KYC status
   */
  static async updateKYCStatus(
    userId: string,
    status: 'pending' | 'in_progress' | 'verified' | 'rejected'
  ): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ kyc_status: status })
      .eq('id', userId);

    if (error) {
      console.error('Failed to update KYC status:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Update user's tier and credit limits
   */
  static async updateUserTier(
    userId: string,
    tier: number,
    creditLimit: number,
    availableCredit: number
  ): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        tier,
        credit_limit: creditLimit,
        available_credit: availableCredit,
      })
      .eq('id', userId);

    if (error) {
      console.error('Failed to update user tier:', error);
      throw new Error(error.message);
    }

    // Also update credit_profiles
    const { error: creditError } = await supabase
      .from('credit_profiles')
      .upsert({
        user_id: userId,
        credit_limit: creditLimit,
        available_credit: availableCredit,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (creditError) {
      console.error('Failed to update credit profile:', creditError);
    }
  }

  /**
   * Delete user account
   */
  static async deleteUser(userId: string): Promise<void> {
    // Delete from users table (cascade will handle related records)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Failed to delete user:', error);
      throw new Error(error.message);
    }

    // Note: Supabase Auth user deletion requires admin privileges
    // This is typically handled by a Supabase Edge Function or webhook
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Send password reset email
   */
  static async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password`,
    });

    if (error) {
      console.error('Password reset error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Update password (when resetting)
   */
  static async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('Password update error:', error);
      throw new Error(error.message);
    }
  }
}