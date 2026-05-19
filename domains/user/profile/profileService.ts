// domains/user/profile/profileService.ts
import { supabase } from '@/services/supabase/client';
import { mapToUser, mapToUserRecord } from '@/services/supabase/userMapper';
import { User } from '@/types/user';
import { uploadFile } from '@/services/firebase/client';
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
  fileUrl: string;
  uploadedAt: Date;
  verifiedAt: Date | null;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
}

export class ProfileService {
  /**
   * Get user profile
   */
  static async getProfile(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        logger.error('Failed to get profile:', error);
        return null;
      }

      return mapToUser(data);
    } catch (error) {
      logger.error('Failed to get profile', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    data: ProfileUpdateData
  ): Promise<User | null> {
    try {
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

      const updateData: Record<string, unknown> = {};
      if (data.fullName !== undefined) updateData.full_name = data.fullName;
      if (data.phoneNumber !== undefined) updateData.phone_number = data.phoneNumber;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.dateOfBirth !== undefined) updateData.date_of_birth = data.dateOfBirth;
      updateData.updated_at = new Date().toISOString();

      const { data: updated, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .maybeSingle();

      if (error) {
        logger.error('Failed to update profile:', error);
        throw new AppError('Failed to update profile', 'PROFILE_UPDATE_ERROR', 500);
      }

      if (!updated) {
        throw new NotFoundError(`User ${userId}`);
      }

      logger.info(`Profile updated for user ${userId}`);

      return mapToUser(updated);
    } catch (error) {
      logger.error('Failed to update profile', error);
      throw error;
    }
  }

  /**
   * Upload KYC document to Firebase Storage and save record to Supabase
   */
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

      // Upload to Firebase Storage
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const storagePath = `kyc/${userId}/${type}/${timestamp}.${extension}`;
      const fileUrl = await uploadFile(file, storagePath);

      // Save record to Supabase
      const { data, error } = await supabase
        .from('kyc_records')
        .insert({
          user_id: userId,
          type,
          file_url: fileUrl,
          status: 'pending',
        })
        .select()
        .maybeSingle();

      if (error) {
        logger.error('Failed to save KYC record:', error);
        throw new AppError('Failed to save KYC record', 'KYC_SAVE_ERROR', 500);
      }

      const document: KYCDocument = {
        id: data.id,
        userId,
        type,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        fileUrl,
        uploadedAt: new Date(),
        verifiedAt: null,
        status: 'pending',
      };

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

  /**
   * Get all KYC documents for a user
   */
  static async getKYCDocuments(userId: string): Promise<KYCDocument[]> {
    try {
      const { data, error } = await supabase
        .from('kyc_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to get KYC documents:', error);
        return [];
      }

      return (data || []).map(record => ({
        id: record.id,
        userId: record.user_id,
        type: record.type,
        fileName: record.file_url.split('/').pop() || 'document',
        fileSize: 0,
        mimeType: '',
        fileUrl: record.file_url,
        uploadedAt: new Date(record.created_at),
        verifiedAt: record.verified_at ? new Date(record.verified_at) : null,
        status: record.status,
        rejectionReason: record.metadata?.rejection_reason,
      }));
    } catch (error) {
      logger.error('Failed to get KYC documents', error);
      return [];
    }
  }

  /**
   * Verify a KYC document (admin only)
   */
  static async verifyKYCDocument(
    documentId: string,
    verified: boolean,
    rejectionReason?: string
  ): Promise<KYCDocument | null> {
    try {
      const { data, error } = await supabase
        .from('kyc_records')
        .update({
          status: verified ? 'verified' : 'rejected',
          verified_at: verified ? new Date().toISOString() : null,
          metadata: rejectionReason ? { rejection_reason: rejectionReason } : {},
        })
        .eq('id', documentId)
        .select()
        .maybeSingle();

      if (error) {
        logger.error('Failed to verify KYC document:', error);
        throw new AppError('Failed to verify document', 'KYC_VERIFY_ERROR', 500);
      }

      if (!data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        type: data.type,
        fileName: data.file_url.split('/').pop() || 'document',
        fileSize: 0,
        mimeType: '',
        fileUrl: data.file_url,
        uploadedAt: new Date(data.created_at),
        verifiedAt: data.verified_at ? new Date(data.verified_at) : null,
        status: data.status,
        rejectionReason,
      };
    } catch (error) {
      logger.error('Failed to verify KYC document', error);
      throw error;
    }
  }

  /**
   * Get KYC verification status
   */
  static async getKYCStatus(userId: string): Promise<{
    status: 'pending' | 'in_progress' | 'verified' | 'rejected';
    documents: {
      idDocument: boolean;
      selfie: boolean;
      bankStatement: boolean;
    };
  }> {
    try {
      const documents = await this.getKYCDocuments(userId);
      
      const idDocument = documents.some(d => d.type === 'id_document' && d.status === 'verified');
      const selfie = documents.some(d => d.type === 'selfie' && d.status === 'verified');
      const bankStatement = documents.some(d => d.type === 'bank_statement' && d.status === 'verified');

      let status: 'pending' | 'in_progress' | 'verified' | 'rejected' = 'pending';
      
      if (idDocument && selfie) {
        status = 'verified';
      } else if (documents.some(d => d.status === 'rejected')) {
        status = 'rejected';
      } else if (documents.length > 0) {
        status = 'in_progress';
      }

      return {
        status,
        documents: { idDocument, selfie, bankStatement },
      };
    } catch (error) {
      logger.error('Failed to get KYC status', error);
      return {
        status: 'pending',
        documents: { idDocument: false, selfie: false, bankStatement: false },
      };
    }
  }
}