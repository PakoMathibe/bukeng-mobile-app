// domains/onboarding/onboardingService.ts
import { User, OnboardingProgress } from '@/types/user';
import { supabase } from '@/services/supabase/client';
import { logger } from '@/lib/logger';

export class OnboardingService {
  static async getProgress(userId: string): Promise<OnboardingProgress> {
    const { data, error } = await supabase
      .from('users')
      .select('onboarding_progress')
      .eq('id', userId)
      .single();
      
    if (error) {
      logger.error('Failed to get onboarding progress', error);
      return {
        phoneVerified: false,
        emailVerified: false,
        idVerified: false,
        selfieVerified: false,
        bankUploaded: false,
        lastCompletedStep: null,
      };
    }
    
    return data?.onboarding_progress || {
      phoneVerified: false,
      emailVerified: false,
      idVerified: false,
      selfieVerified: false,
      bankUploaded: false,
      lastCompletedStep: null,
    };
  }
  
  static async updateProgress(userId: string, progress: Partial<OnboardingProgress>): Promise<void> {
    const current = await this.getProgress(userId);
    const updated = { ...current, ...progress };
    
    const { error } = await supabase
      .from('users')
      .update({ onboarding_progress: updated })
      .eq('id', userId);
      
    if (error) {
      logger.error('Failed to update onboarding progress', error);
      throw error;
    }
  }
  
  static async verifyPhone(userId: string, code: string): Promise<boolean> {
    // Integration with SMS provider
    // For demo, accept '123456'
    if (code === '123456') {
      await this.updateProgress(userId, { phoneVerified: true, lastCompletedStep: 'phone' });
      return true;
    }
    return false;
  }
  
  static async verifyID(userId: string, idNumber: string): Promise<boolean> {
    // Validate SA ID format
    const isValid = /^\d{13}$/.test(idNumber);
    if (isValid) {
      await this.updateProgress(userId, { idVerified: true, lastCompletedStep: 'id' });
      
      // Check if ready to upgrade to Tier 1
      const progress = await this.getProgress(userId);
      if (progress.phoneVerified && progress.idVerified) {
        await this.upgradeTier(userId, 1);
      }
    }
    return isValid;
  }
  
  static async verifySelfie(userId: string, selfieFile: File): Promise<boolean> {
    // In production, upload to Firebase Storage and verify with face match API
    await new Promise(resolve => setTimeout(resolve, 1500));
    await this.updateProgress(userId, { selfieVerified: true, lastCompletedStep: 'selfie' });
    
    const progress = await this.getProgress(userId);
    if (progress.phoneVerified && progress.idVerified && progress.selfieVerified) {
      await this.upgradeTier(userId, 1);
    }
    return true;
  }
  
  static async uploadBankStatement(userId: string, file: File): Promise<any> {
    // Upload to Firebase Storage, then analyze
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.updateProgress(userId, { bankUploaded: true, lastCompletedStep: 'bank' });
    
    // Upgrade to Tier 2 if applicable
    await this.upgradeTier(userId, 2);
    
    return {
      monthlyIncome: 12500,
      monthlyExpenses: 8750,
      suggestedLimit: 1500,
    };
  }
  
  static async upgradeTier(userId: string, targetTier: number): Promise<void> {
    const { data: user } = await supabase
      .from('users')
      .select('tier, credit_limit')
      .eq('id', userId)
      .single();
      
    if (user && user.tier < targetTier) {
      const newLimit = targetTier === 1 ? 500 : targetTier === 2 ? 1500 : 5000;
      
      await supabase
        .from('users')
        .update({ tier: targetTier, credit_limit: newLimit, available_credit: newLimit })
        .eq('id', userId);
        
      await supabase
        .from('credit_profiles')
        .update({
          credit_limit: newLimit,
          available_credit: newLimit,
          tier: targetTier,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
        
      logger.info(`User ${userId} upgraded to tier ${targetTier}`, { newLimit });
    }
  }
  
  static async resumeOnboarding(userId: string): Promise<string | null> {
    const progress = await this.getProgress(userId);
    return progress.lastCompletedStep;
  }
}