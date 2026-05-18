// store/onboardingStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OnboardingStep {
  id: string;
  name: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
  order: number;
  canSkip: boolean;
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
}

interface OnboardingState {
  // Step tracking
  currentStep: number;
  steps: OnboardingStep[];
  completedSteps: string[];

  // Phone verification
  phoneNumber: string;
  phoneVerified: boolean;
  phoneVerificationCode: string | null;
  phoneVerificationAttempts: number;

  // ID verification
  idNumber: string;
  idVerified: boolean;
  idVerificationAttempts: number;

  // Selfie verification (store only status, not file data)
  selfieUploaded: boolean;
  selfieVerified: boolean;
  selfieVerificationAttempts: number;

  // Bank statement
  bankFile: string | null;  // Store only file reference/name, not base64
  bankUploaded: boolean;
  bankAnalysis: BankAnalysis | null;

  // UI state
  isSubmitting: boolean;
  error: string | null;

  // Actions
  setCurrentStep: (step: number) => void;
  completeStep: (stepId: string) => void;
  resetOnboarding: () => void;

  // Phone actions
  setPhoneNumber: (number: string) => void;
  setPhoneVerified: (verified: boolean) => void;
  setPhoneVerificationCode: (code: string | null) => void;
  incrementPhoneAttempts: () => void;
  resetPhoneVerification: () => void;

  // ID actions
  setIDNumber: (number: string) => void;
  setIDVerified: (verified: boolean) => void;
  incrementIDAttempts: () => void;
  resetIDVerification: () => void;

  // Selfie actions
  setSelfieUploaded: (uploaded: boolean) => void;
  setSelfieVerified: (verified: boolean) => void;
  incrementSelfieAttempts: () => void;
  resetSelfieVerification: () => void;

  // Bank actions
  setBankFile: (file: string | null) => void;
  setBankUploaded: (uploaded: boolean) => void;
  setBankAnalysis: (analysis: BankAnalysis | null) => void;
  resetBankUpload: () => void;

  // UI actions
  setIsSubmitting: (isSubmitting: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const defaultSteps: OnboardingStep[] = [
  {
    id: 'phone',
    name: 'Phone Verification',
    description: 'Verify your mobile number',
    isCompleted: false,
    isRequired: true,
    order: 1,
    canSkip: false,
  },
  {
    id: 'id',
    name: 'ID Verification',
    description: 'Verify your South African ID',
    isCompleted: false,
    isRequired: true,
    order: 2,
    canSkip: false,
  },
  {
    id: 'selfie',
    name: 'Selfie Verification',
    description: 'Take a selfie to match your ID',
    isCompleted: false,
    isRequired: true,
    order: 3,
    canSkip: false,
  },
  {
    id: 'bank',
    name: 'Bank Statement',
    description: 'Upload for higher limits',
    isCompleted: false,
    isRequired: false,
    order: 4,
    canSkip: true,
  },
];

const MAX_VERIFICATION_ATTEMPTS = 5;

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      // Step tracking
      currentStep: 0,
      steps: defaultSteps,
      completedSteps: [],

      // Phone verification
      phoneNumber: '',
      phoneVerified: false,
      phoneVerificationCode: null,
      phoneVerificationAttempts: 0,

      // ID verification
      idNumber: '',
      idVerified: false,
      idVerificationAttempts: 0,

      // Selfie verification
      selfieUploaded: false,
      selfieVerified: false,
      selfieVerificationAttempts: 0,

      // Bank statement
      bankFile: null,
      bankUploaded: false,
      bankAnalysis: null,

      // UI state
      isSubmitting: false,
      error: null,

      // Step actions
      setCurrentStep: (step) => set({ currentStep: step }),

      completeStep: (stepId) =>
        set((state) => {
          // Find if this step is the bank step (skippable)
          const isBankStep = stepId === 'bank';
          const nextStep = isBankStep 
            ? state.steps.length - 1  // Jump to success
            : Math.min(state.currentStep + 1, state.steps.length - 1);

          return {
            completedSteps: [...state.completedSteps, stepId],
            steps: state.steps.map((step) =>
              step.id === stepId ? { ...step, isCompleted: true } : step
            ),
            currentStep: nextStep,
          };
        }),

      resetOnboarding: () =>
        set({
          currentStep: 0,
          completedSteps: [],
          phoneNumber: '',
          phoneVerified: false,
          phoneVerificationCode: null,
          phoneVerificationAttempts: 0,
          idNumber: '',
          idVerified: false,
          idVerificationAttempts: 0,
          selfieUploaded: false,
          selfieVerified: false,
          selfieVerificationAttempts: 0,
          bankFile: null,
          bankUploaded: false,
          bankAnalysis: null,
          isSubmitting: false,
          error: null,
          steps: defaultSteps,
        }),

      // Phone actions
      setPhoneNumber: (number) => set({ phoneNumber: number }),
      setPhoneVerified: (verified) => set({ phoneVerified: verified }),
      setPhoneVerificationCode: (code) => set({ phoneVerificationCode: code }),
      incrementPhoneAttempts: () =>
        set((state) => ({
          phoneVerificationAttempts: state.phoneVerificationAttempts + 1,
        })),
      resetPhoneVerification: () =>
        set({
          phoneVerified: false,
          phoneVerificationCode: null,
          phoneVerificationAttempts: 0,
        }),

      // ID actions
      setIDNumber: (number) => set({ idNumber: number }),
      setIDVerified: (verified) => set({ idVerified: verified }),
      incrementIDAttempts: () =>
        set((state) => ({
          idVerificationAttempts: state.idVerificationAttempts + 1,
        })),
      resetIDVerification: () =>
        set({
          idVerified: false,
          idVerificationAttempts: 0,
        }),

      // Selfie actions
      setSelfieUploaded: (uploaded) => set({ selfieUploaded: uploaded }),
      setSelfieVerified: (verified) => set({ selfieVerified: verified }),
      incrementSelfieAttempts: () =>
        set((state) => ({
          selfieVerificationAttempts: state.selfieVerificationAttempts + 1,
        })),
      resetSelfieVerification: () =>
        set({
          selfieUploaded: false,
          selfieVerified: false,
          selfieVerificationAttempts: 0,
        }),

      // Bank actions
      setBankFile: (file) => set({ bankFile: file }),
      setBankUploaded: (uploaded) => set({ bankUploaded: uploaded }),
      setBankAnalysis: (analysis) => set({ bankAnalysis: analysis }),
      resetBankUpload: () =>
        set({
          bankFile: null,
          bankUploaded: false,
          bankAnalysis: null,
        }),

      // UI actions
      setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'bukeng-onboarding-storage',
      partialize: (state) => ({
        // Only persist these fields (exclude large data like bankFile)
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        phoneNumber: state.phoneNumber,
        phoneVerified: state.phoneVerified,
        idNumber: state.idNumber,
        idVerified: state.idVerified,
        selfieUploaded: state.selfieUploaded,
        selfieVerified: state.selfieVerified,
        bankUploaded: state.bankUploaded,
        bankAnalysis: state.bankAnalysis,
      }),
    }
  )
);