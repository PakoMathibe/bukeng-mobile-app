// types/credit.ts
export interface CreditSummary {
  userId: string;
  totalLimit: number;
  availableCredit: number;
  usedCredit: number;
  utilizationPercentage: number;
  currentBalance: number;
  overdueAmount: number;
  nextPaymentDate: Date | null;
  nextPaymentAmount: number;
  creditScore: number;
  creditRating: 'poor' | 'fair' | 'good' | 'excellent';
  tier: number;
  limitIncreaseEligible: boolean;
  nextIncreaseAmount: number;
  nextIncreaseRequirement: {
    type: 'payments' | 'time' | 'verification';
    current: number;
    required: number;
  };
  lastUpdated: Date;
}

export interface CreditHistory {
  userId: string;
  totalBorrowed: number;
  totalRepaid: number;
  onTimePayments: number;
  latePayments: number;
  defaults: number;
  averageBalance: number;
  peakBalance: number;
  lowestBalance: number;
  averageUtilization: number;
  longestStreak: number;
  currentStreak: number;
  history: CreditHistoryEntry[];
}

export interface CreditHistoryEntry {
  date: Date;
  balance: number;
  limit: number;
  utilization: number;
  payments: number;
  purchases: number;
}

export interface CreditCheckResult {
  approved: boolean;
  reason: string | null;
  suggestedLimit: number;
  interestRate: number;
  conditions: string[];
  validUntil: Date;
}
