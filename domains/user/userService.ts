// domains/user/userService.ts
import { supabase } from '@/services/supabase/client';
import { mapToUser, mapToUserRecord } from '@/services/supabase/userMapper';
import { User, UserSettings } from '@/types/user';

export class UserService {
  static async getUserById(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    return mapToUser(data);
  }

  static async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    const dbRecord = mapToUserRecord(data);
    delete dbRecord.id;
    delete dbRecord.created_at;

    const { data: updated, error } = await supabase
      .from('users')
      .update(dbRecord)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapToUser(updated);
  }

  static async updateSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  }
}