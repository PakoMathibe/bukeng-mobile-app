// lib/constants.ts
export const CONSTANTS = {
  APP: {
    NAME: 'Bukeng',
    TAGLINE: 'Because Food Cant Wait',
    VERSION: '1.0.0',
  },
  CREDIT: {
    TIER_0_LIMIT: 0,
    TIER_1_LIMIT: 500,
    TIER_2_LIMIT: 1500,
    TIER_3_LIMIT: 5000,
    INCREASE_AMOUNT: 250,
    REQUIRED_PAYMENTS_FOR_INCREASE: 3,
    MAX_LIMIT: 5000,
  },
  REPAYMENT: {
    INSTALMENT_COUNT: 3,
    INSTALMENT_DAYS: [0, 30, 60] as const,
    LATE_FEE: 35,
    GRACE_PERIOD_DAYS: 7,
    MAX_LATE_FEE: 100,
  },
  FEES: {
    MERCHANT_RATE: 0.03,
    CONSUMER_RATE: 0.008,
  },
  VALIDATION: {
    ID_LENGTH: 13,
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 100,
    PHONE_REGEX: /^(\+27|0)[6-8][0-9]{8}$/,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    ID_REGEX: /^\d{13}$/,
  },
  FILE_UPLOAD: {
    MAX_SIZE_BANK_STATEMENT: 10 * 1024 * 1024, // 10MB
    MAX_SIZE_SELFIE: 5 * 1024 * 1024, // 5MB
    MAX_SIZE_ID: 5 * 1024 * 1024,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg'] as const,
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/csv'] as const,
  },
  ROUTES: {
    PUBLIC: ['/', '/login', '/register', '/how-it-works'],
    EXPLORE: ['/merchants', '/map'],
    PROTECTED: ['/dashboard', '/onboarding', '/profile', '/wallet'],
  },
  TIERS: {
    0: { name: 'Explorer', minLimit: 0, maxLimit: 0, requiresKYC: false },
    1: { name: 'Verified', minLimit: 500, maxLimit: 500, requiresKYC: true },
    2: { name: 'Trusted', minLimit: 500, maxLimit: 1500, requiresKYC: true },
    3: { name: 'Premium', minLimit: 1500, maxLimit: 5000, requiresKYC: true },
  },
} as const;
