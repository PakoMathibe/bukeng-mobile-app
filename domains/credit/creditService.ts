// domains/credit/creditService.ts
import { supabase } from '@/services/supabase/client';
import { mapToCreditProfile, mapToCreditProfileRecord } from '@/services/supabase/creditMapper';
import { CreditProfile, CreditSummary, CreditHistory } from '@/types/credit';
import { User } from '@/types/user';

export class CreditService {

  // domains/credit/creditService.ts - Add this method
static async getDashboardData(userId: string): Promise<{
  tier: number;
  tierName: string;
  totalLimit: number;
  availableCredit: number;
  usedCredit: number;
  utilization: number;
  onTimePayments: number;
  nextUpgradeRequirement: string;
  showBankUploadPrompt: boolean;
  showPaymentPrompt: boolean;
  paymentsNeededForUpgrade: number;
}> {
  const profile = await this.getOrCreateCreditProfile(userId);
  const user = await AuthService.getUserById(userId);
  
  const totalLimit = profile.creditLimit;
  const availableCredit = profile.availableCredit;
  const usedCredit = profile.usedCredit;
  const utilization = totalLimit > 0 ? (usedCredit / totalLimit) * 100 : 0;
  const onTimePayments = profile.onTimePayments;
  
  const tier = user?.tier || 0;
  const tierConfig = TIER_CONFIGS[tier as UserTier];
  
  let showBankUploadPrompt = false;
  let showPaymentPrompt = false;
  let paymentsNeededForUpgrade = 0;
  let nextUpgradeRequirement = '';
  
  if (tier === 1) {
    showBankUploadPrompt = true;
    nextUpgradeRequirement = 'Upload bank statement to reach Trusted tier';
  } else if (tier === 2) {
    paymentsNeededForUpgrade = Math.max(0, 6 - onTimePayments);
    showPaymentPrompt = paymentsNeededForUpgrade > 0;
    nextUpgradeRequirement = `${paymentsNeededForUpgrade} more on-time payments to reach Premium`;
  }
  
  return {
    tier,
    tierName: tierConfig?.name || 'Explorer',
    totalLimit,
    availableCredit,
    usedCredit,
    utilization,
    onTimePayments,
    nextUpgradeRequirement,
    showBankUploadPrompt,
    showPaymentPrompt,
    paymentsNeededForUpgrade,
  };
}
  /**
   * Get credit profile for a user
   */
  static async getCreditProfile(userId: string): Promise<CreditProfile | null> {
    const { data, error } = await supabase
      .from('credit_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch credit profile:', error);
      throw new Error('Failed to fetch credit profile');
    }

    if (data) {
      return mapToCreditProfile(data);
    }

    return null;
  }

  /**
   * Create or get default credit profile for a user
   */
  static async getOrCreateCreditProfile(userId: string): Promise<CreditProfile> {
    const existing = await this.getCreditProfile(userId);
    if (existing) return existing;

    return this.createDefaultCreditProfile(userId);
  }

  /**
   * Create default credit profile for a new user
   */
  static async createDefaultCreditProfile(userId: string): Promise<CreditProfile> {
    const defaultProfile = {
      user_id: userId,
      credit_score: 500,
      credit_limit: 500,
      available_credit: 500,
      used_credit: 0,
      risk_level: 'medium',
      on_time_payments: 0,
      late_payments: 0,
    };

    const { data, error } = await supabase
      .from('credit_profiles')
      .insert(defaultProfile)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Failed to create credit profile:', error);
      throw new Error('Failed to create credit profile');
    }

    return mapToCreditProfile(data);
  }

  /**
   * Update credit profile after a transaction
   */
  static async updateCreditAfterTransaction(
    userId: string,
    amount: number,
    isPurchase: boolean
  ): Promise<CreditProfile> {
    const profile = await this.getOrCreateCreditProfile(userId);

    const updatedProfile = {
      ...profile,
      availableCredit: isPurchase
        ? profile.availableCredit - amount
        : profile.availableCredit + amount,
      usedCredit: isPurchase
        ? profile.usedCredit + amount
        : profile.usedCredit - amount,
      updatedAt: new Date(),
    };

    const dbRecord = mapToCreditProfileRecord(updatedProfile);
    delete dbRecord.id;
    delete dbRecord.created_at;

    const { data, error } = await supabase
      .from('credit_profiles')
      .update(dbRecord)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Failed to update credit profile:', error);
      throw new Error('Failed to update credit profile');
    }

    return mapToCreditProfile(data);
  }

  /**
   * Update credit score based on payment history
   */
  static async updateCreditScore(userId: string): Promise<number> {
    const profile = await this.getOrCreateCreditProfile(userId);

    // Fetch user's repayment history
    const { data: repayments, error: repaymentsError } = await supabase
      .from('repayments')
      .select('status, amount_paid, amount_due, due_date')
      .eq('installment_plan_id', 'user_id');

    if (repaymentsError) {
      console.error('Failed to fetch repayments:', repaymentsError);
      return profile.creditScore;
    }

    // Calculate on-time payment rate
    const totalRepayments = repayments?.length || 0;
    const onTimeRepayments = repayments?.filter(r => r.status === 'paid').length || 0;
    const onTimeRate = totalRepayments > 0 ? onTimeRepayments / totalRepayments : 1;

    // Calculate new credit score (base 500, max 850)
    let newScore = 500;
    newScore += Math.min(onTimeRate * 200, 200);
    
    // Penalty for late payments
    const lateCount = repayments?.filter(r => r.status === 'late').length || 0;
    newScore -= Math.min(lateCount * 25, 150);

    // Ensure score stays within bounds
    newScore = Math.min(Math.max(newScore, 300), 850);

    const { error } = await supabase
      .from('credit_profiles')
      .update({ credit_score: Math.round(newScore) })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to update credit score:', error);
      return profile.creditScore;
    }

    return Math.round(newScore);
  }

  /**
   * Check if user can afford a transaction
   */
  static async checkAffordability(
    userId: string,
    amount: number
  ): Promise<{
    affordable: boolean;
    maxAmount: number;
    reason?: string;
  }> {
    const profile = await this.getOrCreateCreditProfile(userId);

    if (!profile) {
      return {
        affordable: false,
        maxAmount: 0,
        reason: 'Credit profile not found',
      };
    }

    if (amount > profile.availableCredit) {
      return {
        affordable: false,
        maxAmount: profile.availableCredit,
        reason: `Insufficient credit. Available: R${profile.availableCredit}`,
      };
    }

    // Lower credit score limits high-value transactions
    if (profile.creditScore < 600 && amount > 1000) {
      return {
        affordable: false,
        maxAmount: 1000,
        reason: 'Lower credit score limits transaction amount to R1,000',
      };
    }

    if (profile.creditScore < 550 && amount > 500) {
      return {
        affordable: false,
        maxAmount: 500,
        reason: 'Credit score too low. Make on-time payments to increase limit.',
      };
    }

    return {
      affordable: true,
      maxAmount: profile.availableCredit,
    };
  }

  /**
   * Check if user is eligible for credit limit increase
   */
  static async checkLimitIncreaseEligibility(userId: string): Promise<{
    eligible: boolean;
    currentLimit: number;
    suggestedNewLimit: number;
    reason?: string;
    requiredPaymentsRemaining?: number;
  }> {
    const profile = await this.getOrCreateCreditProfile(userId);

    const requiredPayments = 3;
    const paymentsMade = profile.onTimePayments;
    
    if (paymentsMade < requiredPayments) {
      return {
        eligible: false,
        currentLimit: profile.creditLimit,
        suggestedNewLimit: profile.creditLimit,
        reason: `Need ${requiredPayments - paymentsMade} more on-time payment(s)`,
        requiredPaymentsRemaining: requiredPayments - paymentsMade,
      };
    }

    if (profile.creditScore < 600) {
      return {
        eligible: false,
        currentLimit: profile.creditLimit,
        suggestedNewLimit: profile.creditLimit,
        reason: 'Credit score too low for limit increase',
        requiredPaymentsRemaining: 0,
      };
    }

    let increaseAmount = 250;
    if (profile.creditScore >= 700) increaseAmount = 500;
    else if (profile.creditScore >= 650) increaseAmount = 350;

    const newLimit = Math.min(profile.creditLimit + increaseAmount, 5000);

    return {
      eligible: true,
      currentLimit: profile.creditLimit,
      suggestedNewLimit: newLimit,
    };
  }

  /**
   * Apply credit limit increase
   */
  static async applyLimitIncrease(userId: string): Promise<CreditProfile> {
    const eligibility = await this.checkLimitIncreaseEligibility(userId);

    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || 'Not eligible for limit increase');
    }

    const profile = await this.getOrCreateCreditProfile(userId);
    const newLimit = eligibility.suggestedNewLimit;
    const increaseAmount = newLimit - profile.creditLimit;

    const updatedProfile = {
      ...profile,
      creditLimit: newLimit,
      availableCredit: profile.availableCredit + increaseAmount,
      usedCredit: profile.usedCredit,
      onTimePayments: 0,
      updatedAt: new Date(),
    };

    const dbRecord = mapToCreditProfileRecord(updatedProfile);
    delete dbRecord.id;

    const { data, error } = await supabase
      .from('credit_profiles')
      .update(dbRecord)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Failed to apply limit increase:', error);
      throw new Error('Failed to apply limit increase');
    }

    return mapToCreditProfile(data);
  }

  /**
   * Get credit summary for a user (for UserTierManager)
   */
  static async getCreditSummary(userId: string): Promise<CreditSummary> {
    const profile = await this.getOrCreateCreditProfile(userId);
    
    const usedCredit = profile.usedCredit || 0;
    const totalLimit = profile.creditLimit || 0;
    const utilizationPercentage = totalLimit > 0 ? (usedCredit / totalLimit) * 100 : 0;
    
    let creditRating: 'poor' | 'fair' | 'good' | 'excellent' = 'fair';
    if (profile.creditScore >= 750) creditRating = 'excellent';
    else if (profile.creditScore >= 650) creditRating = 'good';
    else if (profile.creditScore >= 550) creditRating = 'fair';
    else creditRating = 'poor';
    
    let tier = 0;
    if (totalLimit >= 5000) tier = 3;
    else if (totalLimit >= 1500) tier = 2;
    else if (totalLimit >= 500) tier = 1;
    
    return {
      userId,
      totalLimit,
      availableCredit: profile.availableCredit,
      usedCredit,
      utilizationPercentage,
      currentBalance: usedCredit,
      overdueAmount: 0,
      nextPaymentDate: null,
      nextPaymentAmount: 0,
      creditScore: profile.creditScore,
      creditRating,
      tier,
      limitIncreaseEligible: profile.onTimePayments >= 3,
      nextIncreaseAmount: 250,
      nextIncreaseRequirement: {
        type: 'payments',
        current: profile.onTimePayments,
        required: 3,
      },
      lastUpdated: new Date(profile.updatedAt),
    };
  }

  /**
   * Get credit history for a user (for UserTierManager)
   */
  static async getCreditHistory(userId: string): Promise<CreditHistory> {
    const profile = await this.getOrCreateCreditProfile(userId);
    
    return {
      userId,
      totalBorrowed: profile.usedCredit,
      totalRepaid: 0,
      onTimePayments: profile.onTimePayments,
      latePayments: profile.latePayments,
      defaults: 0,
      averageBalance: profile.usedCredit,
      peakBalance: profile.usedCredit,
      lowestBalance: 0,
      averageUtilization: 0,
      longestStreak: profile.onTimePayments,
      currentStreak: profile.onTimePayments,
      history: [],
    };
  }

  /**
   * Initialize credit for a user (for UserTierManager)
   */
  static async initializeCredit(user: User): Promise<void> {
    const existing = await this.getCreditProfile(user.id);
    if (!existing) {
      await this.createDefaultCreditProfile(user.id);
    }
  }

  /**
   * Update available credit after purchase
   */
  static async updateAvailableCredit(userId: string, amount: number): Promise<boolean> {
    try {
      const profile = await this.getOrCreateCreditProfile(userId);
      
      const newAvailable = Math.max(0, profile.availableCredit - amount);
      const newUsed = profile.usedCredit + amount;

      const { error } = await supabase
        .from('credit_profiles')
        .update({
          available_credit: newAvailable,
          used_credit: newUsed,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to update available credit:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Update available credit error:', error);
      return false;
    }
  }

  /**
   * Update after payment (increment on-time payment count)
   */
  static async updateAfterPayment(
    userId: string,
    amount: number,
    onTime: boolean
  ): Promise<boolean> {
    try {
      const profile = await this.getOrCreateCreditProfile(userId);
      
      const updates: any = {
        available_credit: profile.availableCredit + amount,
        used_credit: Math.max(0, profile.usedCredit - amount),
        updated_at: new Date().toISOString(),
      };

      if (onTime) {
        updates.on_time_payments = profile.onTimePayments + 1;
      } else {
        updates.late_payments = profile.latePayments + 1;
      }

      const { error } = await supabase
        .from('credit_profiles')
        .update(updates)
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to update after payment:', error);
        return false;
      }

      // Also update credit score
      await this.updateCreditScore(userId);
      
      return true;
    } catch (error) {
      console.error('Update after payment error:', error);
      return false;
    }
  }
}