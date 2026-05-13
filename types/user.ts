// types/user.ts
export type UserTier = 0 | 1 | 2 | 3;
export type KYCStatus = 'pending' | 'in_progress' | 'verified' | 'rejected';
export type AccountStatus = 'active' | 'suspended' | 'closed';

export interface User {
  id: string;
  email: string;
  fullName: string;
  idNumber: string;
  phoneNumber: string;
  tier: UserTier;
  kycStatus: KYCStatus;
  accountStatus: AccountStatus;
  creditLimit: number;
  availableCredit: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface UserSession {
  userId: string;
  token: string;
  expiresAt: Date;
  deviceId: string;
  ipAddress: string;
}

export interface UserTierConfig {
  tier: UserTier;
  name: string;
  minCreditLimit: number;
  maxCreditLimit: number;
  requiresKYC: boolean;
  features: string[];
  requirements: string[];
  upgradeAmount: number;
  upgradeRequirement: {
    type: 'payments' | 'time' | 'verification';
    value: number;
  };
}

export const TIER_CONFIGS: Record<UserTier, UserTierConfig> = {
  0: {
    tier: 0,
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
    tier: 1,
    name: 'Verified',
    minCreditLimit: 500,
    maxCreditLimit: 500,
    requiresKYC: true,
    features: [
      'Make purchases up to R500',
      '3 interest-free instalments',
      'QR payments',
      'Basic support',
    ],
    requirements: ['Phone verified', 'ID verified', 'Selfie match completed'],
    upgradeAmount: 500,
    upgradeRequirement: { type: 'verification', value: 1 },
  },
  2: {
    tier: 2,
    name: 'Trusted',
    minCreditLimit: 500,
    maxCreditLimit: 1500,
    requiresKYC: true,
    features: [
      'Make purchases up to R1500',
      'Higher approval rates',
      'Priority support',
      'Early access',
    ],
    requirements: [
      'Bank statement uploaded',
      'Income verified',
      '3 on-time payments',
    ],
    upgradeAmount: 1000,
    upgradeRequirement: { type: 'payments', value: 3 },
  },
  3: {
    tier: 3,
    name: 'Premium',
    minCreditLimit: 1500,
    maxCreditLimit: 5000,
    requiresKYC: true,
    features: [
      'Make purchases up to R5000',
      '2% cashback',
      '24/7 premium support',
      'Exclusive offers',
      'Free delivery',
    ],
    requirements: [
      '6+ on-time payments',
      'Credit score > 650',
      'Account age > 6 months',
    ],
    upgradeAmount: 3500,
    upgradeRequirement: { type: 'payments', value: 6 },
  },
};
