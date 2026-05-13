// domains/user/profile/profileTypes.ts
export interface ProfileFormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  address?: string;
  dateOfBirth?: Date;
  occupation?: string;
  monthlyIncome?: number;
}

export interface VerificationStatus {
  emailVerified: boolean;
  phoneVerified: boolean;
  idVerified: boolean;
  selfieVerified: boolean;
  bankVerified: boolean;
  overallProgress: number;
}

export interface KYCRequirement {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  required: boolean;
  order: number;
  actionUrl: string;
}

export interface DocumentUploadResponse {
  documentId: string;
  status: 'pending' | 'verified' | 'rejected';
  message?: string;
}
