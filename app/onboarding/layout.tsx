// app/(onboarding)/layout.tsx
'use client';

import { useOnboardingStore } from '@/store/onboardingStore';
import { Check } from 'lucide-react';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { steps, currentStep } = useOnboardingStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`flex-1 text-center text-xs ${
                  idx <= currentStep ? 'text-teal-600' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center transition-all ${
                    step.isCompleted
                      ? 'bg-teal-600 text-white'
                      : idx === currentStep
                      ? 'bg-teal-100 text-teal-600 border-2 border-teal-600'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {step.isCompleted ? <Check size={16} /> : idx + 1}
                </div>
                <span className="hidden sm:inline">{step.name}</span>
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
