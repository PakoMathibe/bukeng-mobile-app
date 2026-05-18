// services/identity/idVerification.ts

export interface IDVerificationResult {
  valid: boolean;
  documentNumber: string;
  fullName?: string;
  dateOfBirth?: Date;
  nationality?: string;
  gender?: 'male' | 'female';
  error?: string;
  verificationId?: string;  // Reference from verification provider
}

export interface IDVerificationConfig {
  provider: 'smile_identity' | 'compass' | 'mock';
  apiKey: string;
  apiSecret?: string;
  partnerId?: string;  // For Smile Identity
}

export class IDVerificationService {
  private static config: IDVerificationConfig | null = null;

  /**
   * Initialize the ID verification service
   */
  static initialize(config: IDVerificationConfig): void {
    this.config = config;
    
    if (config.provider !== 'mock' && !config.apiKey) {
      throw new Error(`Missing API key for ${config.provider} ID verification service`);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ID Verification service initialized with provider: ${config.provider}`);
    }
  }

  /**
   * Validate file before upload
   */
  private static validateFile(file: File): void {
    const maxSizeMB = 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

    if (!file || file.size === 0) {
      throw new Error('No file provided');
    }

    if (file.size > maxSizeBytes) {
      throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }
  }

  /**
   * Verify SA ID number format using check digit algorithm
   */
  static validateSAIDNumber(idNumber: string): boolean {
    // Must be 13 digits
    if (!/^\d{13}$/.test(idNumber)) {
      return false;
    }

    // SA ID check digit algorithm
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(idNumber[i]);
      if (i % 2 === 0) {
        total += digit;
      } else {
        let doubled = digit * 2;
        total += doubled > 9 ? doubled - 9 : doubled;
      }
    }
    const checkDigit = (10 - (total % 10)) % 10;
    
    return checkDigit === parseInt(idNumber[12]);
  }

  /**
   * Verify ID document
   */
  static async verify(
    idNumber: string,
    file: File
  ): Promise<IDVerificationResult> {
    try {
      // Validate inputs
      this.validateFile(file);
      
      if (!idNumber || idNumber.length !== 13) {
        return {
          valid: false,
          documentNumber: idNumber,
          error: 'ID number must be 13 digits',
        };
      }

      // Use mock provider if configured
      if (!this.config || this.config.provider === 'mock' || process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Using mock ID verification (no real API configured)');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        const isValidFormat = this.validateSAIDNumber(idNumber);
        
        if (!isValidFormat) {
          return {
            valid: false,
            documentNumber: idNumber,
            error: 'Invalid ID number format',
          };
        }
        
        const extractedInfo = this.extractInfo(idNumber);
        
        return {
          valid: true,
          documentNumber: idNumber,
          fullName: 'Verified User',  // Would come from API in production
          dateOfBirth: extractedInfo.dateOfBirth,
          gender: extractedInfo.gender,
          nationality: 'South African',
          verificationId: `mock_${Date.now()}`,
        };
      }

      // Real API integration based on provider
      switch (this.config.provider) {
        case 'smile_identity':
          return await this.verifyWithSmileIdentity(idNumber, file);
        case 'compass':
          return await this.verifyWithCompass(idNumber, file);
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('ID verification failed:', error);
      return {
        valid: false,
        documentNumber: idNumber,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Extract information from SA ID number (no API call needed)
   */
  static extractInfo(idNumber: string): {
    dateOfBirth: Date;
    gender: 'male' | 'female';
    citizenship: 'citizen' | 'permanent_resident';
    age: number;
  } {
    if (!idNumber || idNumber.length !== 13) {
      throw new Error('Invalid ID number format');
    }

    const year = parseInt(idNumber.substring(0, 2));
    const month = parseInt(idNumber.substring(2, 4));
    const day = parseInt(idNumber.substring(4, 6));
    const genderCode = parseInt(idNumber.substring(6, 10));
    const citizenshipDigit = idNumber[10];

    const fullYear = year + (year >= 50 ? 1900 : 2000);
    const dateOfBirth = new Date(fullYear, month - 1, day);
    
    // Calculate age
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }

    return {
      dateOfBirth,
      gender: genderCode >= 5000 ? 'male' : 'female',
      citizenship: citizenshipDigit === '0' ? 'citizen' : 'permanent_resident',
      age,
    };
  }

  // ============ Provider-Specific Implementations ============

  /**
   * Smile Identity integration
   */
  private static async verifyWithSmileIdentity(
    idNumber: string,
    file: File
  ): Promise<IDVerificationResult> {
    // Smile Identity API integration
    // Requires: partner_id, api_key, and API call to /verify
    /*
    const formData = new FormData();
    formData.append('partner_id', this.config!.partnerId!);
    formData.append('id_number', idNumber);
    formData.append('image', file);
    
    const response = await fetch('https://api.smileidentity.com/v1/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.config!.apiKey}:`)}`,
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (data.confidence > 0.8) {
      return {
        valid: true,
        documentNumber: idNumber,
        fullName: `${data.first_name} ${data.last_name}`,
        dateOfBirth: new Date(data.dob),
        nationality: data.nationality,
        verificationId: data.verification_id,
      };
    }
    */
    
    throw new Error('Smile Identity integration not yet implemented');
  }

  /**
   * Compass (compliance platform) integration
   */
  private static async verifyWithCompass(
    idNumber: string,
    file: File
  ): Promise<IDVerificationResult> {
    // Compass API integration
    throw new Error('Compass integration not yet implemented');
  }
}