'use client';

interface Step {
  id: string;
  title: string;
  isCompleted: boolean;
  isRequired: boolean;
}

interface OnboardingProgressProps {
  steps: Step[];
  currentStep: number;
}

export function OnboardingProgress({
  steps,
  currentStep,
}: OnboardingProgressProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-gray-400">
          Step {currentStep + 1} of {steps.length}
        </span>
        <span className="text-sm text-yellow-500">{Math.round(progress)}%</span>
      </div>

      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between mt-4">
        {steps.map((step, index) => (
          <div key={step.id} className="text-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                step.isCompleted
                  ? 'bg-green-500 text-white'
                  : index === currentStep
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {step.isCompleted ? '✓' : index + 1}
            </div>
            <p className="text-xs text-gray-400 mt-1">{step.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
