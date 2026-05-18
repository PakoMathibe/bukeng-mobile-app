// domains/onboarding/steps/phoneVerification.ts
import { CONSTANTS } from '@/lib/constants';
import { logger } from '@/lib/logger';

export interface PhoneVerificationResult {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
}

// In-memory store for verification codes (in production, use Redis or database)
interface VerificationRecord {
  code: string;
  expiresAt: Date;
  attempts: number;
  resentCount: number;
}

const verificationStore = new Map<string, VerificationRecord>();
const MAX_ATTEMPTS = 5;
const MAX_RESENDS = 3;
const CODE_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

export class PhoneVerificationStep {
  /**
   * Send a verification code to the phone number
   */
  static async sendCode(phoneNumber: string): Promise<PhoneVerificationResult> {
    // Validate phone number
    if (!this.validatePhoneNumber(phoneNumber)) {
      return {
        success: false,
        error: 'Invalid South African phone number format',
      };
    }

    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    const existing = verificationStore.get(formattedNumber);

    // Check resend limit
    if (existing && existing.resentCount >= MAX_RESENDS) {
      return {
        success: false,
        error: 'Maximum resend limit reached. Please try again later.',
      };
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    // Store the code
    verificationStore.set(formattedNumber, {
      code,
      expiresAt,
      attempts: 0,
      resentCount: (existing?.resentCount || 0) + 1,
    });

    // In production, integrate with an SMS provider like:
    // - Twilio
    // - Vonage (formerly Nexmo)
    // - Africa's Talking
    // - Clickatell
    // - MessageBird
    try {
      // Example with Africa's Talking (commented out)
      // const response = await fetch('https://api.africastalking.com/version1/messaging', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/x-www-form-urlencoded',
      //     'apiKey': process.env.AFRICASTALKING_API_KEY!,
      //   },
      //   body: new URLSearchParams({
      //     username: process.env.AFRICASTALKING_USERNAME!,
      //     to: formattedNumber,
      //     message: `Your Bukeng verification code is: ${code}`,
      //   }),
      // });
      
      // For development, log the code
      logger.info(`[DEV] Verification code for ${formattedNumber}: ${code}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to send SMS:', error);
      return {
        success: false,
        error: 'Failed to send verification code. Please try again.',
      };
    }
  }

  /**
   * Verify the code entered by the user
   */
  static async verifyCode(
    phoneNumber: string,
    code: string
  ): Promise<PhoneVerificationResult> {
    if (!code || code.length !== 6) {
      return {
        success: false,
        error: 'Verification code must be 6 digits',
      };
    }

    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    const record = verificationStore.get(formattedNumber);

    if (!record) {
      return {
        success: false,
        error: 'No verification code sent. Please request a new code.',
      };
    }

    // Check expiration
    if (new Date() > record.expiresAt) {
      verificationStore.delete(formattedNumber);
      return {
        success: false,
        error: 'Verification code has expired. Please request a new code.',
      };
    }

    // Check attempts
    if (record.attempts >= MAX_ATTEMPTS) {
      verificationStore.delete(formattedNumber);
      return {
        success: false,
        error: 'Too many failed attempts. Please request a new code.',
      };
    }

    // Update attempt count
    record.attempts++;
    verificationStore.set(formattedNumber, record);

    // Verify code
    if (record.code !== code) {
      const remainingAttempts = MAX_ATTEMPTS - record.attempts;
      return {
        success: false,
        error: `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`,
        remainingAttempts,
      };
    }

    // Success - clean up
    verificationStore.delete(formattedNumber);
    return { success: true };
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    return CONSTANTS.VALIDATION.PHONE_REGEX.test(phoneNumber);
  }

  /**
   * Format phone number to E.164 international format
   * @example "0712345678" -> "+27712345678"
   */
  static formatPhoneNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/\D/g, '');

    if (cleaned.startsWith('0')) {
      cleaned = '27' + cleaned.substring(1);
    } else if (cleaned.startsWith('27')) {
      // Already in correct format
    } else if (!cleaned.startsWith('27')) {
      cleaned = '27' + cleaned;
    }

    return '+' + cleaned;
  }

  /**
   * Clean up expired verification codes (should be called periodically)
   */
  static cleanupExpiredCodes(): void {
    const now = new Date();
    for (const [number, record] of verificationStore.entries()) {
      if (now > record.expiresAt) {
        verificationStore.delete(number);
      }
    }
  }

  /**
   * Get remaining attempts for a phone number
   */
  static getRemainingAttempts(phoneNumber: string): number {
    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    const record = verificationStore.get(formattedNumber);
    
    if (!record) return MAX_ATTEMPTS;
    return Math.max(0, MAX_ATTEMPTS - record.attempts);
  }
}

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => PhoneVerificationStep.cleanupExpiredCodes(), 60 * 60 * 1000);
}