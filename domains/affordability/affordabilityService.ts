// domains/affordability/affordabilityService.ts
import { User } from '@/types/user';
import { logger } from '@/lib/logger';

export interface AffordabilityResult {
  affordable: boolean;
  maxAmount: number;
  recommendedAmount: number;
  reason?: string;
  factors: {
    income: number;
    expenses: number;
    disposable: number;
    existingDebt: number;
    creditScore: number;
  };
}

export class AffordabilityService {
  static async assessAffordability(
    user: User,
    requestedAmount: number,
    bankAnalysis?: BankAnalysis
  ): Promise<AffordabilityResult> {
    try {
      // Get credit history
      const { CreditService } = await import('@/domains/credit/creditService');
      const creditSummary = await CreditService.getCreditSummary(user.id);

      // Calculate monthly disposable income
      let monthlyIncome = 0;
      let monthlyExpenses = 0;

      if (bankAnalysis) {
        monthlyIncome = bankAnalysis.monthlyIncome;
        monthlyExpenses = bankAnalysis.monthlyExpenses;
      } else {
        // Estimate based on tier and credit limit
        monthlyIncome =
          user.tier === 1 ? 8000 : user.tier === 2 ? 12000 : 15000;
        monthlyExpenses = monthlyIncome * 0.6;
      }

      const disposableIncome = monthlyIncome - monthlyExpenses;
      const maxMonthlyPayment = disposableIncome * 0.4; // 40% of disposable income

      // Calculate affordability for 3-month repayment
      const monthlyPayment = requestedAmount / 3;
      const isAffordable = monthlyPayment <= maxMonthlyPayment;

      // Calculate recommended amount
      const recommendedAmount = Math.min(
        maxMonthlyPayment * 3,
        creditSummary.totalLimit
      );

      const result: AffordabilityResult = {
        affordable: isAffordable,
        maxAmount: maxMonthlyPayment * 3,
        recommendedAmount,
        reason: isAffordable
          ? undefined
          : `Based on your income and expenses, the maximum we can offer is R${recommendedAmount}`,
        factors: {
          income: monthlyIncome,
          expenses: monthlyExpenses,
          disposable: disposableIncome,
          existingDebt: creditSummary.usedCredit,
          creditScore: creditSummary.creditScore,
        },
      };

      logger.info(`Affordability assessment for user ${user.id}`, {
        requested: requestedAmount,
        affordable: result.affordable,
        recommended: result.recommendedAmount,
      });

      return result;
    } catch (error) {
      logger.error('Failed to assess affordability', error);
      throw error;
    }
  }

  static async calculateDebtToIncomeRatio(userId: string): Promise<number> {
    try {
      const { CreditService } = await import('@/domains/credit/creditService');
      const creditSummary = await CreditService.getCreditSummary(userId);

      // Simplified - would need actual income data
      const estimatedMonthlyIncome = 10000; // Placeholder
      const monthlyDebt = creditSummary.currentBalance / 3; // Assuming 3-month repayment

      return (monthlyDebt / estimatedMonthlyIncome) * 100;
    } catch (error) {
      logger.error('Failed to calculate debt-to-income ratio', error);
      return 0;
    }
  }
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
