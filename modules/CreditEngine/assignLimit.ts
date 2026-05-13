// modules/CreditEngine/assignLimit.ts
import { User, UserTier } from '@/types/user';
import { CreditScoreResult } from './scoreUser';

export interface LimitAssignmentResult {
  limit: number;
  reason: string;
  factors: {
    tierLimit: number;
    scoreAdjustment: number;
    incomeAdjustment: number;
    finalLimit: number;
  };
}

export class LimitAssignmentEngine {
  private static readonly BASE_LIMITS: Record<UserTier, number> = {
    0: 0,
    1: 500,
    2: 1500,
    3: 5000,
  };

  static assignLimit(
    user: User,
    creditScore: CreditScoreResult,
    monthlyIncome?: number
  ): LimitAssignmentResult {
    const baseLimit = this.BASE_LIMITS[user.tier];

    // Adjust based on credit score
    let scoreAdjustment = 1.0;
    if (creditScore.score >= 750) scoreAdjustment = 1.5;
    else if (creditScore.score >= 650) scoreAdjustment = 1.2;
    else if (creditScore.score >= 550) scoreAdjustment = 1.0;
    else scoreAdjustment = 0.5;

    // Adjust based on income (if available)
    let incomeAdjustment = 1.0;
    if (monthlyIncome) {
      if (monthlyIncome >= 15000) incomeAdjustment = 1.3;
      else if (monthlyIncome >= 10000) incomeAdjustment = 1.1;
      else if (monthlyIncome >= 5000) incomeAdjustment = 0.8;
      else incomeAdjustment = 0.5;
    }

    const finalLimit = Math.min(
      baseLimit * scoreAdjustment * incomeAdjustment,
      this.BASE_LIMITS[user.tier] * 2 // Cap at 2x base limit
    );

    let reason = '';
    if (creditScore.score >= 650) {
      reason = 'Good credit score qualified you for higher limit';
    } else if (creditScore.score >= 550) {
      reason = 'Standard limit based on verification level';
    } else {
      reason =
        'Limited due to credit score. Make on-time payments to increase.';
    }

    return {
      limit: Math.floor(finalLimit),
      reason,
      factors: {
        tierLimit: baseLimit,
        scoreAdjustment: scoreAdjustment,
        incomeAdjustment: incomeAdjustment,
        finalLimit: Math.floor(finalLimit),
      },
    };
  }
}
