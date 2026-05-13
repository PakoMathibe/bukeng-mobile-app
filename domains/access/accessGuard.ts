// domains/access/accessGuard.ts
import { User, UserTier } from '@/types/user';
import { UserTierManager } from './userTier';

export interface AccessRule {
  path: string;
  requiredTier: UserTier;
  redirectTo?: string;
  exactMatch?: boolean;
}

export interface AccessCheckResult {
  granted: boolean;
  requiredTier: UserTier;
  currentTier: UserTier;
  redirectTo?: string;
  reason?: string;
}

export const routeAccessRules: AccessRule[] = [
  // Public routes - tier 0
  { path: '/', requiredTier: 0 },
  { path: '/login', requiredTier: 0 },
  { path: '/register', requiredTier: 0 },
  { path: '/how-it-works', requiredTier: 0 },

  // Explore routes - tier 0 (pre-KYC)
  { path: '/merchants', requiredTier: 0 },
  { path: '/map', requiredTier: 0 },

  // Onboarding routes - tier 0-1
  { path: '/onboarding', requiredTier: 0 },

  // Protected routes - tier 1+
  { path: '/dashboard', requiredTier: 1, redirectTo: '/onboarding/start' },
  {
    path: '/dashboard/wallet',
    requiredTier: 1,
    redirectTo: '/onboarding/start',
  },
  {
    path: '/dashboard/transactions',
    requiredTier: 1,
    redirectTo: '/onboarding/start',
  },
  {
    path: '/dashboard/repayments',
    requiredTier: 1,
    redirectTo: '/onboarding/start',
  },
  {
    path: '/dashboard/merchants',
    requiredTier: 1,
    redirectTo: '/onboarding/start',
  },
  {
    path: '/dashboard/checkout',
    requiredTier: 1,
    redirectTo: '/onboarding/start',
  },
  {
    path: '/dashboard/profile',
    requiredTier: 1,
    redirectTo: '/onboarding/start',
  },
  {
    path: '/dashboard/settings',
    requiredTier: 1,
    redirectTo: '/onboarding/start',
  },

  // Premium features - tier 2+
  {
    path: '/dashboard/premium',
    requiredTier: 2,
    redirectTo: '/dashboard/upgrade',
  },
  {
    path: '/dashboard/cashback',
    requiredTier: 3,
    redirectTo: '/dashboard/upgrade',
  },
];

export class AccessGuard {
  static checkRouteAccess(user: User | null, path: string): AccessCheckResult {
    // Find matching rule
    let matchingRule: AccessRule | undefined;

    for (const rule of routeAccessRules) {
      if (rule.exactMatch) {
        if (path === rule.path) {
          matchingRule = rule;
          break;
        }
      } else {
        if (path.startsWith(rule.path)) {
          matchingRule = rule;
          break;
        }
      }
    }

    if (!matchingRule) {
      // Default: require authentication for any route not specified
      const currentTier = UserTierManager.getCurrentTier(user);
      return {
        granted: currentTier >= 1,
        requiredTier: 1,
        currentTier,
        redirectTo: currentTier < 1 ? '/login' : undefined,
        reason: currentTier < 1 ? 'Authentication required' : undefined,
      };
    }

    const currentTier = UserTierManager.getCurrentTier(user);
    const granted = currentTier >= matchingRule.requiredTier;

    return {
      granted,
      requiredTier: matchingRule.requiredTier,
      currentTier,
      redirectTo: !granted ? matchingRule.redirectTo || '/login' : undefined,
      reason: !granted
        ? `Tier ${matchingRule.requiredTier} required. Your tier: ${currentTier}`
        : undefined,
    };
  }

  static getRedirectPath(user: User | null, requestedPath: string): string {
    const result = this.checkRouteAccess(user, requestedPath);

    if (result.granted) {
      return requestedPath;
    }

    if (result.redirectTo) {
      return result.redirectTo;
    }

    if (!user) {
      return '/login';
    }

    if (user.tier === 0) {
      return '/onboarding/start';
    }

    return '/dashboard';
  }

  static canAccessFeature(
    user: User | null,
    feature: string,
    requiredTier: UserTier
  ): boolean {
    const currentTier = UserTierManager.getCurrentTier(user);
    return currentTier >= requiredTier;
  }

  static getAvailableFeatures(user: User | null): string[] {
    const currentTier = UserTierManager.getCurrentTier(user);
    const allFeatures = [
      'browse_merchants',
      'view_map',
      'make_purchase',
      'qr_payment',
      'bank_upload',
      'premium_support',
      'cashback',
      'early_access',
    ];

    const tierRequirements: Record<string, UserTier> = {
      browse_merchants: 0,
      view_map: 0,
      make_purchase: 1,
      qr_payment: 1,
      bank_upload: 1,
      premium_support: 3,
      cashback: 3,
      early_access: 2,
    };

    return allFeatures.filter((feature) => {
      const required = tierRequirements[feature] || 1;
      return currentTier >= required;
    });
  }
}
