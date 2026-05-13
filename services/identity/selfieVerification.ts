// services/identity/selfieVerification.ts
export interface SelfieVerificationResult {
  match: boolean;
  confidence: number;
  error?: string;
}

export class SelfieVerificationService {
  static async verify(
    selfieFile: File,
    idDocumentFile: File
  ): Promise<SelfieVerificationResult> {
    // In production, integrate with face recognition API (Smile Identity, Amazon Rekognition, etc.)
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Mock result - always successful for demo
    return {
      match: true,
      confidence: 0.95,
    };
  }

  static async verifyWithStored(
    selfieFile: File,
    storedHash: string
  ): Promise<SelfieVerificationResult> {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      match: true,
      confidence: 0.92,
    };
  }

  static validateImage(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

    if (file.size > maxSize) {
      return { valid: false, error: 'Image must be less than 5MB' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only JPG and PNG images are supported' };
    }

    return { valid: true };
  }
}
