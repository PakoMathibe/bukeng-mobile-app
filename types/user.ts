// types/user.ts
export type UserTier = 0 | 1 | 2 | 3;

export interface User {
  id: string;
  email: string;
  fullName: string;
  idNumber: string;
  phoneNumber: string;
  tier: UserTier;
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  accountStatus: 'active' | 'suspended';
  creditLimit: number;
  availableCredit: number;
  onboardingProgress: OnboardingProgress;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface OnboardingProgress {
  phoneVerified: boolean;
  emailVerified: boolean;
  idVerified: boolean;
  selfieVerified: boolean;
  bankUploaded: boolean;
  lastCompletedStep: string | null;
}

export const TIER_LIMITS: Record<UserTier, { limit: number; name: string; features: string[] }> = {
  0: { limit: 0, name: 'Explorer', features: ['Browse merchants', 'See how it works', 'Preview credit limits'] },
  1: { limit: 500, name: 'Verified', features: ['Make purchases up to R500', '3 instalments', 'Basic support'] },
  2: { limit: 1500, name: 'Trusted', features: ['Make purchases up to R1500', 'Priority support', 'Early access'] },
  3: { limit: 5000, name: 'Premium', features: ['Make purchases up to R5000', '2% cashback', '24/7 support'] },
};