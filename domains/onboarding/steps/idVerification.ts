// domains/onboarding/steps/idVerification.ts
import { CONSTANTS } from '@/lib/constants';

export interface IDVerificationResult {
  valid: boolean;
  error?: string;
  extractedInfo?: {
    dateOfBirth: Date;
    gender: 'male' | 'female';
    citizenship: 'citizen' | 'permanent_resident';
    age: number;
  };
}

export class IDVerificationStep {
  static async verify(
    idNumber: string,
    idFile?: File
  ): Promise<IDVerificationResult> {
    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Validate format
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

    // Extract information
    const extractedInfo = this.extractInfo(idNumber);

    return {
      valid: true,
      extractedInfo,
    };
  }

  static validateCheckDigit(idNumber: string): boolean {
    let total = 0;

    for (let i = 0; i < 12; i++) {
      const digit = parseInt(idNumber[i]!);

      if (i % 2 === 0) {
        total += digit;
      } else {
        let doubled = digit * 2;
        total += doubled > 9 ? doubled - 9 : doubled;
      }
    }

    const checkDigit = (10 - (total % 10)) % 10;
    return checkDigit === parseInt(idNumber[12]!);
  }

  static extractInfo(idNumber: string): IDVerificationResult['extractedInfo'] {
    const year = parseInt(idNumber.substring(0, 2));
    const month = parseInt(idNumber.substring(2, 4));
    const day = parseInt(idNumber.substring(4, 6));
    const genderCode = parseInt(idNumber.substring(6, 10));

    const fullYear = year + (year >= 50 ? 1900 : 2000);
    const dateOfBirth = new Date(fullYear, month - 1, day);

    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
    ) {
      age--;
    }

    return {
      dateOfBirth,
      gender: genderCode >= 5000 ? 'male' : 'female',
      citizenship: idNumber[10] === '0' ? 'citizen' : 'permanent_resident',
      age,
    };
  }

  static async verifyWithThirdParty(
    idNumber: string,
    idFile: File
  ): Promise<boolean> {
    // In production, integrate with Smile Identity or similar
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return true;
  }
}
