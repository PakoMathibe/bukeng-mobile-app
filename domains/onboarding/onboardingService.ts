// domains/onboarding/onboardingService.ts
import { supabase } from '@/services/supabase/client';
import { logger } from '@/lib/logger';

export interface OnboardingProgress {
  phoneVerified: boolean;
  emailVerified: boolean;
  idVerified: boolean;
  selfieVerified: boolean;
  bankUploaded: boolean;
  lastCompletedStep: string | null;
}

export const DEFAULT_ONBOARDING_PROGRESS: OnboardingProgress = {
  phoneVerified: false,
  emailVerified: false,
  idVerified: false,
  selfieVerified: false,
  bankUploaded: false,
  lastCompletedStep: null,
};

export class OnboardingService {
  /**
   * Get onboarding progress for a user
   */
  static async getProgress(userId: string): Promise<OnboardingProgress> {
    if (!userId) {
      logger.error('getProgress called without userId');
      return { ...DEFAULT_ONBOARDING_PROGRESS };
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('onboarding_progress')
        .eq('id', userId)
        .single();

      if (error) {
        // If no record found, return default
        if (error.code === 'PGRST116') {
          return { ...DEFAULT_ONBOARDING_PROGRESS };
        }
        logger.error('Failed to get onboarding progress:', error);
        return { ...DEFAULT_ONBOARDING_PROGRESS };
      }

      // Merge with defaults to ensure all fields exist
      return {
        ...DEFAULT_ONBOARDING_PROGRESS,
        ...(data?.onboarding_progress || {}),
      };
    } catch (error) {
      logger.error('Unexpected error in getProgress:', error);
      return { ...DEFAULT_ONBOARDING_PROGRESS };
    }
  }

  /**
   * Update onboarding progress for a user (partial update supported)
   */
  static async updateProgress(
    userId: string,
    progress: Partial<OnboardingProgress>
  ): Promise<OnboardingProgress> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get current progress
    const currentProgress = await this.getProgress(userId);
    
    // Merge updates
    const updatedProgress: OnboardingProgress = {
      ...currentProgress,
      ...progress,
    };

    // Validate progress object
    this.validateProgress(updatedProgress);

    const { error } = await supabase
      .from('users')
      .update({ onboarding_progress: updatedProgress })
      .eq('id', userId);

    if (error) {
      logger.error('Failed to update onboarding progress:', error);
      throw new Error('Failed to save progress');
    }

    logger.info(`Onboarding progress updated for user ${userId}`, {
      step: progress.lastCompletedStep,
      completedSteps: Object.entries(progress)
        .filter(([_, v]) => v === true)
        .map(([k]) => k),
    });

    return updatedProgress;
  }

  /**
   * Validate progress object
   */
  private static validateProgress(progress: OnboardingProgress): void {
    const validBooleans = ['phoneVerified', 'emailVerified', 'idVerified', 'selfieVerified', 'bankUploaded'];
    
    for (const field of validBooleans) {
      if (typeof (progress as any)[field] !== 'boolean') {
        throw new Error(`Invalid progress: ${field} must be boolean`);
      }
    }
  }

  /**
   * Mark a specific step as completed
   */
  static async completeStep(
    userId: string,
    step: keyof OnboardingProgress,
    metadata?: Record<string, unknown>
  ): Promise<OnboardingProgress> {
    const update: Partial<OnboardingProgress> = {
      [step]: true,
      lastCompletedStep: step,
    };

    const updated = await this.updateProgress(userId, update);
    
    logger.info(`Step completed for user ${userId}: ${step}`, metadata);
    
    // Check if onboarding is complete
    const isComplete = updated.phoneVerified && 
                       updated.emailVerified && 
                       updated.idVerified && 
                       updated.selfieVerified;
    
    if (isComplete) {
      logger.info(`Onboarding completed for user ${userId}`);
      
      // Update user's tier to 1 (Verified)
      await this.upgradeToVerified(userId);
    }
    
    return updated;
  }

  /**
   * Upgrade user to Verified tier after completing onboarding
   */
  private static async upgradeToVerified(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        tier: 1,
        kyc_status: 'verified',
        credit_limit: 500,
        available_credit: 500,
      })
      .eq('id', userId);

    if (error) {
      logger.error('Failed to upgrade user to verified tier:', error);
    } else {
      logger.info(`User ${userId} upgraded to Verified tier`);
    }
  }

  /**
   * Reset onboarding progress (for testing or re-verification)
   */
  static async resetProgress(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ onboarding_progress: DEFAULT_ONBOARDING_PROGRESS })
      .eq('id', userId);

    if (error) {
      logger.error('Failed to reset onboarding progress:', error);
      throw new Error('Failed to reset progress');
    }

    logger.info(`Onboarding progress reset for user ${userId}`);
  }

  /**
   * Get overall onboarding completion percentage
   */
  static async getCompletionPercentage(userId: string): Promise<number> {
    const progress = await this.getProgress(userId);
    
    const requiredSteps = ['phoneVerified', 'emailVerified', 'idVerified', 'selfieVerified'];
    const completedSteps = requiredSteps.filter(step => (progress as any)[step] === true);
    
    return (completedSteps.length / requiredSteps.length) * 100;
  }
}