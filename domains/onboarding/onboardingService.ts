// domains/onboarding/onboardingService.ts
import { User } from '@/types/user';
import { AppError, ValidationError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';
import { CONSTANTS } from '@/lib/constants';
import { IDVerificationStep } from './steps/idVerification';
import { SelfieVerificationStep } from './steps/selfieVerification';
import { BankStatementUploadStep } from './steps/bankStatementUpload';
import { PhoneVerificationStep } from './steps/phoneVerification';

export interface OnboardingStep {
  id: string;
  name: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
  order: number;
  canSkip: boolean;
}

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  percentage: number;
  nextStep: OnboardingStep | null;
  isComplete: boolean;
}

// Mock session storage for verification codes
const verificationCodes: Map<
  string,
  { code: string; expiresAt: Date; attempts: number }
> = new Map();

export class OnboardingService {
  static getSteps(): OnboardingStep[] {
    return [
      {
        id: 'phone',
        name: 'Phone Verification',
        description: 'Verify your mobile number',
        isCompleted: false,
        isRequired: true,
        order: 1,
        canSkip: false,
      },
      {
        id: 'id',
        name: 'ID Verification',
        description: 'Verify your South African ID',
        isCompleted: false,
        isRequired: true,
        order: 2,
        canSkip: false,
      },
      {
        id: 'selfie',
        name: 'Selfie Verification',
        description: 'Take a selfie to match your ID',
        isCompleted: false,
        isRequired: true,
        order: 3,
        canSkip: false,
      },
      {
        id: 'bank',
        name: 'Bank Statement',
        description: 'Upload for higher limits',
        isCompleted: false,
        isRequired: false,
        order: 4,
        canSkip: true,
      },
    ];
  }

  static async sendVerificationCode(phoneNumber: string): Promise<void> {
    try {
      // Validate phone number
      if (!CONSTANTS.VALIDATION.PHONE_REGEX.test(phoneNumber)) {
        throw new ValidationError('Invalid South African phone number');
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

      // Store code
      verificationCodes.set(phoneNumber, {
        code,
        expiresAt,
        attempts: 0,
      });

      // In production, send via SMS provider
      logger.info(`Verification code sent to ${phoneNumber}: ${code}`);

      // Simulate SMS sending
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error('Failed to send verification code', error);
      throw error;
    }
  }

  static async verifyPhoneCode(
    phoneNumber: string,
    code: string
  ): Promise<boolean> {
    try {
      const record = verificationCodes.get(phoneNumber);

      if (!record) {
        throw new ValidationError('No verification code sent to this number');
      }

      if (record.expiresAt < new Date()) {
        verificationCodes.delete(phoneNumber);
        throw new ValidationError('Verification code has expired');
      }

      if (record.attempts >= 5) {
        verificationCodes.delete(phoneNumber);
        throw new ValidationError(
          'Too many failed attempts. Please request a new code.'
        );
      }

      record.attempts++;

      if (record.code !== code) {
        verificationCodes.set(phoneNumber, record);
        throw new ValidationError('Invalid verification code');
      }

      // Success - clean up
      verificationCodes.delete(phoneNumber);

      logger.info(`Phone verified: ${phoneNumber}`);

      return true;
    } catch (error) {
      logger.error('Failed to verify phone code', error);
      throw error;
    }
  }

  static async verifyID(
    idNumber: string,
    idFile?: File
  ): Promise<{ valid: boolean; extractedInfo?: any }> {
    try {
      const result = await IDVerificationStep.verify(idNumber, idFile);

      if (!result.valid) {
        throw new ValidationError(result.error || 'Invalid ID number');
      }

      logger.info(`ID verified: ${idNumber}`);

      return {
        valid: true,
        extractedInfo: result.extractedInfo,
      };
    } catch (error) {
      logger.error('Failed to verify ID', error);
      throw error;
    }
  }

  static async verifySelfie(
    selfieFile: File,
    idNumber: string
  ): Promise<{ match: boolean; confidence: number }> {
    try {
      const result = await SelfieVerificationStep.verify(selfieFile, idNumber);

      logger.info(`Selfie verification completed`, {
        match: result.match,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      logger.error('Failed to verify selfie', error);
      throw error;
    }
  }

  static async uploadBankStatement(file: File): Promise<{
    success: boolean;
    analysis: {
      monthlyIncome: number;
      monthlyExpenses: number;
      disposableIncome: number;
      riskScore: number;
      suggestedCreditLimit: number;
      incomeStability: 'high' | 'medium' | 'low';
      spendingPatterns: Array<{
        category: string;
        amount: number;
        percentage: number;
      }>;
    };
  }> {
    try {
      const result = await BankStatementUploadStep.upload(file);

      logger.info(`Bank statement uploaded and analyzed`, {
        income: result.monthlyIncome,
        suggestedLimit: result.suggestedCreditLimit,
      });

      return {
        success: true,
        analysis: result,
      };
    } catch (error) {
      logger.error('Failed to upload bank statement', error);
      throw error;
    }
  }

  static async getOnboardingStatus(
    userId: string
  ): Promise<OnboardingProgress> {
    try {
      const { AuthService } = await import('@/domains/auth/authService');
      const user = await AuthService.getUserById(userId);

      if (!user) {
        throw new AppError('User not found', 'USER_NOT_FOUND', 404);
      }

      const steps = this.getSteps();
      const completedSteps: string[] = [];

      if (user.phoneVerified) completedSteps.push('phone');
      if (user.kycStatus === 'verified' || user.kycStatus === 'in_progress') {
        completedSteps.push('id');
        completedSteps.push('selfie');
      }

      const currentStepIndex = steps.findIndex(
        (step) => !completedSteps.includes(step.id) && step.isRequired
      );
      const currentStep =
        currentStepIndex !== -1 ? steps[currentStepIndex] : null;

      return {
        currentStep: currentStepIndex !== -1 ? currentStepIndex : steps.length,
        totalSteps: steps.filter((s) => s.isRequired).length,
        completedSteps,
        percentage:
          (completedSteps.length / steps.filter((s) => s.isRequired).length) *
          100,
        nextStep: currentStep,
        isComplete:
          completedSteps.length === steps.filter((s) => s.isRequired).length,
      };
    } catch (error) {
      logger.error('Failed to get onboarding status', error);
      throw error;
    }
  }

  static async completeOnboarding(userId: string): Promise<User> {
    try {
      const { AuthService } = await import('@/domains/auth/authService');
      const { UserTierManager } = await import('@/domains/access/userTier');
      const { CreditService } = await import('@/domains/credit/creditService');

      let user = await AuthService.getUserById(userId);

      if (!user) {
        throw new AppError('User not found', 'USER_NOT_FOUND', 404);
      }

      // Update KYC status
      user = await AuthService.updateUser(userId, {
        kycStatus: 'verified',
        tier: 1,
      });

      // Initialize credit
      await CreditService.initializeCredit(user);

      logger.info(`Onboarding completed for user ${userId}`);

      return user;
    } catch (error) {
      logger.error('Failed to complete onboarding', error);
      throw error;
    }
  }
}
