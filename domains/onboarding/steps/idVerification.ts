// domains/onboarding/steps/idVerification.ts
import { CONSTANTS } from '@/lib/constants';
import { IDVerificationService } from '@/services/identity/idVerification';

export interface IDVerificationResult {
  valid: boolean;
  error?: string;
  extractedInfo?: {
    dateOfBirth: Date;
    gender: 'male' | 'female';
    citizenship: 'citizen' | 'permanent_resident';
    age: number;
  };
  verificationId?: string;
  fullName?: string;
}

export class IDVerificationStep {
  /**
   * Verify SA ID number and optional document
   * @param idNumber - The 13-digit SA ID number
   * @param idFile - Optional ID document file for third-party verification
   */
  static async verify(
    idNumber: string,
    idFile?: File
  ): Promise<IDVerificationResult> {
    // Basic format validation
    if (!CONSTANTS.VALIDATION.ID_REGEX.test(idNumber)) {
      return {
        valid: false,
        error: 'ID number must be 13 digits',
      };
    }

    // Validate check digit
    if (!this.validateCheckDigit(idNumber)) {
      return {
        valid: false,
        error: 'Invalid ID number - check digit failed',
      };
    }

    // Extract information from ID number
    const extractedInfo = this.extractInfo(idNumber);

    // If file is provided, perform third-party verification
    if (idFile) {
      try {
        const thirdPartyResult = await IDVerificationService.verify(idNumber, idFile);
        
        if (!thirdPartyResult.valid) {
          return {
            valid: false,
            error: thirdPartyResult.error || 'ID verification failed',
          };
        }

        return {
          valid: true,
          extractedInfo,
          verificationId: thirdPartyResult.verificationId,
          fullName: thirdPartyResult.fullName,
        };
      } catch (error) {
        console.error('Third-party ID verification failed:', error);
        return {
          valid: false,
          error: 'Verification service unavailable. Please try again.',
        };
      }
    }

    // Without file, only basic validation is possible
    return {
      valid: true,
      extractedInfo,
    };
  }

  /**
   * Validate SA ID check digit using Luhn-like algorithm
   */
  static validateCheckDigit(idNumber: string): boolean {
    let total = 0;

    for (let i = 0; i < 12; i++) {
      const digit = parseInt(idNumber[i]!, 10);

      if (i % 2 === 0) {
        total += digit;
      } else {
        let doubled = digit * 2;
        total += doubled > 9 ? doubled - 9 : doubled;
      }
    }

    const checkDigit = (10 - (total % 10)) % 10;
    return checkDigit === parseInt(idNumber[12]!, 10);
  }

  /**
   * Extract information from SA ID number
   */
  static extractInfo(idNumber: string): IDVerificationResult['extractedInfo'] {
    const year = parseInt(idNumber.substring(0, 2), 10);
    const month = parseInt(idNumber.substring(2, 4), 10);
    const day = parseInt(idNumber.substring(4, 6), 10);
    const genderCode = parseInt(idNumber.substring(6, 10), 10);

    // Handle 2-digit year (50+ = 1900s, 49- = 2000s)
    const fullYear = year + (year >= 50 ? 1900 : 2000);
    const dateOfBirth = new Date(fullYear, month - 1, day);

    // Calculate age
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
    ) {
      age--;
    }

    // Determine citizenship digit (10th digit)
    // 0 = citizen, 1 = permanent resident
    const citizenshipDigit = idNumber[10];
    const citizenship = citizenshipDigit === '0' ? 'citizen' : 'permanent_resident';

    return {
      dateOfBirth,
      gender: genderCode >= 5000 ? 'male' : 'female',
      citizenship,
      age,
    };
  }

  /**
   * Verify SA ID with third-party service (Smile Identity, Compass, etc.)
   */
  static async verifyWithThirdParty(
    idNumber: string,
    idFile: File
  ): Promise<{ valid: boolean; fullName?: string; error?: string }> {
    try {
      const result = await IDVerificationService.verify(idNumber, idFile);
      
      return {
        valid: result.valid,
        fullName: result.fullName,
        error: result.error,
      };
    } catch (error) {
      console.error('Third-party verification error:', error);
      return {
        valid: false,
        error: 'Verification service error',
      };
    }
  }

  /**
   * Validate SA ID format only (no check digit)
   */
  static isValidFormat(idNumber: string): boolean {
    return CONSTANTS.VALIDATION.ID_REGEX.test(idNumber);
  }
}