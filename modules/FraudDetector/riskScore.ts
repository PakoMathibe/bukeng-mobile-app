// modules/FraudDetector/riskScore.ts
import { User } from '@/types/user';
import { Transaction } from '@/types/transaction';
import { DeviceFingerprint } from './deviceFingerprint';

export interface RiskScoreResult {
  score: number; // 0-100, higher = more risky
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    name: string;
    weight: number;
    contribution: number;
    description: string;
  }[];
  recommendations: string[];
}

export class RiskScoreCalculator {
  static calculate(
    user: User,
    transaction: Partial<Transaction>,
    deviceFingerprint: DeviceFingerprint,
    historicalFingerprint?: DeviceFingerprint
  ): RiskScoreResult {
    let score = 0;
    const factors: RiskScoreResult['factors'] = [];

    // Factor 1: Account Age (30% weight)
    const accountAgeDays =
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    let accountAgeContribution = 0;
    if (accountAgeDays < 7) accountAgeContribution = 30;
    else if (accountAgeDays < 30) accountAgeContribution = 15;
    else if (accountAgeDays < 90) accountAgeContribution = 5;
    else accountAgeContribution = 0;

    score += accountAgeContribution;
    factors.push({
      name: 'Account Age',
      weight: 0.3,
      contribution: accountAgeContribution,
      description: `${Math.floor(accountAgeDays)} days old`,
    });

    // Factor 2: Transaction Amount (25% weight)
    let amountContribution = 0;
    if (transaction.amount && transaction.amount > 3000)
      amountContribution = 25;
    else if (transaction.amount && transaction.amount > 1500)
      amountContribution = 15;
    else if (transaction.amount && transaction.amount > 500)
      amountContribution = 5;
    else amountContribution = 0;

    score += amountContribution;
    factors.push({
      name: 'Transaction Amount',
      weight: 0.25,
      contribution: amountContribution,
      description: `R${transaction.amount || 0}`,
    });

    // Factor 3: Device Match (20% weight)
    let deviceContribution = 0;
    if (historicalFingerprint) {
      const matchPercentage = this.compareFingerprints(
        deviceFingerprint,
        historicalFingerprint
      );
      if (matchPercentage < 50) deviceContribution = 20;
      else if (matchPercentage < 80) deviceContribution = 10;
      else deviceContribution = 0;
    } else {
      deviceContribution = 10; // New device, medium risk
    }

    score += deviceContribution;
    factors.push({
      name: 'Device Match',
      weight: 0.2,
      contribution: deviceContribution,
      description: historicalFingerprint
        ? 'Device mismatch detected'
        : 'New device',
    });

    // Factor 4: Verification Status (15% weight)
    let verificationContribution = 0;
    if (!user.isVerified) verificationContribution = 15;
    else if (user.tier === 1) verificationContribution = 5;
    else verificationContribution = 0;

    score += verificationContribution;
    factors.push({
      name: 'Verification Status',
      weight: 0.15,
      contribution: verificationContribution,
      description: user.isVerified ? 'Verified' : 'Unverified',
    });

    // Factor 5: Transaction Velocity (10% weight)
    let velocityContribution = 0;
    // This would check recent transaction count
    velocityContribution = 0;

    score += velocityContribution;
    factors.push({
      name: 'Transaction Velocity',
      weight: 0.1,
      contribution: velocityContribution,
      description: 'Normal activity',
    });

    let level: RiskScoreResult['level'] = 'low';
    if (score >= 70) level = 'critical';
    else if (score >= 50) level = 'high';
    else if (score >= 30) level = 'medium';
    else level = 'low';

    const recommendations: string[] = [];
    if (!user.isVerified)
      recommendations.push('Complete identity verification to reduce risk');
    if (transaction.amount && transaction.amount > 2000)
      recommendations.push('Consider splitting large transactions');
    if (accountAgeDays < 30)
      recommendations.push('Build account history with smaller transactions');

    return {
      score,
      level,
      factors,
      recommendations,
    };
  }

  private static compareFingerprints(
    fp1: DeviceFingerprint,
    fp2: DeviceFingerprint
  ): number {
    let matches = 0;
    let total = 0;

    if (fp1.userAgent === fp2.userAgent) matches++;
    total++;

    if (fp1.screenResolution === fp2.screenResolution) matches++;
    total++;

    if (fp1.language === fp2.language) matches++;
    total++;

    if (fp1.timezone === fp2.timezone) matches++;
    total++;

    return (matches / total) * 100;
  }

  static getAction(score: number): 'allow' | 'review' | 'block' {
    if (score >= 70) return 'block';
    if (score >= 40) return 'review';
    return 'allow';
  }
}
