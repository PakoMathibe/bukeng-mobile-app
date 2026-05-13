// domains/payments/paymentFlow/InstallmentSelector.ts
// This is a UI component - moved to components/payments/InstallmentSelector.tsx
// Keeping type definition here for reference

export interface InstallmentOption {
  months: number;
  monthlyAmount: number;
  totalAmount: number;
  serviceFee: number;
  isRecommended?: boolean;
  apr?: number;
}

export interface InstallmentSelectionResult {
  selectedOption: InstallmentOption;
  plan: {
    totalAmount: number;
    instalments: Array<{
      number: number;
      amount: number;
      dueDate: Date;
    }>;
  };
}
