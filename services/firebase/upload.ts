// services/firebase/upload.ts
import { storage } from './client';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
} from 'firebase/storage';
import { supabase } from '@/services/supabase/client';
import { StatementParser } from '@/services/bank/statementParser';
import { TransactionCategoriser } from '@/services/bank/transactionCategoriser';

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
}

export interface BankAnalysis {
  monthlyIncome: number;
  monthlyExpenses: number;
  disposableIncome: number;
  riskScore: number;
  suggestedCreditLimit: number;
  incomeStability: 'high' | 'medium' | 'low';
  spendingPatterns: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  maxFileSizeMB?: number;
}

export class FileUploadService {
  private static readonly MAX_FILE_SIZE_MB = {
    id_document: 5,
    selfie: 5,
    bank_statement: 10,
  };

  private static readonly ALLOWED_FILE_TYPES = {
    id_document: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    selfie: ['image/jpeg', 'image/png', 'image/jpg'],
    bank_statement: ['application/pdf', 'text/csv', 'application/vnd.ms-excel'],
  };

  /**
   * Validate file before upload
   */
  private static validateFile(
    file: File,
    type: 'id_document' | 'selfie' | 'bank_statement'
  ): void {
    const maxSizeMB = this.MAX_FILE_SIZE_MB[type];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const allowedTypes = this.ALLOWED_FILE_TYPES[type];

    if (file.size === 0) {
      throw new Error('File is empty');
    }

    if (file.size > maxSizeBytes) {
      throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        `Invalid file type. Allowed: ${allowedTypes.join(', ')}`
      );
    }
  }

  /**
   * Upload KYC document to Firebase Storage and save record to Supabase
   */
  static async uploadKYCDocument(
    userId: string,
    file: File,
    type: 'id_document' | 'selfie' | 'bank_statement',
    options?: UploadOptions
  ): Promise<{ url: string; recordId: string }> {
    // Validate file
    this.validateFile(file, type);

    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `${userId}/${type}/${timestamp}.${extension}`;
    const storageRef = ref(storage, `kyc/${fileName}`);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = {
            progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
          };
          options?.onProgress?.(progress);
        },
        (error) => {
          reject(new Error(`Upload failed: ${error.message}`));
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

            // Save record to Supabase
            const { data: record, error: insertError } = await supabase
              .from('kyc_records')
              .insert({
                user_id: userId,
                type,
                file_url: downloadUrl,
                status: 'pending',
              })
              .select()
              .single();

            if (insertError) {
              // Cleanup: delete the uploaded file if Supabase insert fails
              await deleteObject(storageRef).catch(console.error);
              throw new Error(`Database error: ${insertError.message}`);
            }

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

  /**
   * Upload bank statement with full analysis
   */
  static async uploadBankStatement(
    userId: string,
    file: File,
    options?: UploadOptions
  ): Promise<{ url: string; analysis: BankAnalysis }> {
    // Upload the file
    const { url, recordId } = await this.uploadKYCDocument(
      userId,
      file,
      'bank_statement',
      options
    );

    try {
      // Parse and analyze the bank statement
      const parsedStatement = await StatementParser.parse(file);
      const analysis = await this.analyzeBankStatement(parsedStatement);

      // Update record with analysis
      await supabase
        .from('kyc_records')
        .update({ 
          metadata: analysis,
          status: 'verified',
        })
        .eq('id', recordId);

      return { url, analysis };
    } catch (analysisError) {
      // Update record with failed status
      await supabase
        .from('kyc_records')
        .update({ 
          status: 'failed',
          metadata: { error: analysisError instanceof Error ? analysisError.message : 'Analysis failed' },
        })
        .eq('id', recordId);
      
      throw new Error(
        `Bank statement analysis failed: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Analyze bank statement to assess creditworthiness
   */
  private static async analyzeBankStatement(
    parsedStatement: any
  ): Promise<BankAnalysis> {
    // Extract transactions
    const transactions = parsedStatement.transactions || [];
    
    // Categorize transactions
    const categories = TransactionCategoriser.summarise(transactions);
    
    // Calculate monthly income (credits)
    const credits = transactions
      .filter((tx: any) => tx.type === 'credit')
      .reduce((sum: number, tx: any) => sum + tx.amount, 0);
    
    // Calculate monthly expenses (debits)
    const debits = transactions
      .filter((tx: any) => tx.type === 'debit')
      .reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0);
    
    const disposableIncome = credits - debits;
    
    // Calculate risk score (0-100)
    let riskScore = 50;
    if (disposableIncome > 5000) riskScore += 20;
    else if (disposableIncome > 2000) riskScore += 10;
    else if (disposableIncome < 0) riskScore -= 30;
    else if (disposableIncome < 1000) riskScore -= 10;
    
    // Determine income stability
    let incomeStability: 'high' | 'medium' | 'low' = 'medium';
    const salaryKeywords = ['salary', 'wage', 'income', 'deposit'];
    const salaryTransactions = transactions.filter((tx: any) => 
      tx.type === 'credit' && 
      salaryKeywords.some(kw => tx.description.toLowerCase().includes(kw))
    );
    
    if (salaryTransactions.length >= 3) incomeStability = 'high';
    else if (salaryTransactions.length === 0) incomeStability = 'low';
    
    // Calculate suggested credit limit (20-50% of disposable income, capped at 5000)
    let suggestedCreditLimit = Math.min(
      Math.max(Math.floor(disposableIncome * 0.3), 0),
      5000
    );
    
    // Ensure minimum limit for verified users
    if (suggestedCreditLimit < 500 && credits > 5000) {
      suggestedCreditLimit = 500;
    }
    
    // Get spending patterns
    const spendingPatterns = categories.map(cat => ({
      category: cat.category,
      amount: cat.totalAmount,
      percentage: cat.percentage,
    }));
    
    return {
      monthlyIncome: credits,
      monthlyExpenses: debits,
      disposableIncome,
      riskScore: Math.min(Math.max(riskScore, 0), 100),
      suggestedCreditLimit,
      incomeStability,
      spendingPatterns,
    };
  }

  /**
   * Delete KYC document and its record
   */
  static async deleteKYCDocument(recordId: string, fileUrl: string): Promise<void> {
    try {
      // Extract path from URL and delete from storage
      const urlPath = fileUrl.split('/o/')[1]?.split('?')[0];
      if (urlPath) {
        const decodedPath = decodeURIComponent(urlPath);
        const storageRef = ref(storage, decodedPath);
        await deleteObject(storageRef);
      }
      
      // Delete record from Supabase
      await supabase.from('kyc_records').delete().eq('id', recordId);
    } catch (error) {
      console.error('Failed to delete KYC document:', error);
      throw new Error('Failed to delete document');
    }
  }
}