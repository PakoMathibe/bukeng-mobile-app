// services/firebase/upload.ts
import { storage } from './client';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTask,
} from 'firebase/storage';
import { supabase } from '@/services/supabase/client';

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
}

export class FileUploadService {
  static async uploadKYCDocument(
    userId: string,
    file: File,
    type: 'id_document' | 'selfie' | 'bank_statement',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ url: string; recordId: string }> {
    // Create unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `${userId}/${type}/${timestamp}.${extension}`;

    // Upload to Firebase Storage
    const storageRef = ref(storage, `kyc/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = {
            progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
          };
          onProgress?.(progress);
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

            // Save record to Supabase
            const { data: record, error } = await supabase
              .from('kyc_records')
              .insert({
                user_id: userId,
                type,
                file_url: downloadUrl,
                status: 'pending',
              })
              .select()
              .single();

            if (error) throw error;

            resolve({
              url: downloadUrl,
              recordId: record.id,
            });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  static async uploadBankStatement(
    userId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ url: string; analysis: any }> {
    const { url, recordId } = await this.uploadKYCDocument(
      userId,
      file,
      'bank_statement',
      onProgress
    );

    // Trigger bank statement analysis (would call an analysis service)
    const analysis = await this.analyzeBankStatement(file);

    // Update record with analysis
    await supabase
      .from('kyc_records')
      .update({
        metadata: analysis,
      })
      .eq('id', recordId);

    return { url, analysis };
  }

  private static async analyzeBankStatement(file: File): Promise<any> {
    // In production, this would call an AI service or bank parser
    // For now, return mock analysis
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          monthlyIncome: 12500,
          monthlyExpenses: 8750,
          disposableIncome: 3750,
          riskScore: 72,
          suggestedCreditLimit: 1500,
          incomeStability: 'medium',
        });
      }, 2000);
    });
  }
}
