// domains/fraud/fraudService.ts
import { User } from '@/types/user';
import { Transaction, Order } from '@/types/transaction';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { FraudDetector } from '@/modules/FraudDetector/detectAnomalies';
import { RiskScoreCalculator } from '@/modules/FraudDetector/riskScore';
import {
  DeviceFingerprinter,
  DeviceFingerprint,
} from '@/modules/FraudDetector/deviceFingerprint';

export interface FraudCheckResult {
  isFraudulent: boolean;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  recommendations: string[];
  requiresManualReview: boolean;
}

export interface TransactionRiskAssessment {
  transactionId: string;
  userId: string;
  amount: number;
  riskScore: number;
  riskLevel: string;
  flags: string[];
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected' | 'review';
}

// Mock databases
const riskAssessmentDatabase: Map<string, TransactionRiskAssessment> =
  new Map();
const blacklistedDevices: Map<
  string,
  { deviceId: string; reason: string; blacklistedAt: Date }
> = new Map();
const suspiciousIpAddresses: Map<string, { count: number; lastSeen: Date }> =
  new Map();

export class FraudService {
  static async assessTransaction(
    user: User,
    transaction: Partial<Transaction>,
    deviceFingerprint: DeviceFingerprint
  ): Promise<FraudCheckResult> {
    try {
      // Get historical fingerprint if exists
      const historicalFingerprint = await this.getUserDeviceFingerprint(
        user.id
      );

      // Calculate risk score
      const riskResult = RiskScoreCalculator.calculate(
        user,
        transaction,
        deviceFingerprint,
        historicalFingerprint
      );

      // Detect anomalies
      const anomalyResult = await FraudDetector.detectAnomalies(
        user,
        transaction
      );

      // Combine flags
      const allFlags = [
        ...new Set([
          ...riskResult.factors.map((f) => f.name),
          ...anomalyResult.flags,
        ]),
      ];

      // Determine final risk level
      const combinedScore = (riskResult.score + anomalyResult.score) / 2;
      const riskLevel = this.getRiskLevel(combinedScore);

      // Check device blacklist
      const isDeviceBlacklisted = await this.isDeviceBlacklisted(
        deviceFingerprint
      );
      if (isDeviceBlacklisted) {
        allFlags.push('BLACKLISTED_DEVICE');
      }

      // Check IP reputation (would integrate with IP intelligence service)
      const ipAddress = await this.getClientIp();
      const isIpSuspicious = await this.isIpSuspicious(ipAddress);
      if (isIpSuspicious) {
        allFlags.push('SUSPICIOUS_IP');
      }

      const requiresManualReview =
        riskLevel === 'high' || riskLevel === 'critical' || allFlags.length > 3;
      const isFraudulent =
        riskLevel === 'critical' || allFlags.includes('BLACKLISTED_DEVICE');

      const result: FraudCheckResult = {
        isFraudulent,
        riskScore: combinedScore,
        riskLevel,
        flags: allFlags,
        recommendations: this.generateRecommendations(riskLevel, allFlags),
        requiresManualReview,
      };

      // Store assessment
      if (transaction.id) {
        const assessment: TransactionRiskAssessment = {
          transactionId: transaction.id,
          userId: user.id,
          amount: transaction.amount || 0,
          riskScore: combinedScore,
          riskLevel,
          flags: allFlags,
          timestamp: new Date(),
          status: isFraudulent
            ? 'rejected'
            : requiresManualReview
            ? 'review'
            : 'approved',
        };
        riskAssessmentDatabase.set(transaction.id, assessment);
      }

      logger.info(`Fraud assessment completed for user ${user.id}`, {
        riskScore: combinedScore,
        riskLevel,
        flags: allFlags,
      });

      return result;
    } catch (error) {
      logger.error('Failed to assess transaction', error);
      // Default to safe side - require review
      return {
        isFraudulent: false,
        riskScore: 50,
        riskLevel: 'medium',
        flags: ['ASSESSMENT_ERROR'],
        recommendations: ['Manual review required due to system error'],
        requiresManualReview: true,
      };
    }
  }

  static async assessUserRisk(
    user: User
  ): Promise<{ riskScore: number; riskLevel: string; flags: string[] }> {
    try {
      let riskScore = 0;
      const flags: string[] = [];

      // Account age risk
      const accountAgeDays =
        (Date.now() - new Date(user.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);
      if (accountAgeDays < 7) {
        riskScore += 20;
        flags.push('NEW_ACCOUNT');
      } else if (accountAgeDays < 30) {
        riskScore += 10;
        flags.push('RECENT_ACCOUNT');
      }

      // Verification status
      if (!user.emailVerified) {
        riskScore += 15;
        flags.push('UNVERIFIED_EMAIL');
      }
      if (!user.phoneVerified) {
        riskScore += 15;
        flags.push('UNVERIFIED_PHONE');
      }
      if (user.kycStatus !== 'verified') {
        riskScore += 25;
        flags.push('INCOMPLETE_KYC');
      }

      // Get transaction history
      const { TransactionHistoryService } = await import(
        '@/domains/user/history/transactionHistory'
      );
      const { transactions } = await TransactionHistoryService.getTransactions(
        user.id
      );

      // Check for failed transactions
      const failedTransactions = transactions.filter(
        (tx) => tx.status === 'failed'
      );
      if (failedTransactions.length > 3) {
        riskScore += 15;
        flags.push('MULTIPLE_FAILED_TRANSACTIONS');
      }

      // Check for chargebacks (would come from payment processor)
      // This would be implemented with actual data

      const riskLevel = this.getRiskLevel(riskScore);

      return {
        riskScore,
        riskLevel,
        flags,
      };
    } catch (error) {
      logger.error('Failed to assess user risk', error);
      return {
        riskScore: 50,
        riskLevel: 'medium',
        flags: ['ASSESSMENT_ERROR'],
      };
    }
  }

  static async validateTransactionVelocity(
    userId: string,
    amount: number,
    timeWindowMinutes: number = 60
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const { TransactionHistoryService } = await import(
        '@/domains/user/history/transactionHistory'
      );
      const { transactions } = await TransactionHistoryService.getTransactions(
        userId
      );

      const now = new Date();
      const windowStart = new Date(
        now.getTime() - timeWindowMinutes * 60 * 1000
      );

      const recentTransactions = transactions.filter(
        (tx) =>
          tx.createdAt >= windowStart &&
          tx.type === 'purchase' &&
          tx.status === 'completed'
      );

      // Limit: 5 transactions per hour
      if (recentTransactions.length >= 5) {
        return {
          allowed: false,
          reason:
            'Too many transactions in a short period. Please try again later.',
        };
      }

      // Limit: R5000 per hour
      const totalAmount = recentTransactions.reduce(
        (sum, tx) => sum + tx.amount,
        0
      );
      if (totalAmount + amount > 5000) {
        return {
          allowed: false,
          reason: 'Transaction limit exceeded for this time period.',
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Failed to validate transaction velocity', error);
      return { allowed: true }; // Allow on error to avoid blocking users
    }
  }

  static async recordDeviceFingerprint(
    userId: string,
    fingerprint: DeviceFingerprint
  ): Promise<void> {
    // Guard: Only run in browser environment
    if (typeof window === 'undefined') {
      logger.debug('Skipping device fingerprint recording on server');
      return;
    }

    try {
      const key = `device_${userId}`;
      localStorage.setItem(
        key,
        JSON.stringify({
          fingerprint,
          recordedAt: new Date(),
        })
      );

      logger.info(`Device fingerprint recorded for user ${userId}`);
    } catch (error) {
      logger.error('Failed to record device fingerprint', error);
    }
  }

  static async getUserDeviceFingerprint(
    userId: string
  ): Promise<DeviceFingerprint | undefined> {
    // Guard: Only run in browser environment
    if (typeof window === 'undefined') {
      logger.debug('Skipping device fingerprint retrieval on server');
      return undefined;
    }

    try {
      const key = `device_${userId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored);
        return data.fingerprint;
      }
      return undefined;
    } catch (error) {
      logger.error('Failed to get user device fingerprint', error);
      return undefined;
    }
  }

  static async blacklistDevice(
    deviceId: string,
    reason: string
  ): Promise<void> {
    blacklistedDevices.set(deviceId, {
      deviceId,
      reason,
      blacklistedAt: new Date(),
    });
    logger.warn(`Device blacklisted: ${deviceId}`, { reason });
  }

  static async isDeviceBlacklisted(
    fingerprint: DeviceFingerprint
  ): Promise<boolean> {
    // Check if device fingerprint matches any blacklisted device
    const deviceId = this.generateDeviceId(fingerprint);
    return blacklistedDevices.has(deviceId);
  }

  static async recordSuspiciousIp(ipAddress: string): Promise<void> {
    const existing = suspiciousIpAddresses.get(ipAddress);
    if (existing) {
      suspiciousIpAddresses.set(ipAddress, {
        count: existing.count + 1,
        lastSeen: new Date(),
      });
    } else {
      suspiciousIpAddresses.set(ipAddress, {
        count: 1,
        lastSeen: new Date(),
      });
    }
  }

  static async isIpSuspicious(ipAddress: string): Promise<boolean> {
    const record = suspiciousIpAddresses.get(ipAddress);
    if (!record) return false;

    // IP is suspicious if it has more than 10 failed attempts
    return record.count > 10;
  }

  static async getClientIp(request?: Request): Promise<string> {
    // In production, get from request headers
    if (request) {
      const headers = request.headers;
      const forwarded = headers.get('x-forwarded-for');
      if (forwarded) {
        return forwarded.split(',')[0];
      }
      return headers.get('x-real-ip') || 'unknown';
    }
    return 'unknown';
  }

  static async getTransactionRiskStatus(
    transactionId: string
  ): Promise<TransactionRiskAssessment | null> {
    return riskAssessmentDatabase.get(transactionId) || null;
  }

  static async reviewTransaction(
    transactionId: string,
    approved: boolean,
    reviewerId: string
  ): Promise<void> {
    const assessment = riskAssessmentDatabase.get(transactionId);
    if (assessment) {
      assessment.status = approved ? 'approved' : 'rejected';
      riskAssessmentDatabase.set(transactionId, assessment);
      logger.info(`Transaction ${transactionId} reviewed by ${reviewerId}`, {
        approved,
      });
    }
  }

  private static generateDeviceId(fingerprint: DeviceFingerprint): string {
    const components = [
      fingerprint.userAgent,
      fingerprint.screenResolution,
      fingerprint.language,
      fingerprint.timezone,
    ];
    const hash = this.hashString(components.join('|'));
    return `device_${hash}`;
  }

  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  private static getRiskLevel(
    score: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  private static generateRecommendations(
    riskLevel: string,
    flags: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'high' || riskLevel === 'critical') {
      recommendations.push('Requires manual verification before processing');
    }

    if (flags.includes('NEW_ACCOUNT')) {
      recommendations.push(
        'Verify user identity with additional documentation'
      );
    }

    if (
      flags.includes('UNVERIFIED_EMAIL') ||
      flags.includes('UNVERIFIED_PHONE')
    ) {
      recommendations.push('Complete contact verification');
    }

    if (flags.includes('INCOMPLETE_KYC')) {
      recommendations.push(
        'Complete KYC verification before processing larger amounts'
      );
    }

    if (flags.includes('SUSPICIOUS_IP')) {
      recommendations.push('Verify transaction via alternative method');
    }

    return recommendations;
  }
}