// domains/affordability/affordabilityTypes.ts
export interface AffordabilityInput {
  userId: string;
  requestedAmount: number;
  bankStatementFile?: File;
  useSavedAnalysis?: boolean;
}

export interface AffordabilityOutput {
  approved: boolean;
  maxAmount: number;
  recommendedAmount: number;
  reason?: string;
  analysis: {
    income: number;
    expenses: number;
    debtToIncomeRatio: number;
    repaymentCapacity: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  conditions?: string[];
}

export interface BankStatementAnalysis {
  income: number;
  expenses: number;
  disposableIncome: number;
  riskScore: number;
  stability: 'high' | 'medium' | 'low';
  suggestedLimit: number;
  flags: string[];
  lastUpdated: Date;
}
