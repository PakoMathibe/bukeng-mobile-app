// domains/user/profile/profileService.ts
import { User } from '@/types/user';
import { AppError, NotFoundError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { CONSTANTS } from '@/lib/constants';

export interface ProfileUpdateData {
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  dateOfBirth?: Date;
  occupation?: string;
  monthlyIncome?: number;
}

export interface KYCDocument {
  id: string;
  userId: string;
  type: 'id_document' | 'selfie' | 'bank_statement';
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  verifiedAt: Date | null;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
}

// Mock storage - in production, use S3 or similar
const kycDocuments: Map<string, KYCDocument[]> = new Map();

export class ProfileService {
  static async getProfile(userId: string): Promise<User> {
    try {
      const { AuthService } = await import('@/domains/auth/authService');
      const user = await AuthService.getUserById(userId);

      if (!user) {
        throw new NotFoundError(`User ${userId}`);
      }

      return user;
    } catch (error) {
      logger.error('Failed to get profile', error);
      throw error;
    }
  }

  static async updateProfile(
    userId: string,
    data: ProfileUpdateData
  ): Promise<User> {
    try {
      const { AuthService } = await import('@/domains/auth/authService');

      // Validate phone number if provided
      if (
        data.phoneNumber &&
        !CONSTANTS.VALIDATION.PHONE_REGEX.test(data.phoneNumber)
      ) {
        throw new ValidationError('Invalid phone number format');
      }

      // Validate email if provided
      if (data.email && !CONSTANTS.VALIDATION.EMAIL_REGEX.test(data.email)) {
        throw new ValidationError('Invalid email format');
      }

      const user = await AuthService.updateUser(userId, {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        email: data.email,
        updatedAt: new Date(),
      });

      logger.info(`Profile updated for user ${userId}`);

      return user;
    } catch (error) {
      logger.error('Failed to update profile', error);
      throw error;
    }
  }

  static async uploadKYCDocument(
    userId: string,
    file: File,
    type: KYCDocument['type']
  ): Promise<KYCDocument> {
    try {
      // Validate file
      let maxSize: number;
      let allowedTypes: readonly string[];

      switch (type) {
        case 'id_document':
          maxSize = CONSTANTS.FILE_UPLOAD.MAX_SIZE_ID;
          allowedTypes = CONSTANTS.FILE_UPLOAD.ALLOWED_IMAGE_TYPES;
          break;
        case 'selfie':
          maxSize = CONSTANTS.FILE_UPLOAD.MAX_SIZE_SELFIE;
          allowedTypes = CONSTANTS.FILE_UPLOAD.ALLOWED_IMAGE_TYPES;
          break;
        case 'bank_statement':
          maxSize = CONSTANTS.FILE_UPLOAD.MAX_SIZE_BANK_STATEMENT;
          allowedTypes = CONSTANTS.FILE_UPLOAD.ALLOWED_DOCUMENT_TYPES;
          break;
        default:
          throw new ValidationError('Invalid document type');
      }

      if (file.size > maxSize) {
        throw new ValidationError(
          `File size exceeds ${maxSize / 1024 / 1024}MB limit`
        );
      }

      if (!allowedTypes.includes(file.type as any)) {
        throw new ValidationError(
          `File type not supported. Allowed: ${allowedTypes.join(', ')}`
        );
      }

      const document: KYCDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId,
        type,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date(),
        verifiedAt: null,
        status: 'pending',
      };

      const existing = kycDocuments.get(userId) || [];
      kycDocuments.set(userId, [...existing, document]);

      logger.info(`KYC document uploaded for user ${userId}`, {
        type,
        documentId: document.id,
      });

      return document;
    } catch (error) {
      logger.error('Failed to upload KYC document', error);
      throw error;
    }
  }

  static async getKYCDocuments(userId: string): Promise<KYCDocument[]> {
    return kycDocuments.get(userId) || [];
  }

  static async verifyKYCDocument(
    documentId: string,
    verified: boolean,
    rejectionReason?: string
  ): Promise<KYCDocument> {
    for (const [userId, documents] of kycDocuments) {
      const docIndex = documents.findIndex((d) => d.id === documentId);

      if (docIndex !== -1) {
        const document = documents[docIndex]!;
        const updatedDocument: KYCDocument = {
          ...document,
          verifiedAt: verified ? new Date() : null,
          status: verified ? 'verified' : 'rejected',
          rejectionReason: verified ? undefined : rejectionReason,
        };

        documents[docIndex] = updatedDocument;
        kycDocuments.set(userId, documents);

        // If ID document verified, update user's KYC status
        if (verified && document.type === 'id_document') {
          const { AuthService } = await import('@/domains/auth/authService');
          const user = await AuthService.getUserById(userId);

          if (user && user.kycStatus === 'pending') {
            await AuthService.updateUser(userId, { kycStatus: 'in_progress' });
          }
        }

        return updatedDocument;
      }
    }

    throw new NotFoundError(`KYC document ${documentId}`);
  }
}
