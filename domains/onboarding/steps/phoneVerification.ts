// domains/onboarding/steps/phoneVerification.ts
import { CONSTANTS } from '@/lib/constants';

export interface PhoneVerificationResult {
  success: boolean;
  error?: string;
}

export class PhoneVerificationStep {
  static async sendCode(phoneNumber: string): Promise<PhoneVerificationResult> {
    // Validate phone number
    if (!CONSTANTS.VALIDATION.PHONE_REGEX.test(phoneNumber)) {
      return {
        success: false,
        error: 'Invalid South African phone number format',
      };
    }

    // In production, integrate with SMS provider
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return { success: true };
  }

  static async verifyCode(
    phoneNumber: string,
    code: string
  ): Promise<PhoneVerificationResult> {
    // In production, verify against stored code
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock validation - accept '123456' for demo
    if (code === '123456') {
      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid verification code. Please try again.',
    };
  }

  static validatePhoneNumber(phoneNumber: string): boolean {
    return CONSTANTS.VALIDATION.PHONE_REGEX.test(phoneNumber);
  }

  static formatPhoneNumber(phoneNumber: string): string {
    // Convert to E.164 format
    let cleaned = phoneNumber.replace(/\D/g, '');

    if (cleaned.startsWith('0')) {
      cleaned = '27' + cleaned.substring(1);
    } else if (!cleaned.startsWith('27')) {
      cleaned = '27' + cleaned;
    }

    return '+' + cleaned;
  }
}
