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

interface OnboardingState {
  currentStep: number;
  steps: OnboardingStep[];
  completedSteps: string[];

  // Verification states
  phoneNumber: string;
  phoneVerified: boolean;
  phoneVerificationCode: string | null;
  phoneVerificationAttempts: number;

  idNumber: string;
  idVerified: boolean;
  idVerificationAttempts: number;

  selfieFile: string | null;
  selfieVerified: boolean;
  selfieVerificationAttempts: number;

  bankFile: string | null;
  bankUploaded: boolean;
  bankAnalysis: Record<string, unknown> | null;

  // UI state
  isSubmitting: boolean;
  error: string | null;

  // Actions
  setCurrentStep: (step: number) => void;
  completeStep: (stepId: string) => void;
  resetOnboarding: () => void;

  setPhoneNumber: (number: string) => void;
  setPhoneVerified: (verified: boolean) => void;
  setPhoneVerificationCode: (code: string | null) => void;
  incrementPhoneAttempts: () => void;

  setIDNumber: (number: string) => void;
  setIDVerified: (verified: boolean) => void;
  incrementIDAttempts: () => void;

  setSelfieFile: (file: string | null) => void;
  setSelfieVerified: (verified: boolean) => void;
  incrementSelfieAttempts: () => void;

  setBankFile: (file: string | null) => void;
  setBankUploaded: (uploaded: boolean) => void;
  setBankAnalysis: (analysis: Record<string, unknown> | null) => void;

  setIsSubmitting: (isSubmitting: boolean) => void;
  setError: (error: string | null) => void;
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

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      currentStep: 0,
      steps: defaultSteps,
      completedSteps: [],

      phoneNumber: '',
      phoneVerified: false,
      phoneVerificationCode: null,
      phoneVerificationAttempts: 0,

      idNumber: '',
      idVerified: false,
      idVerificationAttempts: 0,

      selfieFile: null,
      selfieVerified: false,
      selfieVerificationAttempts: 0,

      bankFile: null,
      bankUploaded: false,
      bankAnalysis: null,

      isSubmitting: false,
      error: null,

      setCurrentStep: (step) => set({ currentStep: step }),

      completeStep: (stepId) =>
        set((state) => ({
          completedSteps: [...state.completedSteps, stepId],
          steps: state.steps.map((step) =>
            step.id === stepId ? { ...step, isCompleted: true } : step
          ),
          currentStep: Math.min(state.currentStep + 1, state.steps.length - 1),
        })),

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
          selfieFile: null,
          selfieVerified: false,
          selfieVerificationAttempts: 0,
          bankFile: null,
          bankUploaded: false,
          bankAnalysis: null,
          isSubmitting: false,
          error: null,
          steps: defaultSteps,
        }),

      setPhoneNumber: (number) => set({ phoneNumber: number }),
      setPhoneVerified: (verified) => set({ phoneVerified: verified }),
      setPhoneVerificationCode: (code) => set({ phoneVerificationCode: code }),
      incrementPhoneAttempts: () =>
        set((state) => ({
          phoneVerificationAttempts: state.phoneVerificationAttempts + 1,
        })),

      setIDNumber: (number) => set({ idNumber: number }),
      setIDVerified: (verified) => set({ idVerified: verified }),
      incrementIDAttempts: () =>
        set((state) => ({
          idVerificationAttempts: state.idVerificationAttempts + 1,
        })),

      setSelfieFile: (file) => set({ selfieFile: file }),
      setSelfieVerified: (verified) => set({ selfieVerified: verified }),
      incrementSelfieAttempts: () =>
        set((state) => ({
          selfieVerificationAttempts: state.selfieVerificationAttempts + 1,
        })),

      setBankFile: (file) => set({ bankFile: file }),
      setBankUploaded: (uploaded) => set({ bankUploaded: uploaded }),
      setBankAnalysis: (analysis) => set({ bankAnalysis: analysis }),

      setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'bukeng-onboarding-storage',
    }
  )
);
