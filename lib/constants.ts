// lib/constants.ts
// Centralized constants - NO hardcoded values anywhere else

export const CREDIT_TIERS = {
  BRONZE: {
    name: 'bronze',
    minScore: 0,
    maxScore: 599,
    defaultLimitCents: 50000, // R500.00
  },
  SILVER: {
    name: 'silver',
    minScore: 600,
    maxScore: 799,
    defaultLimitCents: 250000, // R2,500.00
  },
  GOLD: {
    name: 'gold',
    minScore: 800,
    maxScore: 1000,
    defaultLimitCents: 500000, // R5,000.00
  },
} as const

export const REPAYMENT_TERMS = {
  MIN_TERM_DAYS: 7,
  MAX_TERM_DAYS: 90,
  DEFAULT_TERM_DAYS: 30,
  LATE_FEE_PERCENT: 0.10, // 10% of missed payment
  LATE_FEE_MIN_CENTS: 5000, // R50.00
  LATE_FEE_MAX_CENTS: 25000, // R250.00
} as const

export const VALIDATION_RULES = {
  PHONE_REGEX: /^(\+27|0)[6-8][0-9]{8}$/,
  SA_ID_REGEX: /^[0-9]{13}$/,
  MAX_PDF_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIME_TYPES: ['application/pdf'],
  MIN_PURCHASE_CENTS: 5000, // R50.00
  MAX_PURCHASE_CENTS: 500000, // R5,000.00
} as const

export const ONBOARDING_STATUS = {
  PENDING: 'pending',
  PHONE_VERIFIED: 'phone_verified',
  PROFILE_COMPLETED: 'profile_completed',
  CREDIT_SCORED: 'credit_scored',
  MANDATE_SIGNED: 'mandate_signed',
  COMPLETED: 'completed',
} as const