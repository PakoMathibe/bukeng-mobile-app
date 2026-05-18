// types/user.ts
export type UserTier = 0 | 1 | 2 | 3;

export interface User {
  id: string;
  email: string;
  fullName: string;
  idNumber: string;
  phoneNumber: string;
  tier: UserTier;
  kycStatus: 'pending' | 'verified' | 'rejected';
  accountStatus: 'active' | 'suspended';
  creditLimit: number;
  availableCredit: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}