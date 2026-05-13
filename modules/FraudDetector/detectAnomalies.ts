// modules/FraudDetector/detectAnomalies.ts
import { User } from '@/types/user';
import { Transaction } from '@/types/transaction';

export interface AnomalyResult {
  isAnomaly: boolean;
  score: number;
  flags: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class FraudDetector {
  static async detectAnomalies(
    user: User,
    transaction: Partial<Transaction>
  ): Promise<AnomalyResult> {
    const flags: string[] = [];
    let score = 0;

    // Check transaction amount
    if (transaction.amount && transaction.amount > 5000) {
      flags.push('unusually_high_amount');
      score += 30;
    }

    // Check for amount round numbers
    if (
      transaction.amount &&
      transaction.amount % 100 === 0 &&
      transaction.amount > 1000
    ) {
      flags.push('round_number_amount');
      score += 10;
    }

    // Check transaction frequency (would need history)
    // Check location mismatch (would need location data)
    // Check device fingerprint mismatch

    let riskLevel: AnomalyResult['riskLevel'] = 'low';
    if (score >= 70) riskLevel = 'critical';
    else if (score >= 50) riskLevel = 'high';
    else if (score >= 30) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
      isAnomaly: score >= 30,
      score,
      flags,
      riskLevel,
    };
  }

  static async assessRisk(user: User): Promise<number> {
    let riskScore = 0;

    // Age of account
    const accountAgeDays =
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < 7) riskScore += 20;

    // Verification status
    if (!user.isVerified) riskScore += 30;

    // Credit history would be checked here

    return Math.min(riskScore, 100);
  }
}
