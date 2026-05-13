// modules/CreditEngine/scoreUser.ts
import { User } from '@/types/user';
import { CreditHistory } from '@/types/credit';

export interface CreditScoreResult {
  score: number;
  rating: 'poor' | 'fair' | 'good' | 'excellent';
  factors: {
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    value: number;
  }[];
  recommendations: string[];
}

export class CreditScoreEngine {
  private static readonly WEIGHTS = {
    paymentHistory: 0.35,
    creditUtilization: 0.3,
    accountAge: 0.15,
    creditMix: 0.1,
    recentActivity: 0.1,
  };

  static calculateScore(user: User, history: CreditHistory): CreditScoreResult {
    let score = 500; // Base score
    const factors = [];

    // 1. Payment History (35% weight)
    const onTimeRate =
      history.onTimePayments /
      (history.onTimePayments + history.latePayments + 1);
    const paymentScore = onTimeRate * 300;
    score += paymentScore;
    factors.push({
      name: 'Payment History',
      impact:
        onTimeRate > 0.9
          ? 'positive'
          : onTimeRate > 0.7
          ? 'neutral'
          : 'negative',
      weight: this.WEIGHTS.paymentHistory,
      value: onTimeRate,
    });

    // 2. Credit Utilization (30% weight)
    const utilization = history.averageUtilization;
    let utilizationScore = 0;
    if (utilization < 30) utilizationScore = 250;
    else if (utilization < 50) utilizationScore = 200;
    else if (utilization < 70) utilizationScore = 150;
    else if (utilization < 90) utilizationScore = 80;
    else utilizationScore = 0;
    score += utilizationScore;
    factors.push({
      name: 'Credit Utilization',
      impact:
        utilization < 30
          ? 'positive'
          : utilization < 70
          ? 'neutral'
          : 'negative',
      weight: this.WEIGHTS.creditUtilization,
      value: utilization,
    });

    // 3. Account Age (15% weight)
    const accountAgeMonths =
      (Date.now() - new Date(user.createdAt).getTime()) /
      (1000 * 60 * 60 * 24 * 30);
    const ageScore = Math.min(accountAgeMonths * 8, 150);
    score += ageScore;
    factors.push({
      name: 'Account Age',
      impact:
        accountAgeMonths > 12
          ? 'positive'
          : accountAgeMonths > 6
          ? 'neutral'
          : 'negative',
      weight: this.WEIGHTS.accountAge,
      value: accountAgeMonths,
    });

    // 4. Credit Mix (10% weight)
    const hasMultipleProducts = user.tier > 1;
    const mixScore = hasMultipleProducts ? 80 : 40;
    score += mixScore;
    factors.push({
      name: 'Credit Mix',
      impact: hasMultipleProducts ? 'positive' : 'neutral',
      weight: this.WEIGHTS.creditMix,
      value: hasMultipleProducts ? 1 : 0,
    });

    // 5. Recent Activity (10% weight)
    const hasRecentActivity = history.totalBorrowed > 0;
    const activityScore = hasRecentActivity ? 70 : 30;
    score += activityScore;
    factors.push({
      name: 'Recent Activity',
      impact: hasRecentActivity ? 'positive' : 'neutral',
      weight: this.WEIGHTS.recentActivity,
      value: hasRecentActivity ? 1 : 0,
    });

    // Determine rating
    let rating: CreditScoreResult['rating'] = 'poor';
    if (score >= 750) rating = 'excellent';
    else if (score >= 650) rating = 'good';
    else if (score >= 550) rating = 'fair';
    else rating = 'poor';

    // Generate recommendations
    const recommendations: string[] = [];
    if (onTimeRate < 0.9)
      recommendations.push('Make all payments on time to improve your score');
    if (utilization > 50)
      recommendations.push('Reduce your credit utilization below 50%');
    if (accountAgeMonths < 6)
      recommendations.push('Keep your account active to build history');

    return { score, rating, factors, recommendations };
  }

  static getScoreBand(score: number): {
    min: number;
    max: number;
    color: string;
  } {
    if (score >= 750) return { min: 750, max: 1000, color: 'green' };
    if (score >= 650) return { min: 650, max: 749, color: 'teal' };
    if (score >= 550) return { min: 550, max: 649, color: 'yellow' };
    return { min: 0, max: 549, color: 'red' };
  }
}
