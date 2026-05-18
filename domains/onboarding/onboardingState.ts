// domains/onboarding/onboardingState.ts

export interface IDExtractedInfo {
  dateOfBirth: Date;
  gender: 'male' | 'female';
  citizenship: 'citizen' | 'permanent_resident';
  age: number;
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
  topMerchants: Array<{
    name: string;
    amount: number;
    frequency: number;
  }>;
  flags: string[];
}

export interface OnboardingState {
  // Step tracking
  currentStep: number;
  completedSteps: string[];
  
  // Phone verification
  phoneNumber: string;
  phoneVerified: boolean;
  phoneVerificationSent: boolean;
  phoneVerificationResendCount: number;
  phoneVerificationAttempts: number;
  
  // Email verification
  emailVerified: boolean;
  emailVerificationSent: boolean;
  
  // ID verification
  idNumber: string;
  idFile: string | null;  // Store file reference, not base64
  idVerified: boolean;
  idExtractedInfo: IDExtractedInfo | null;
  idVerificationAttempts: number;
  
  // Selfie verification
  selfieFile: string | null;  // Store file reference, not base64
  selfieVerified: boolean;
  selfieConfidence: number | null;
  selfieVerificationAttempts: number;
  
  // Bank statement
  bankFile: string | null;  // Store file reference, not base64
  bankUploaded: boolean;
  bankAnalysis: BankAnalysis | null;
  bankSkipped: boolean;
  
  // UI state
  isSubmitting: boolean;
  error: string | null;
}

export const ONBOARDING_STEPS = [
  { id: 'phone', name: 'Phone Verification', order: 1 },
  { id: 'email', name: 'Email Verification', order: 2 },
  { id: 'id', name: 'ID Verification', order: 3 },
  { id: 'selfie', name: 'Selfie Verification', order: 4 },
  { id: 'bank', name: 'Bank Statement', order: 5, optional: true },
] as const;

export const initialOnboardingState: OnboardingState = {
  // Step tracking
  currentStep: 0,
  completedSteps: [],
  
  // Phone verification
  phoneNumber: '',
  phoneVerified: false,
  phoneVerificationSent: false,
  phoneVerificationResendCount: 0,
  phoneVerificationAttempts: 0,
  
  // Email verification
  emailVerified: false,
  emailVerificationSent: false,
  
  // ID verification
  idNumber: '',
  idFile: null,
  idVerified: false,
  idExtractedInfo: null,
  idVerificationAttempts: 0,
  
  // Selfie verification
  selfieFile: null,
  selfieVerified: false,
  selfieConfidence: null,
  selfieVerificationAttempts: 0,
  
  // Bank statement
  bankFile: null,
  bankUploaded: false,
  bankAnalysis: null,
  bankSkipped: false,
  
  // UI state
  isSubmitting: false,
  error: null,
};

export interface OnboardingStepValidation {
  isValid: boolean;
  error?: string;
  data?: any;
}

/**
 * Helper to check if onboarding is complete (required steps only)
 */
export function isOnboardingComplete(state: OnboardingState): boolean {
  return (
    state.phoneVerified &&
    state.emailVerified &&
    state.idVerified &&
    state.selfieVerified
  );
}

/**
 * Helper to get completion percentage
 */
export function getOnboardingProgress(state: OnboardingState): number {
  const requiredSteps = ['phoneVerified', 'emailVerified', 'idVerified', 'selfieVerified'];
  const completedCount = requiredSteps.filter(step => (state as any)[step] === true).length;
  return (completedCount / requiredSteps.length) * 100;
}

/**
 * Helper to get current step index
 */
export function getCurrentStepIndex(state: OnboardingState): number {
  return ONBOARDING_STEPS.findIndex(step => !(state as any)[`${step.id}Verified`] && !step.optional) || 0;
}