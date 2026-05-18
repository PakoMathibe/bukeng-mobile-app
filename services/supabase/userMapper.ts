// services/supabase/userMapper.ts
import { User, UserStatus, CreditProfile } from '@/types/user';

/**
 * Converts a database user record (snake_case) to frontend User type (camelCase)
 * 
 * @param dbRecord - The raw record from Supabase users table
 * @returns Frontend User object
 * 
 * @example
 * const user = mapToUser(supabaseUserRecord);
 */
export function mapToUser(dbRecord: any): User {
  return {
    id: dbRecord.id,
    email: dbRecord.email ?? null,
    phoneNumber: dbRecord.phone_number ?? null,
    fullName: dbRecord.full_name ?? null,
    idNumber: dbRecord.id_number ?? null,
    dateOfBirth: dbRecord.date_of_birth ?? null,
    status: (dbRecord.status as UserStatus) ?? 'active',
    createdAt: new Date(dbRecord.created_at),
    updatedAt: new Date(dbRecord.updated_at),
  };
}

/**
 * Converts frontend User type to database record (snake_case) for insert/update
 * 
 * @param user - Frontend User object
 * @returns Database record ready for Supabase
 * 
 * @example
 * const dbRecord = mapToUserRecord(user);
 * await supabase.from('users').insert(dbRecord);
 */
export function mapToUserRecord(user: Partial<User>): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  if (user.id !== undefined) record.id = user.id;
  if (user.email !== undefined) record.email = user.email;
  if (user.phoneNumber !== undefined) record.phone_number = user.phoneNumber;
  if (user.fullName !== undefined) record.full_name = user.fullName;
  if (user.idNumber !== undefined) record.id_number = user.idNumber;
  if (user.dateOfBirth !== undefined) record.date_of_birth = user.dateOfBirth;
  if (user.status !== undefined) record.status = user.status;

  return record;
}

/**
 * Converts a database credit profile record (snake_case) to frontend CreditProfile type (camelCase)
 * 
 * @param dbRecord - The raw record from Supabase credit_profiles table
 * @returns Frontend CreditProfile object
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
 * 
 * @param profile - Frontend CreditProfile object
 * @returns Database record ready for Supabase
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