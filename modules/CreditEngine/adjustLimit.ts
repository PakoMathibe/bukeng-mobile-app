// modules/CreditEngine/adjustLimit.ts
import { User } from '@/types/user';
import { CreditHistory } from '@/types/credit';

export interface LimitAdjustmentResult {
  newLimit: number;
  adjustmentAmount: number;
  reason: string;
}

export class LimitAdjustmentEngine {
  private static readonly INCREASE_AMOUNT = 250;
  private static readonly DECREASE_AMOUNT = 500;
  private static readonly REQUIRED_PAYMENTS = 3;

  static evaluateIncrease(
    user: User,
    history: CreditHistory
  ): LimitAdjustmentResult {
    const onTimePaymentCount = history.onTimePayments;
    const qualifiesForIncrease = onTimePaymentCount >= this.REQUIRED_PAYMENTS;

    if (qualifiesForIncrease && user.tier < 3) {
      const newLimit = Math.min(user.creditLimit + this.INCREASE_AMOUNT, 5000);

      return {
        newLimit,
        adjustmentAmount: this.INCREASE_AMOUNT,
        reason: `You've made ${onTimePaymentCount} on-time payments! Your limit has been increased.`,
      };
    }

    return {
      newLimit: user.creditLimit,
      adjustmentAmount: 0,
      reason: `Make ${
        this.REQUIRED_PAYMENTS - onTimePaymentCount
      } more on-time payments to increase your limit.`,
    };
  }

  static evaluateDecrease(
    user: User,
    history: CreditHistory
  ): LimitAdjustmentResult | null {
    const hasLatePayments = history.latePayments > 2;
    const hasDefaults = history.defaults > 0;

    if (hasLatePayments || hasDefaults) {
      const newLimit = Math.max(user.creditLimit - this.DECREASE_AMOUNT, 500);

      return {
        newLimit,
        adjustmentAmount: -this.DECREASE_AMOUNT,
        reason: 'Your limit has been reduced due to missed payments.',
      };
    }

    return null;
  }

  static shouldIncrease(user: User, history: CreditHistory): boolean {
    const onTimePaymentCount = history.onTimePayments;
    return onTimePaymentCount >= this.REQUIRED_PAYMENTS;
  }
}
