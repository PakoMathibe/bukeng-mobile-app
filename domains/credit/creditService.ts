// domains/credit/creditService.ts
import { User, UserTier, TIER_CONFIGS } from '@/types/user';
import {
  CreditSummary,
  CreditHistory,
  CreditCheckResult,
} from '@/types/credit';
import { CreditScoreEngine } from '@/modules/CreditEngine/scoreUser';
import { LimitAssignmentEngine } from '@/modules/CreditEngine/assignLimit';
import { LimitAdjustmentEngine } from '@/modules/CreditEngine/adjustLimit';
import { AppError, NotFoundError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';

// Mock database - in production, use real DB
interface CreditRecord {
  userId: string;
  summary: CreditSummary;
  history: CreditHistory;
}

const creditDatabase: Map<string, CreditRecord> = new Map();

export class CreditService {
  static async getCreditSummary(userId: string): Promise<CreditSummary> {
    try {
      const record = creditDatabase.get(userId);

      if (!record) {
        throw new NotFoundError(`Credit record for user ${userId}`);
      }

      return record.summary;
    } catch (error) {
      logger.error('Failed to get credit summary', error);
      throw error;
    }
  }

  static async getCreditHistory(userId: string): Promise<CreditHistory> {
    try {
      const record = creditDatabase.get(userId);

      if (!record) {
        throw new NotFoundError(`Credit record for user ${userId}`);
      }

      return record.history;
    } catch (error) {
      logger.error('Failed to get credit history', error);
      throw error;
    }
  }

  static async initializeCredit(user: User): Promise<CreditSummary> {
    try {
      const tierConfig = TIER_CONFIGS[user.tier as UserTier];
      const baseLimit = tierConfig.minCreditLimit;

      // Calculate initial credit score
      const initialHistory: CreditHistory = {
        userId: user.id,
        totalBorrowed: 0,
        totalRepaid: 0,
        onTimePayments: 0,
        latePayments: 0,
        defaults: 0,
        averageBalance: 0,
        peakBalance: 0,
        lowestBalance: 0,
        averageUtilization: 0,
        longestStreak: 0,
        currentStreak: 0,
        history: [],
      };

      const creditScore = CreditScoreEngine.calculateScore(
        user,
        initialHistory
      );
      const limitAssignment = LimitAssignmentEngine.assignLimit(
        user,
        creditScore
      );

      const summary: CreditSummary = {
        userId: user.id,
        totalLimit: limitAssignment.limit,
        availableCredit: limitAssignment.limit,
        usedCredit: 0,
        utilizationPercentage: 0,
        currentBalance: 0,
        overdueAmount: 0,
        nextPaymentDate: null,
        nextPaymentAmount: 0,
        creditScore: creditScore.score,
        creditRating: creditScore.rating,
        tier: user.tier,
        limitIncreaseEligible: false,
        nextIncreaseAmount:
          TIER_CONFIGS[user.tier as UserTier]?.upgradeAmount || 0,
        nextIncreaseRequirement: {
          type: 'payments',
          current: 0,
          required:
            TIER_CONFIGS[user.tier as UserTier]?.upgradeRequirement.value || 3,
        },
        lastUpdated: new Date(),
      };

      const record: CreditRecord = {
        userId: user.id,
        summary,
        history: initialHistory,
      };

      creditDatabase.set(user.id, record);

      return summary;
    } catch (error) {
      logger.error('Failed to initialize credit', error);
      throw new AppError(
        'Failed to initialize credit',
        'CREDIT_INIT_ERROR',
        500
      );
    }
  }

  static async checkEligibility(
    user: User,
    requestedAmount: number
  ): Promise<CreditCheckResult> {
    try {
      const summary = await this.getCreditSummary(user.id);

      if (requestedAmount > summary.availableCredit) {
        return {
          approved: false,
          reason: `Insufficient credit. Available: R${summary.availableCredit}`,
          suggestedLimit: summary.availableCredit,
          interestRate: 0,
          conditions: [],
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };
      }

      if (summary.creditScore < 500) {
        return {
          approved: false,
          reason: 'Credit score too low. Make on-time payments to improve.',
          suggestedLimit: 0,
          interestRate: 0,
          conditions: ['Make 3 on-time payments to increase eligibility'],
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };
      }

      return {
        approved: true,
        reason: null,
        suggestedLimit: requestedAmount,
        interestRate: 0,
        conditions: [],
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    } catch (error) {
      logger.error('Failed to check eligibility', error);
      throw error;
    }
  }

  static async updateAfterPayment(
    userId: string,
    paymentAmount: number,
    onTime: boolean
  ): Promise<CreditSummary> {
    try {
      const record = creditDatabase.get(userId);
      if (!record) {
        throw new NotFoundError(`Credit record for user ${userId}`);
      }

      const updatedHistory: CreditHistory = {
        ...record.history,
        totalRepaid: record.history.totalRepaid + paymentAmount,
        onTimePayments: record.history.onTimePayments + (onTime ? 1 : 0),
        latePayments: record.history.latePayments + (onTime ? 0 : 1),
        currentStreak: onTime ? record.history.currentStreak + 1 : 0,
        longestStreak: Math.max(
          record.history.longestStreak,
          record.history.currentStreak + (onTime ? 1 : 0)
        ),
      };

      const creditScore = CreditScoreEngine.calculateScore(
        { ...record.summary, tier: record.summary.tier } as User,
        updatedHistory
      );

      const limitAdjustment = LimitAdjustmentEngine.evaluateIncrease(
        {
          creditLimit: record.summary.totalLimit,
          tier: record.summary.tier,
        } as User,
        updatedHistory
      );

      const updatedSummary: CreditSummary = {
        ...record.summary,
        usedCredit: Math.max(0, record.summary.usedCredit - paymentAmount),
        availableCredit:
          record.summary.totalLimit -
          Math.max(0, record.summary.usedCredit - paymentAmount),
        utilizationPercentage:
          ((record.summary.usedCredit - paymentAmount) /
            record.summary.totalLimit) *
          100,
        currentBalance: Math.max(
          0,
          record.summary.currentBalance - paymentAmount
        ),
        creditScore: creditScore.score,
        creditRating: creditScore.rating,
        limitIncreaseEligible: limitAdjustment.adjustmentAmount > 0,
        nextIncreaseAmount: limitAdjustment.adjustmentAmount,
        lastUpdated: new Date(),
      };

      const newRecord: CreditRecord = {
        ...record,
        summary: updatedSummary,
        history: updatedHistory,
      };

      creditDatabase.set(userId, newRecord);

      return updatedSummary;
    } catch (error) {
      logger.error('Failed to update credit after payment', error);
      throw error;
    }
  }

  static async checkLimitIncrease(userId: string): Promise<boolean> {
    try {
      const record = creditDatabase.get(userId);
      if (!record) {
        throw new NotFoundError(`Credit record for user ${userId}`);
      }

      return record.history.onTimePayments >= 3;
    } catch (error) {
      logger.error('Failed to check limit increase', error);
      throw error;
    }
  }
}
