// services/supabase/creditMapper.ts
import { CreditProfile, CreditDecision } from '@/types/credit';

/**
 * Converts database credit_profiles record (snake_case) to frontend CreditProfile type (camelCase)
 */
export function mapToCreditProfile(dbRecord: any): CreditProfile {
  return {
    id: dbRecord.id,
    userId: dbRecord.user_id,
    creditScore: dbRecord.credit_score ?? null,
    creditLimit: dbRecord.credit_limit ?? null,
    availableCredit: dbRecord.available_credit ?? null,
    riskLevel: dbRecord.risk_level ?? null,
    updatedAt: new Date(dbRecord.updated_at),
  };
}

/**
 * Converts frontend CreditProfile type to database record (snake_case) for insert/update
 */
export function mapToCreditProfileRecord(profile: Partial<CreditProfile>): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  if (profile.id !== undefined) record.id = profile.id;
  if (profile.userId !== undefined) record.user_id = profile.userId;
  if (profile.creditScore !== undefined) record.credit_score = profile.creditScore;
  if (profile.creditLimit !== undefined) record.credit_limit = profile.creditLimit;
  if (profile.availableCredit !== undefined) record.available_credit = profile.availableCredit;
  if (profile.riskLevel !== undefined) record.risk_level = profile.riskLevel;

  return record;
}

/**
 * Converts database credit_decisions record (snake_case) to frontend CreditDecision type (camelCase)
 */
export function mapToCreditDecision(dbRecord: any): CreditDecision {
  return {
    id: dbRecord.id,
    userId: dbRecord.user_id,
    decision: dbRecord.decision as 'approved' | 'denied',
    reason: dbRecord.reason ?? null,
    scoreSnapshot: dbRecord.score_snapshot ?? {},
    createdAt: new Date(dbRecord.created_at),
  };
}

/**
 * Converts frontend CreditDecision type to database record (snake_case) for insert
 */
export function mapToCreditDecisionRecord(decision: Partial<CreditDecision>): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  if (decision.id !== undefined) record.id = decision.id;
  if (decision.userId !== undefined) record.user_id = decision.userId;
  if (decision.decision !== undefined) record.decision = decision.decision;
  if (decision.reason !== undefined) record.reason = decision.reason;
  if (decision.scoreSnapshot !== undefined) record.score_snapshot = decision.scoreSnapshot;

  return record;
}

/**
 * Batch converts multiple database records to frontend CreditProfile array
 */
export function mapToCreditProfileList(dbRecords: any[]): CreditProfile[] {
  return dbRecords.map(mapToCreditProfile);
}

/**
 * Batch converts multiple database records to frontend CreditDecision array
 */
export function mapToCreditDecisionList(dbRecords: any[]): CreditDecision[] {
  return dbRecords.map(mapToCreditDecision);
}