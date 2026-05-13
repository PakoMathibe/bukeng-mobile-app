// modules/AccessControl/enforceAccess.ts
import { User, UserTier } from '@/types/user';

export interface AccessEnforcementResult {
  allowed: boolean;
  reason?: string;
  requiredTier?: UserTier;
  redirectTo?: string;
}

export class AccessEnforcer {
  static enforce(
    user: User | null,
    requiredTier: UserTier
  ): AccessEnforcementResult {
    if (!user && requiredTier > 0) {
      return {
        allowed: false,
        reason: 'Authentication required',
        requiredTier,
        redirectTo: '/login',
      };
    }

    if (user && user.tier < requiredTier) {
      return {
        allowed: false,
        reason: `Tier ${requiredTier} required. Your current tier: ${user.tier}`,
        requiredTier,
        redirectTo: '/dashboard/upgrade',
      };
    }

    return { allowed: true };
  }

  static enforceFeature(
    user: User | null,
    feature: string,
    requiredTier: UserTier
  ): AccessEnforcementResult {
    return this.enforce(user, requiredTier);
  }

  static canPerformAction(
    user: User | null,
    action: string,
    context?: any
  ): boolean {
    if (!user) return false;

    switch (action) {
      case 'purchase':
        return (
          user.tier >= 1 &&
          (!context?.amount || context.amount <= user.availableCredit)
        );
      case 'withdraw':
        return user.tier >= 2;
      case 'view_merchant':
        return true;
      default:
        return false;
    }
  }
}
