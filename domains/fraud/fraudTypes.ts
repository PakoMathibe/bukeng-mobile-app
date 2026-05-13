// domains/fraud/fraudTypes.ts
export interface FraudAlert {
  id: string;
  userId: string;
  type: 'transaction' | 'login' | 'profile_change' | 'payment_method';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolution: 'false_positive' | 'confirmed_fraud' | 'investigating' | null;
}

export interface FraudMetrics {
  totalAssessments: number;
  flaggedTransactions: number;
  blockedTransactions: number;
  falsePositiveRate: number;
  averageRiskScore: number;
  topRiskFlags: Array<{ flag: string; count: number }>;
}

export interface DeviceBinding {
  deviceId: string;
  userId: string;
  fingerprint: string;
  firstSeen: Date;
  lastSeen: Date;
  isTrusted: boolean;
  isActive: boolean;
}

export interface RiskThresholds {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  low: 20,
  medium: 40,
  high: 60,
  critical: 80,
};
