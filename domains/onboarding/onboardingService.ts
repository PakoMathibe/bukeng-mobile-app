// domains/onboarding/onboardingService.ts
import { supabase } from '@/services/supabase/client';

export class OnboardingService {
  static async updateProgress(userId: string, progress: any): Promise<void> {
    // ONLY real Supabase - no localStorage fallback
    const { error } = await supabase
      .from('users')
      .update({ onboarding_progress: progress })
      .eq('id', userId);

    if (error) {
      console.error('Failed to update onboarding progress:', error);
      throw new Error('Failed to save progress');
    }
  }

  static async getProgress(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('users')
      .select('onboarding_progress')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to get onboarding progress:', error);
      return {
        phoneVerified: false,
        emailVerified: false,
        idVerified: false,
        selfieVerified: false,
        bankUploaded: false,
        lastCompletedStep: null,
      };
    }

    return data?.onboarding_progress;
  }
}