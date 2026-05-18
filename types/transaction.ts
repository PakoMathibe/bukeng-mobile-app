// types/user.ts
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