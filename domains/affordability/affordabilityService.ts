// domains/affordability/affordabilityService.ts
import { User } from '@/types/user';
import { CreditService } from '@/domains/credit/creditService';
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

export class AffordabilityService {
  /**
   * Assess if a user can afford a requested transaction amount
   * 
   * @param user - The user to assess
   * @param requestedAmount - The amount the user wants to borrow
   * @param bankAnalysis - Optional bank statement analysis for accurate income/expenses
   * @returns AffordabilityResult with decision and recommendations
   */
  static async assessAffordability(
    user: User,
    requestedAmount: number,
    bankAnalysis?: BankAnalysis
  ): Promise<AffordabilityResult> {
    try {
      // Get credit summary for existing debt and credit score
      const creditSummary = await CreditService.getCreditSummary(user.id);

      // Calculate monthly disposable income
      let monthlyIncome: number;
      let monthlyExpenses: number;

      if (bankAnalysis) {
        // Use actual bank data if available
        monthlyIncome = bankAnalysis.monthlyIncome;
        monthlyExpenses = bankAnalysis.monthlyExpenses;
      } else {
        // Estimate based on tier and credit limit (fallback for users without bank analysis)
        logger.warn(`No bank analysis for user ${user.id}, using estimated income`);
        
        if (user.tier === 3) {
          monthlyIncome = 15000;
        } else if (user.tier === 2) {
          monthlyIncome = 12000;
        } else if (user.tier === 1) {
          monthlyIncome = 8000;
        } else {
          monthlyIncome = 5000;
        }
        monthlyExpenses = monthlyIncome * 0.6; // Assume 60% essential expenses
      }

      const disposableIncome = monthlyIncome - monthlyExpenses;
      const maxMonthlyPayment = disposableIncome * 0.4; // 40% of disposable income (conservative)
      
      // Calculate affordability for 3-month repayment (your BNPL model)
      const monthlyPayment = requestedAmount / 3;
      const isAffordable = monthlyPayment <= maxMonthlyPayment;

      // Calculate recommended amount (what they can safely borrow)
      const recommendedAmountByIncome = maxMonthlyPayment * 3;
      const recommendedAmount = Math.min(
        recommendedAmountByIncome,
        creditSummary.totalLimit
      );

      // Generate reason for denial if applicable
      let reason: string | undefined;
      if (!isAffordable) {
        if (requestedAmount > creditSummary.availableCredit) {
          reason = `Insufficient credit. Available: R${creditSummary.availableCredit}`;
        } else if (monthlyPayment > maxMonthlyPayment) {
          reason = `Based on your income and expenses, the maximum we can offer is R${recommendedAmount.toFixed(2)}`;
        } else {
          reason = `Unable to approve R${requestedAmount} at this time. Maximum recommended: R${recommendedAmount.toFixed(2)}`;
        }
      }

      const result: AffordabilityResult = {
        affordable: isAffordable,
        maxAmount: recommendedAmountByIncome,
        recommendedAmount,
        reason,
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
        income: monthlyIncome,
        expenses: monthlyExpenses,
        disposable: disposableIncome,
      });

      return result;
    } catch (error) {
      logger.error('Failed to assess affordability', error);
      throw new Error('Unable to complete affordability assessment. Please try again later.');
    }
  }

  /**
   * Calculate debt-to-income ratio for a user
   * 
   * @param userId - User ID to assess
   * @param monthlyIncome - Optional monthly income (if known, otherwise estimated)
   * @returns Debt-to-income ratio as percentage
   */
  static async calculateDebtToIncomeRatio(
    userId: string,
    monthlyIncome?: number
  ): Promise<number> {
    try {
      const creditSummary = await CreditService.getCreditSummary(userId);
      
      // Estimate monthly income if not provided
      let estimatedMonthlyIncome = monthlyIncome;
      if (!estimatedMonthlyIncome) {
        // Estimate based on credit limit and tier
        if (creditSummary.totalLimit >= 5000) {
          estimatedMonthlyIncome = 15000;
        } else if (creditSummary.totalLimit >= 1500) {
          estimatedMonthlyIncome = 10000;
        } else if (creditSummary.totalLimit >= 500) {
          estimatedMonthlyIncome = 6000;
        } else {
          estimatedMonthlyIncome = 4000;
        }
      }

      // Calculate monthly debt obligations (assuming 3-month repayment schedule)
      const monthlyDebt = creditSummary.currentBalance / 3;
      const debtToIncomeRatio = (monthlyDebt / estimatedMonthlyIncome) * 100;

      logger.debug(`Debt-to-income ratio for user ${userId}`, {
        ratio: debtToIncomeRatio,
        monthlyDebt,
        monthlyIncome: estimatedMonthlyIncome,
      });

      return Math.min(debtToIncomeRatio, 100); // Cap at 100%
    } catch (error) {
      logger.error('Failed to calculate debt-to-income ratio', error);
      return 0;
    }
  }

  /**
   * Get a simplified affordability verdict for UI display
   * 
   * @param user - The user to assess
   * @param amount - The amount being considered
   * @param bankAnalysis - Optional bank analysis
   * @returns Simple verdict object for UI
   */
  static async getSimpleVerdict(
    user: User,
    amount: number,
    bankAnalysis?: BankAnalysis
  ): Promise<{
    approved: boolean;
    message: string;
    suggestedAmount?: number;
  }> {
    const assessment = await this.assessAffordability(user, amount, bankAnalysis);
    
    if (assessment.affordable) {
      return {
        approved: true,
        message: `You qualify for R${amount}!`,
        suggestedAmount: amount,
      };
    }
    
    if (assessment.recommendedAmount > 0) {
      return {
        approved: false,
        message: `You may qualify for up to R${assessment.recommendedAmount}`,
        suggestedAmount: assessment.recommendedAmount,
      };
    }
    
    return {
      approved: false,
      message: 'Unable to approve at this time. Build credit history with smaller purchases.',
    };
  }
}