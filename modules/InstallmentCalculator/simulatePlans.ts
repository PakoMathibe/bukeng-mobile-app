// modules/InstallmentCalculator/simulatePlans.ts
import { InstallmentCalculator, InstallmentPlan } from './calculatePlan';

export interface PlanSimulation {
  amount: number;
  plan: InstallmentPlan;
  monthlyPayment: number;
  totalCost: number;
  apr: number;
  savingsVsCreditCard?: number;
}

export class PlanSimulator {
  private static readonly CREDIT_CARD_INTEREST_RATE = 0.2; // 20% APR

  static simulateForAmount(amount: number): PlanSimulation {
    const plan = InstallmentCalculator.calculatePlan(amount);
    const monthlyPayment = plan.instalments[0].amount;
    const totalCost = plan.totalAmount;
    const apr = InstallmentCalculator.calculateAPR(
      plan.principal,
      plan.serviceFee,
      60
    );

    // Calculate savings vs credit card
    const creditCardInterest =
      amount * this.CREDIT_CARD_INTEREST_RATE * (60 / 365);
    const savingsVsCreditCard = creditCardInterest - plan.serviceFee;

    return {
      amount,
      plan,
      monthlyPayment,
      totalCost,
      apr,
      savingsVsCreditCard: savingsVsCreditCard > 0 ? savingsVsCreditCard : 0,
    };
  }

  static simulateRange(
    minAmount: number,
    maxAmount: number,
    step: number = 100
  ): PlanSimulation[] {
    const simulations: PlanSimulation[] = [];
    for (let amount = minAmount; amount <= maxAmount; amount += step) {
      simulations.push(this.simulateForAmount(amount));
    }
    return simulations;
  }

  static findOptimalAmount(desiredMonthly: number): PlanSimulation | null {
    const amounts = [
      250, 500, 750, 1000, 1250, 1500, 2000, 2500, 3000, 4000, 5000,
    ];

    for (const amount of amounts) {
      const sim = this.simulateForAmount(amount);
      if (sim.monthlyPayment <= desiredMonthly) {
        return sim;
      }
    }

    return null;
  }
}
