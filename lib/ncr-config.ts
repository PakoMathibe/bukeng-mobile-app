// lib/ncr-config.ts
// South African NCR regulatory compliance per Section 12

export const NCR_RULES = {
  // Per NCA Section 105 — for credit agreements below R15,000:
  MAX_INITIATION_FEE_PERCENT: 0.05,      // 5% of principal
  MAX_INITIATION_FEE_RAND_CAP: 1000,     // R1,000.00 in Rand (100000 cents)
  
  // Monthly service fee cap:
  MAX_MONTHLY_SERVICE_FEE_CENTS: 6000,   // R60.00 per month cap
  
  // Interest rate cap (short-term credit ≤ 6 months):
  MAX_MONTHLY_INTEREST_RATE: 0.05,       // 5% per month
  
  // In-duplum rule — total charges cannot exceed principal:
  IN_DUPLUM_APPLIES: true,
  
  // Cooling off period:
  COOLING_OFF_DAYS: 5,
  
  // Default interest for late payments:
  DEFAULT_INTEREST_RATE: 0.02,           // 2% per month on arrears
} as const

// Helper functions for NCR-compliant calculations
export function calculateInitiationFee(principalCents: number): number {
  const maxFee = Math.floor(principalCents * NCR_RULES.MAX_INITIATION_FEE_PERCENT)
  const feeCapCents = NCR_RULES.MAX_INITIATION_FEE_RAND_CAP * 100
  return Math.min(maxFee, feeCapCents)
}

export function calculateMonthlyServiceFee(principalCents: number): number {
  // Service fee cannot exceed R60 per month
  const calculatedFee = Math.floor(principalCents * 0.01)
  return Math.min(calculatedFee, NCR_RULES.MAX_MONTHLY_SERVICE_FEE_CENTS)
}

export function applyInDuplumRule(principalCents: number, totalChargesCents: number): number {
  if (!NCR_RULES.IN_DUPLUM_APPLIES) return totalChargesCents
  // Total charges cannot exceed the principal amount
  return Math.min(totalChargesCents, principalCents)
}