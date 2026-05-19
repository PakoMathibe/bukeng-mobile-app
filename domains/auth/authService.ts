// domains/auth/authService.ts
import { supabase } from '@/services/supabase/client';
import { mapToUser, mapToUserRecord } from '@/services/supabase/userMapper';
import { User } from '@/types/user';

export class AuthService {
  /**
   * Initialize auth session on page load
   */
  static async initSession(): Promise<User | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (session?.user) {
        return await this.getUserById(session.user.id);
      }
      return null;
    } catch (error) {
      console.error('Session initialization error:', error);
      return null;
    }
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChange(callback: (event: string, user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getUserById(session.user.id);
        callback(event, user);
      } else {
        callback(event, null);
      }
    });
  }

  /**
   * Register a new user
   */
  static async register(data: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber: string;
    idNumber?: string;
  }): Promise<{ user: User | null; error: string | null }> {
    try {
      // Validate required fields
      if (!data.email || !data.password || !data.fullName) {
        return { user: null, error: 'All fields are required' };
      }

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
        return { user: null, error: signUpError.message };
      }

      if (!authData.user) {
        return { user: null, error: 'User creation failed' };
      }

      // Insert into users table
      const { error: insertError } = await supabase
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
          credit_limit: 500,
          available_credit: 500,
        });

      if (insertError) {
        console.error('Failed to insert user profile:', insertError);
      }

      // Create credit profile
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
      }

      // Get the created user profile
      const user = await this.getUserById(authData.user.id);
      
      return { user, error: null };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { user: null, error: error.message };
    }
  }

  /**
   * Login user (main method)
   */
  static async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      if (!email || !password) {
        return { user: null, error: 'Email and password are required' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase login error:', error);
        return { user: null, error: error.message };
      }

      if (!data.user) {
        return { user: null, error: 'Login failed' };
      }

      // Ensure user profile exists
      const { data: existingProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!existingProfile) {
        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || '',
          phone_number: data.user.user_metadata?.phone_number || '',
          status: 'active',
          tier: 0,
          kyc_status: 'pending',
          credit_limit: 500,
          available_credit: 500,
        });
      }

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

      const user = await this.getUserById(data.user.id);
      
      // Update last login
      await supabase
        .from('users')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', data.user.id);

      return { user, error: null };
    } catch (error: any) {
      console.error('Login error:', error);
      return { user: null, error: error.message };
    }
  }

  /**
   * Login user (alias for signIn - for backwards compatibility)
   */
  static async login(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    return this.signIn(email, password);
  }

  /**
   * Sign out the current user
   */
  static async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error('Logout error:', error);
      return { error: error.message };
    }
  }

  /**
   * Get current authenticated user
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }

      return await this.getUserById(user.id);
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Get user by ID from public.users table
   */
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !profile) {
        console.error('Failed to fetch user profile:', error);
        return null;
      }

      return mapToUser(profile);
    } catch (error) {
      console.error('Get user by ID error:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  static async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
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
        return null;
      }

      if (!updated) {
        return null;
      }

      return mapToUser(updated);
    } catch (error) {
      console.error('Update user error:', error);
      return null;
    }
  }

  /**
   * Update user's KYC status
   */
  static async updateKYCStatus(
    userId: string,
    status: 'pending' | 'in_progress' | 'verified' | 'rejected'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ kyc_status: status })
        .eq('id', userId);

      if (error) {
        console.error('Failed to update KYC status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Update KYC status error:', error);
      return false;
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
  ): Promise<boolean> {
    try {
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
        return false;
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

      return true;
    } catch (error) {
      console.error('Update user tier error:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }

  /**
   * Send password reset email
   */
  static async resetPassword(email: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password`,
      });

      if (error) throw error;
      return { success: true, error: null };
    } catch (error: any) {
      console.error('Password reset error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update password (when resetting)
   */
  static async updatePassword(newPassword: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return { success: true, error: null };
    } catch (error: any) {
      console.error('Password update error:', error);
      return { success: false, error: error.message };
    }
  }
}