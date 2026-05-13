// services/identity/idVerification.ts
export interface IDVerificationResult {
  valid: boolean;
  documentNumber: string;
  fullName?: string;
  dateOfBirth?: Date;
  nationality?: string;
  error?: string;
}

export class IDVerificationService {
  static async verify(
    idNumber: string,
    file: File
  ): Promise<IDVerificationResult> {
    // In production, integrate with Smile Identity, ComplyAdvantage, etc.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Basic validation for demo
    const isValid = /^\d{13}$/.test(idNumber);

    if (!isValid) {
      return {
        valid: false,
        documentNumber: idNumber,
        error: 'Invalid ID number format',
      };
    }

    return {
      valid: true,
      documentNumber: idNumber,
      fullName: 'John Doe',
      dateOfBirth: new Date(1990, 0, 1),
      nationality: 'South African',
    };
  }

  static extractInfo(idNumber: string): {
    dateOfBirth: Date;
    gender: 'male' | 'female';
    citizenship: 'citizen' | 'permanent_resident';
  } {
    const year = parseInt(idNumber.substring(0, 2));
    const month = parseInt(idNumber.substring(2, 4));
    const day = parseInt(idNumber.substring(4, 6));
    const genderCode = parseInt(idNumber.substring(6, 10));

    const fullYear = year + (year >= 50 ? 1900 : 2000);

    return {
      dateOfBirth: new Date(fullYear, month - 1, day),
      gender: genderCode >= 5000 ? 'male' : 'female',
      citizenship: idNumber[10] === '0' ? 'citizen' : 'permanent_resident',
    };
  }
}
