// domains/fraud/riskRules.ts
import { DeviceFingerprint } from '@/modules/FraudDetector/deviceFingerprint';
import { Transaction } from '@/types/transaction';

export interface RiskRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  condition: (context: RiskContext) => boolean | Promise<boolean>;
  action: 'log' | 'flag' | 'block' | 'review';
  score: number;
}

export interface RiskContext {
  userId: string;
  amount: number;
  deviceFingerprint?: DeviceFingerprint;
  ipAddress?: string;
  location?: { lat: number; lng: number };
  transactionHistory?: Transaction[];
  userAgent?: string;
  timeOfDay: number;
  dayOfWeek: number;
  // Extended fields for rule evaluation
  accountAgeDays?: number;
  recentTransactionCount?: number;
  recentTransactionTotal?: number;
  isNewDevice?: boolean;
  isIpSuspicious?: boolean;
  previousTransactionCount?: number;
  averageTransactionAmount?: number;
  velocityScore?: number;
}

export interface RiskRuleResult {
  triggeredRules: RiskRule[];
  totalScore: number;
  recommendedAction: 'allow' | 'flag' | 'review' | 'block';
  details: {
    ruleId: string;
    ruleName: string;
    score: number;
    severity: string;
  }[];
}

export const RiskRules: RiskRule[] = [
  {
    id: 'R001',
    name: 'Unusually High Amount',
    description: 'Transaction amount exceeds normal pattern',
    severity: 'high',
    condition: (ctx) => {
      // Check if amount exceeds typical transaction patterns
      if (ctx.amount > 5000) return true;
      if (ctx.averageTransactionAmount && ctx.amount > ctx.averageTransactionAmount * 3) return true;
      return false;
    },
    action: 'review',
    score: 30,
  },
  {
    id: 'R002',
    name: 'New Account Large Transaction',
    description: 'New account making large transaction',
    severity: 'high',
    condition: (ctx) => {
      // Account less than 7 days old AND transaction > R1000
      const isNewAccount = ctx.accountAgeDays !== undefined && ctx.accountAgeDays < 7;
      const isLargeAmount = ctx.amount > 1000;
      return isNewAccount && isLargeAmount;
    },
    action: 'block',
    score: 50,
  },
  {
    id: 'R003',
    name: 'Suspicious Time of Day',
    description: 'Transaction at unusual hour (12 AM - 5 AM)',
    severity: 'medium',
    condition: (ctx) => ctx.timeOfDay < 5 || ctx.timeOfDay > 23,
    action: 'flag',
    score: 15,
  },
  {
    id: 'R004',
    name: 'Rapid Consecutive Transactions',
    description: 'Multiple transactions in short period',
    severity: 'medium',
    condition: (ctx) => {
      // More than 3 transactions in the last hour
      return (ctx.recentTransactionCount || 0) >= 3;
    },
    action: 'review',
    score: 25,
  },
  {
    id: 'R005',
    name: 'Device Mismatch',
    description: 'Transaction from unrecognized device',
    severity: 'medium',
    condition: (ctx) => ctx.isNewDevice === true,
    action: 'flag',
    score: 20,
  },
  {
    id: 'R006',
    name: 'Location Anomaly',
    description: 'Transaction from unusual location',
    severity: 'high',
    condition: (ctx) => {
      // Would check location history - placeholder for now
      // In production, compare with user's typical locations
      return false;
    },
    action: 'review',
    score: 35,
  },
  {
    id: 'R007',
    name: 'IP Reputation',
    description: 'Transaction from suspicious IP',
    severity: 'high',
    condition: (ctx) => ctx.isIpSuspicious === true,
    action: 'block',
    score: 60,
  },
  {
    id: 'R008',
    name: 'High Velocity Spending',
    description: 'Spending rate exceeds normal pattern',
    severity: 'high',
    condition: (ctx) => {
      // More than R2000 in last hour or velocity score > 70
      const highVelocity = (ctx.recentTransactionTotal || 0) > 2000;
      const highVelocityScore = (ctx.velocityScore || 0) > 70;
      return highVelocity || highVelocityScore;
    },
    action: 'review',
    score: 40,
  },
  {
    id: 'R009',
    name: 'Round Number Amount',
    description: 'Transaction amount is a suspicious round number',
    severity: 'low',
    condition: (ctx) => {
      // Amounts like R1000, R2000, R5000
      return ctx.amount % 1000 === 0 && ctx.amount >= 1000;
    },
    action: 'flag',
    score: 10,
  },
  {
    id: 'R010',
    name: 'Multiple Failed Attempts',
    description: 'Multiple failed transaction attempts',
    severity: 'medium',
    condition: (ctx) => {
      // Would check failed transaction count
      return false;
    },
    action: 'review',
    score: 30,
  },
];

export class RiskRulesEngine {
  /**
   * Evaluate all risk rules against the given context
   */
  static async evaluate(context: RiskContext): Promise<RiskRuleResult> {
    const triggeredRules: RiskRule[] = [];
    let totalScore = 0;
    const details: RiskRuleResult['details'] = [];

    for (const rule of RiskRules) {
      try {
        let triggered = false;
        
        // Handle both synchronous and asynchronous conditions
        const conditionResult = rule.condition(context);
        if (conditionResult instanceof Promise) {
          triggered = await conditionResult;
        } else {
          triggered = conditionResult;
        }
        
        if (triggered) {
          triggeredRules.push(rule);
          totalScore += rule.score;
          details.push({
            ruleId: rule.id,
            ruleName: rule.name,
            score: rule.score,
            severity: rule.severity,
          });
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }

    const recommendedAction = this.getActionFromScore(totalScore);

    return {
      triggeredRules,
      totalScore,
      recommendedAction,
      details,
    };
  }

  /**
   * Get action based on total risk score
   */
  static getActionFromScore(score: number): 'allow' | 'flag' | 'review' | 'block' {
    if (score >= 70) return 'block';
    if (score >= 40) return 'review';
    if (score >= 20) return 'flag';
    return 'allow';
  }

  /**
   * Calculate velocity score based on recent transaction frequency and amounts
   */
  static calculateVelocityScore(
    recentTransactions: Transaction[],
    timeWindowMinutes: number = 60
  ): number {
    if (!recentTransactions || recentTransactions.length === 0) return 0;
    
    const now = Date.now();
    const windowStart = now - (timeWindowMinutes * 60 * 1000);
    const recentInWindow = recentTransactions.filter(
      tx => new Date(tx.createdAt).getTime() >= windowStart
    );
    
    const count = recentInWindow.length;
    const totalAmount = recentInWindow.reduce((sum, tx) => sum + tx.amount, 0);
    
    // Score based on count (max 50 points)
    let countScore = Math.min(count * 10, 50);
    
    // Score based on amount (max 50 points, R1000 = 10 points)
    let amountScore = Math.min(totalAmount / 100, 50);
    
    return countScore + amountScore;
  }

  /**
   * Check if a device is new (not previously seen)
   */
  static isNewDevice(
    currentFingerprint: DeviceFingerprint,
    previousFingerprints: DeviceFingerprint[]
  ): boolean {
    if (!previousFingerprints || previousFingerprints.length === 0) return true;
    
    // Compare current fingerprint with previous ones
    for (const prev of previousFingerprints) {
      const isMatch = 
        prev.userAgent === currentFingerprint.userAgent &&
        prev.screenResolution === currentFingerprint.screenResolution &&
        prev.language === currentFingerprint.language;
      
      if (isMatch) return false;
    }
    
    return true;
  }

  /**
   * Check if IP is suspicious (e.g., known proxy, VPN, or blacklisted)
   */
  static async checkIpReputation(ipAddress: string): Promise<boolean> {
    // In production, integrate with IP reputation service like:
    // - ipapi.co
    // - ipinfo.io
    // - AbuseIPDB
    // - MaxMind
    
    // Placeholder - return false for now
    // In production, make an API call to check IP reputation
    return false;
  }

  /**
   * Build complete risk context from user data and transaction
   */
  static async buildContext(
    userId: string,
    amount: number,
    deviceFingerprint: DeviceFingerprint,
    ipAddress: string,
    transactionHistory: Transaction[],
    accountAgeDays: number,
    userAgent: string
  ): Promise<RiskContext> {
    const now = new Date();
    const timeOfDay = now.getHours();
    const dayOfWeek = now.getDay();
    
    // Calculate recent transaction metrics
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentTransactions = transactionHistory.filter(
      tx => new Date(tx.createdAt) >= oneHourAgo
    );
    
    const recentTransactionCount = recentTransactions.length;
    const recentTransactionTotal = recentTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0
    );
    
    // Calculate velocity score
    const velocityScore = this.calculateVelocityScore(transactionHistory);
    
    // Calculate average transaction amount
    const totalAmount = transactionHistory.reduce((sum, tx) => sum + tx.amount, 0);
    const averageTransactionAmount = transactionHistory.length > 0 
      ? totalAmount / transactionHistory.length 
      : 0;
    
    // Determine if device is new (would require historical fingerprints)
    const isNewDevice = true; // Placeholder - implement with actual device history
    
    // Check IP reputation
    const isIpSuspicious = await this.checkIpReputation(ipAddress);
    
    return {
      userId,
      amount,
      deviceFingerprint,
      ipAddress,
      userAgent,
      timeOfDay,
      dayOfWeek,
      accountAgeDays,
      recentTransactionCount,
      recentTransactionTotal,
      isNewDevice,
      isIpSuspicious,
      averageTransactionAmount,
      velocityScore,
      transactionHistory,
    };
  }
}