// domains/fraud/riskRules.ts
export interface RiskRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  condition: (context: RiskContext) => boolean;
  action: 'log' | 'flag' | 'block' | 'review';
  score: number;
}

export interface RiskContext {
  userId: string;
  amount: number;
  deviceFingerprint?: any;
  ipAddress?: string;
  location?: { lat: number; lng: number };
  transactionHistory?: any[];
  userAgent?: string;
  timeOfDay: number;
  dayOfWeek: number;
}

export const RiskRules: RiskRule[] = [
  {
    id: 'R001',
    name: 'Unusually High Amount',
    description: 'Transaction amount exceeds normal pattern',
    severity: 'high',
    condition: (ctx) => ctx.amount > 3000,
    action: 'review',
    score: 30,
  },
  {
    id: 'R002',
    name: 'New Account Large Transaction',
    description: 'New account making large transaction',
    severity: 'high',
    condition: (ctx) => {
      // Would check account age from database
      return false;
    },
    action: 'block',
    score: 50,
  },
  {
    id: 'R003',
    name: 'Suspicious Time of Day',
    description: 'Transaction at unusual hour',
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
      // Would check transaction velocity
      return false;
    },
    action: 'review',
    score: 25,
  },
  {
    id: 'R005',
    name: 'Device Mismatch',
    description: 'Transaction from unrecognized device',
    severity: 'medium',
    condition: (ctx) => !ctx.deviceFingerprint,
    action: 'flag',
    score: 20,
  },
  {
    id: 'R006',
    name: 'Location Anomaly',
    description: 'Transaction from unusual location',
    severity: 'high',
    condition: (ctx) => {
      // Would check location history
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
    condition: (ctx) => {
      // Would check IP reputation
      return false;
    },
    action: 'block',
    score: 60,
  },
];

export class RiskRulesEngine {
  static evaluate(context: RiskContext): {
    triggeredRules: RiskRule[];
    totalScore: number;
    recommendedAction: string;
  } {
    const triggeredRules: RiskRule[] = [];
    let totalScore = 0;

    for (const rule of RiskRules) {
      try {
        if (rule.condition(context)) {
          triggeredRules.push(rule);
          totalScore += rule.score;
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }

    let recommendedAction = 'allow';
    if (totalScore >= 70) recommendedAction = 'block';
    else if (totalScore >= 40) recommendedAction = 'review';
    else if (totalScore >= 20) recommendedAction = 'flag';

    return {
      triggeredRules,
      totalScore,
      recommendedAction,
    };
  }

  static getActionFromScore(
    score: number
  ): 'allow' | 'flag' | 'review' | 'block' {
    if (score >= 70) return 'block';
    if (score >= 40) return 'review';
    if (score >= 20) return 'flag';
    return 'allow';
  }
}
