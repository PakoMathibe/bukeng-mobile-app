// domains/access/userTier.ts
import { User, UserTier, TIER_CONFIGS } from '@/types/user';
import { CreditService } from '@/domains/credit/creditService';

export interface TierUpgradeResult {
  canUpgrade: boolean;
  currentTier: UserTier;
  nextTier: UserTier | null;
  requirements: string[];
  progress: {
    current: number;
    required: number;
    percentage: number;
  }[];
  recommendedActions: string[];
}

export class UserTierManager {
  static getCurrentTier(user: User | null): UserTier {
    if (!user) return 0;
    return user.tier;
  }

  static getTierDetails(tier: UserTier) {
    return TIER_CONFIGS[tier];
  }

  static async calculateTier(user: User): Promise<UserTier> {
    let calculatedTier: UserTier = 0;

    // Tier 0: Basic account
    if (!user.kycStatus || user.kycStatus === 'pending') {
      return 0;
    }

    // Tier 1: ID verified
    if (
      user.emailVerified &&
      user.phoneVerified &&
      user.kycStatus === 'verified'
    ) {
      calculatedTier = 1;
    }

    // Tier 2: Bank statement uploaded and 3+ payments
    const creditHistory = await CreditService.getCreditHistory(user.id);
    if (calculatedTier >= 1 && creditHistory.onTimePayments >= 3) {
      calculatedTier = 2;
    }

    // Tier 3: Premium - 6+ payments and good credit
    if (
      calculatedTier >= 2 &&
      creditHistory.onTimePayments >= 6 &&
      creditHistory.defaults === 0
    ) {
      calculatedTier = 3;
    }

    return calculatedTier;
  }

  static async checkUpgradeEligibility(user: User): Promise<TierUpgradeResult> {
    const currentTier = user.tier;
    const nextTier = (currentTier + 1) as UserTier;

    if (nextTier > 3) {
      return {
        canUpgrade: false,
        currentTier,
        nextTier: null,
        requirements: [],
        progress: [],
        recommendedActions: ['You have reached the maximum tier'],
      };
    }

    const requirements = TIER_CONFIGS[nextTier].requirements;
    const progress = [];
    const recommendedActions = [];
    let canUpgrade = true;

    // Check each requirement
    for (const req of requirements) {
      let current = 0;
      let required = 0;
      let met = false;

      if (req.includes('Phone verified')) {
        current = user.phoneVerified ? 1 : 0;
        required = 1;
        met = user.phoneVerified;
        if (!met) recommendedActions.push('Verify your phone number');
      } else if (req.includes('ID verified')) {
        current = user.kycStatus === 'verified' ? 1 : 0;
        required = 1;
        met = user.kycStatus === 'verified';
        if (!met) recommendedActions.push('Complete ID verification');
      } else if (req.includes('Selfie')) {
        current = user.kycStatus === 'verified' ? 1 : 0;
        required = 1;
        met = user.kycStatus === 'verified';
        if (!met) recommendedActions.push('Complete selfie verification');
      } else if (req.includes('Bank statement')) {
        // This would check if bank statement uploaded
        current = 0;
        required = 1;
        met = false;
        if (!met)
          recommendedActions.push(
            'Upload your bank statement for higher limits'
          );
      } else if (req.includes('payments')) {
        const history = await CreditService.getCreditHistory(user.id);
        const match = req.match(/(\d+)/);
        required = match ? parseInt(match[0]) : 3;
        current = history.onTimePayments;
        met = current >= required;
        if (!met)
          recommendedActions.push(
            `Make ${required - current} more on-time payments`
          );
      } else if (req.includes('Credit score')) {
        const summary = await CreditService.getCreditSummary(user.id);
        const match = req.match(/(\d+)/);
        required = match ? parseInt(match[0]) : 650;
        current = summary.creditScore;
        met = current >= required;
        if (!met)
          recommendedActions.push(`Improve your credit score to ${required}+`);
      } else if (req.includes('Account age')) {
        const match = req.match(/(\d+)/);
        required = match ? parseInt(match[0]) : 6;
        const ageMonths =
          (Date.now() - new Date(user.createdAt).getTime()) /
          (1000 * 60 * 60 * 24 * 30);
        current = Math.floor(ageMonths);
        met = current >= required;
        if (!met)
          recommendedActions.push(
            `Keep your account active for ${required - current} more months`
          );
      } else {
        met = true;
      }

      progress.push({
        current,
        required,
        percentage: (current / required) * 100,
      });

      if (!met) canUpgrade = false;
    }

    return {
      canUpgrade,
      currentTier,
      nextTier: canUpgrade ? nextTier : null,
      requirements,
      progress,
      recommendedActions,
    };
  }

  static async upgradeTier(user: User): Promise<UserTier | null> {
    const eligibility = await this.checkUpgradeEligibility(user);

    if (!eligibility.canUpgrade || !eligibility.nextTier) {
      return null;
    }

    const newTier = eligibility.nextTier;
    const tierConfig = TIER_CONFIGS[newTier];

    // Update user's tier
    const updatedUser = {
      ...user,
      tier: newTier,
      creditLimit: tierConfig.minCreditLimit,
      availableCredit: tierConfig.minCreditLimit,
      updatedAt: new Date(),
    };

    // Update credit summary
    await CreditService.initializeCredit(updatedUser);

    return newTier;
  }

  static canAccessFeature(user: User | null, requiredTier: UserTier): boolean {
    if (!user) return requiredTier === 0;
    return user.tier >= requiredTier;
  }
}
