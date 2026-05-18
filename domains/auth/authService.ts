// domains/auth/authService.ts
import { supabase } from '@/services/supabase/client';
import { User } from '@/types/user';

export class AuthService {
  static async register(data: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber: string;
  }): Promise<{ user: User; token: string }> {
    // NO DEMO MODE - directly use Supabase
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone_number: data.phoneNumber,
        },
      },
    });

    if (error) {
      console.error('Supabase signup error:', error);
      throw new Error(error.message);
    }

    if (!authData.user) {
      throw new Error('User creation failed');
    }

    // Insert into your users table
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: data.email,
        full_name: data.fullName,
        phone_number: data.phoneNumber,
        status: 'active',
      });

    if (insertError) {
      console.error('Failed to insert user profile:', insertError);
      // Don't throw - user is already created in auth
    }

    const user: User = {
      id: authData.user.id,
      email: data.email,
      fullName: data.fullName,
      idNumber: '',
      phoneNumber: data.phoneNumber,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return { user, token: authData.session?.access_token || '' };
  }

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

    // Get user profile from your users table
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const user: User = {
      id: data.user.id,
      email: data.user.email!,
      fullName: profile?.full_name || data.user.user_metadata?.full_name || '',
      idNumber: profile?.id_number || '',
      phoneNumber: profile?.phone_number || data.user.user_metadata?.phone_number || '',
      status: profile?.status || 'active',
      createdAt: profile?.created_at || data.user.created_at,
      updatedAt: new Date().toISOString(),
    };

    return { user, token: data.session.access_token };
  }

  static async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email!,
      fullName: profile?.full_name || user.user_metadata?.full_name || '',
      idNumber: profile?.id_number || '',
      phoneNumber: profile?.phone_number || user.user_metadata?.phone_number || '',
      status: profile?.status || 'active',
      createdAt: profile?.created_at || user.created_at,
      updatedAt: new Date().toISOString(),
    };
  }
}