// services/identity/selfieVerification.ts
import { FaceMatchService, FaceMatchResult } from './faceMatch';
import { uploadFile } from '@/services/firebase/client';

export interface SelfieVerificationResult {
  match: boolean;
  confidence: number;
  error?: string;
  verificationId?: string;
}

export interface SelfieVerificationConfig {
  provider: 'smile_identity' | 'aws' | 'azure' | 'mock';
  minConfidenceThreshold?: number;
}

export class SelfieVerificationService {
  private static config: SelfieVerificationConfig | null = null;

  /**
   * Initialize the selfie verification service
   */
  static initialize(config: SelfieVerificationConfig): void {
    this.config = config;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Selfie Verification service initialized with provider: ${config.provider}`);
    }
  }

  /**
   * Validate image file
   */
  static validateImage(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/heic'];

    if (!file || file.size === 0) {
      return { valid: false, error: 'No file provided' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'Image must be less than 5MB' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only JPG, PNG, and HEIC images are supported' };
    }

    return { valid: true };
  }

  /**
   * Convert file to base64 for API calls
   */
  private static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  /**
   * Verify selfie against ID document photo
   */
  static async verify(
    selfieFile: File,
    idDocumentFile: File
  ): Promise<SelfieVerificationResult> {
    try {
      // Validate both files
      const selfieValidation = this.validateImage(selfieFile);
      if (!selfieValidation.valid) {
        return { match: false, confidence: 0, error: selfieValidation.error };
      }

      const idValidation = this.validateImage(idDocumentFile);
      if (!idValidation.valid) {
        return { match: false, confidence: 0, error: `ID document: ${idValidation.error}` };
      }

      // Use FaceMatchService for actual matching
      const selfieBase64 = await this.fileToBase64(selfieFile);
      const idBase64 = await this.fileToBase64(idDocumentFile);
      
      const matchResult = await FaceMatchService.match(selfieBase64, idBase64);
      
      if (matchResult.error) {
        return {
          match: false,
          confidence: 0,
          error: matchResult.error,
        };
      }

      const threshold = this.config?.minConfidenceThreshold ?? 0.7;
      
      return {
        match: matchResult.similarity >= threshold,
        confidence: matchResult.similarity,
        verificationId: `selfie_${Date.now()}`,
      };
    } catch (error) {
      console.error('Selfie verification failed:', error);
      return {
        match: false,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Verify selfie against stored verification reference
   * Used for subsequent verifications after initial KYC
   */
  static async verifyWithStored(
    selfieFile: File,
    storedReferenceId: string
  ): Promise<SelfieVerificationResult> {
    try {
      const validation = this.validateImage(selfieFile);
      if (!validation.valid) {
        return { match: false, confidence: 0, error: validation.error };
      }

      // In production, retrieve the stored face embedding/vector
      // from the database using storedReferenceId, then compare
      
      // For now, use mock or delegate to provider
      if (!this.config || this.config.provider === 'mock') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        return {
          match: true,
          confidence: 0.92,
          verificationId: `stored_${Date.now()}`,
        };
      }

      // Real implementation would compare against stored face data
      throw new Error('Stored verification not yet implemented for this provider');
    } catch (error) {
      console.error('Stored selfie verification failed:', error);
      return {
        match: false,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Upload selfie to Firebase Storage and verify
   * Combines upload and verification in one call
   */
  static async uploadAndVerify(
    userId: string,
    selfieFile: File,
    idDocumentFile: File
  ): Promise<{ uploadUrl: string; verification: SelfieVerificationResult }> {
    // Upload selfie to Firebase Storage first
    const path = `kyc/${userId}/selfie/${Date.now()}.${selfieFile.name.split('.').pop()}`;
    const uploadUrl = await uploadFile(selfieFile, path);
    
    // Then verify
    const verification = await this.verify(selfieFile, idDocumentFile);
    
    return { uploadUrl, verification };
  }

  /**
   * Get a liveness check challenge
   * Returns instructions for the user to prove they're a real person
   */
  static async getLivenessChallenge(): Promise<{
    challenge: string;
    instruction: string;
  }> {
    const challenges = [
      { challenge: 'blink', instruction: 'Please blink your eyes slowly' },
      { challenge: 'smile', instruction: 'Please smile gently' },
      { challenge: 'look_left', instruction: 'Please look to your left' },
      { challenge: 'look_right', instruction: 'Please look to your right' },
      { challenge: 'nod', instruction: 'Please nod your head' },
    ];
    
    return challenges[Math.floor(Math.random() * challenges.length)];
  }
}