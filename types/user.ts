// types/user.ts
export type UserTier = 0 | 1 | 2 | 3;
export type KYCStatus = 'none' | 'pending' | 'in_progress' | 'verified' | 'rejected';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  fullName: string | null;
  idNumber: string | null;
  dateOfBirth: string | null;
  status: UserStatus;
  tier: UserTier;
  kycStatus: KYCStatus;
  creditLimit: number;
  availableCredit: number;
  onTimePayments: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface CreditProfile {
  id: string;
  userId: string;
  creditScore: number | null;
  creditLimit: number | null;
  availableCredit: number | null;
  riskLevel: string | null;
  updatedAt: Date;
}

export interface OnboardingProgress {
  phoneVerified: boolean;
  emailVerified: boolean;
  idVerified: boolean;
  selfieVerified: boolean;
  bankUploaded: boolean;
  lastCompletedStep: string | null;
}

export interface UserWithCredit extends User {
  creditProfile: CreditProfile | null;
}

// TIER_LIMITS for dashboard display
export const TIER_LIMITS: Record<1 | 2 | 3, { name: string; limit: number; features: string[] }> = {
  1: { 
    name: 'Verified', 
    limit: 500,
    features: ['Make purchases up to R500', '3 instalments', 'Basic support']
  },
  2: { 
    name: 'Trusted', 
    limit: 1500,
    features: ['Make purchases up to R1500', 'Priority support', 'Early access']
  },
  3: { 
    name: 'Premium', 
    limit: 5000,
    features: ['Make purchases up to R5000', '2% cashback', '24/7 support']
  },
};

// Tier configuration for access control
export const TIER_CONFIGS: Record<UserTier, {
  name: string;
  minCreditLimit: number;
  maxCreditLimit: number;
  requiresKYC: boolean;
  features: string[];
  requirements: string[];
  upgradeAmount: number;
  upgradeRequirement: { type: string; value: number };
}> = {
  0: {
    name: 'Explorer',
    minCreditLimit: 0,
    maxCreditLimit: 0,
    requiresKYC: false,
    features: ['Browse merchants', 'View map', 'See how it works'],
    requirements: ['Sign up for an account'],
    upgradeAmount: 0,
    upgradeRequirement: { type: 'verification', value: 1 },
  },
  1: {
    name: 'Verified',
    minCreditLimit: 500,
    maxCreditLimit: 500,
    requiresKYC: true,
    features: ['Make purchases up to R500', '3 interest-free instalments', 'QR payments', 'Basic support'],
    requirements: ['Phone verified', 'ID verified', 'Selfie match completed'],
    upgradeAmount: 500,
    upgradeRequirement: { type: 'verification', value: 1 },
  },
  2: {
    name: 'Trusted',
    minCreditLimit: 500,
    maxCreditLimit: 1500,
    requiresKYC: true,
    features: ['Make purchases up to R1500', 'Higher approval rates', 'Priority support', 'Early access'],
    requirements: ['Bank statement uploaded', 'Income verified', '3 on-time payments'],
    upgradeAmount: 1000,
    upgradeRequirement: { type: 'payments', value: 3 },
  },
  3: {
    name: 'Premium',
    minCreditLimit: 1500,
    maxCreditLimit: 5000,
    requiresKYC: true,
    features: ['Make purchases up to R5000', '2% cashback', '24/7 premium support', 'Exclusive offers', 'Free delivery'],
    requirements: ['6+ on-time payments', 'Credit score > 650', 'Account age > 6 months'],
    upgradeAmount: 3500,
    upgradeRequirement: { type: 'payments', value: 6 },
  },
};