// domains/onboarding/onboardingState.ts
export interface OnboardingState {
  currentStep: number;
  completedSteps: string[];
  phoneNumber: string;
  phoneVerified: boolean;
  phoneVerificationSent: boolean;
  phoneVerificationResendCount: number;

  idNumber: string;
  idFile: string | null;
  idVerified: boolean;
  idExtractedInfo: any | null;

  selfieFile: string | null;
  selfieVerified: boolean;
  selfieConfidence: number | null;

  bankFile: string | null;
  bankUploaded: boolean;
  bankAnalysis: any | null;
  bankSkipped: boolean;

  isSubmitting: boolean;
  error: string | null;
}

export const initialOnboardingState: OnboardingState = {
  currentStep: 0,
  completedSteps: [],
  phoneNumber: '',
  phoneVerified: false,
  phoneVerificationSent: false,
  phoneVerificationResendCount: 0,
  idNumber: '',
  idFile: null,
  idVerified: false,
  idExtractedInfo: null,
  selfieFile: null,
  selfieVerified: false,
  selfieConfidence: null,
  bankFile: null,
  bankUploaded: false,
  bankAnalysis: null,
  bankSkipped: false,
  isSubmitting: false,
  error: null,
};

export interface OnboardingStepValidation {
  isValid: boolean;
  error?: string;
  data?: any;
}
