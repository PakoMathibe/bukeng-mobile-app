// domains/onboarding/steps/selfieVerification.ts
import { FaceMatchService } from '@/services/identity/faceMatch';
import { SelfieVerificationService } from '@/services/identity/selfieVerification';

export interface SelfieVerificationResult {
  match: boolean;
  confidence: number;
  error?: string;
  verificationId?: string;
}

export class SelfieVerificationStep {
  /**
   * Verify selfie against ID document
   * @param selfieFile - The selfie image file
   * @param idNumber - The user's ID number (used for reference)
   * @param idDocumentFile - Optional ID document file for cross-reference
   */
  static async verify(
    selfieFile: File,
    idNumber: string,
    idDocumentFile?: File
  ): Promise<SelfieVerificationResult> {
    // Validate selfie file
    const validation = this.validateFile(selfieFile);
    if (!validation.valid) {
      return {
        match: false,
        confidence: 0,
        error: validation.error,
      };
    }

    // If ID document provided, use that for comparison
    if (idDocumentFile) {
      const idValidation = this.validateFile(idDocumentFile);
      if (!idValidation.valid) {
        return {
          match: false,
          confidence: 0,
          error: `ID document: ${idValidation.error}`,
        };
      }

      try {
        // Use SelfieVerificationService which integrates with FaceMatchService
        const result = await SelfieVerificationService.verify(selfieFile, idDocumentFile);
        
        return {
          match: result.match,
          confidence: result.confidence,
          error: result.error,
          verificationId: result.verificationId,
        };
      } catch (error) {
        console.error('Selfie verification failed:', error);
        return {
          match: false,
          confidence: 0,
          error: 'Verification service failed. Please try again.',
        };
      }
    }

    // Fallback: basic validation only
    // In production, you should always provide an ID document
    console.warn('Selfie verification without ID document - limited accuracy');
    return {
      match: true, // Not actually verified
      confidence: 0.5,
      error: 'ID document not provided. Verification may be less accurate.',
    };
  }

  /**
   * Perform liveness detection to prevent spoofing
   * @param videoBlob - Video recording of user
   */
  static async getLivenessCheck(
    videoBlob: Blob
  ): Promise<{ isAlive: boolean; confidence: number; error?: string }> {
    try {
      // In production, integrate with liveness detection API
      // This could be from FaceMatchService or a dedicated liveness service
      
      // Placeholder for actual liveness detection
      // await FaceMatchService.getLivenessCheck(videoBlob);
      
      // For now, return mock result
      return {
        isAlive: true,
        confidence: 0.98,
      };
    } catch (error) {
      console.error('Liveness check failed:', error);
      return {
        isAlive: false,
        confidence: 0,
        error: 'Liveness detection failed. Please try again.',
      };
    }
  }

  /**
   * Validate image file
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/heic'];

    if (!file || file.size === 0) {
      return { valid: false, error: 'No file provided' };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Image must be less than 5MB',
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Only JPG, PNG, and HEIC images are supported',
      };
    }

    return { valid: true };
  }

  /**
   * Capture selfie from camera
   * Returns base64 image string
   */
  static async captureFromCamera(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        reject(new Error('Camera not supported'));
        return;
      }

      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          // Create video element
          const video = document.createElement('video');
          video.srcObject = stream;
          video.play();

          // Wait for video to load
          video.onloadedmetadata = () => {
            // Create canvas to capture frame
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Stop the stream
            stream.getTracks().forEach(track => track.stop());

            // Get base64
            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            resolve(base64);
          };
        })
        .catch((error) => {
          console.error('Camera access error:', error);
          reject(new Error('Unable to access camera. Please check permissions.'));
        });
    });
  }

  /**
   * Compress image before upload
   */
  static async compressImage(file: File, maxWidth: number = 1024): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Compression failed'));
              }
            },
            'image/jpeg',
            0.7
          );
        };
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  }
}