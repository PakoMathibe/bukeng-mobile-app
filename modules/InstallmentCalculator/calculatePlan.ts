// modules/InstallmentCalculator/calculatePlan.ts
export interface InstallmentPlan {
  totalAmount: number;
  principal: number;
  serviceFee: number;
  instalments: {
    number: number;
    amount: number;
    dueDate: Date;
    principal: number;
    fee: number;
  }[];
}

export class InstallmentCalculator {
  private static readonly INSTALMENT_COUNT = 3;
  private static readonly INSTALMENT_DAYS = [0, 30, 60];
  private static readonly SERVICE_FEE_RATE = 0.008; // 0.8%
  private static readonly LATE_FEE = 35;
  private static readonly MAX_LATE_FEE = 100;

  static calculatePlan(
    amount: number,
    startDate: Date = new Date()
  ): InstallmentPlan {
    const serviceFee = amount * this.SERVICE_FEE_RATE;
    const totalAmount = amount + serviceFee;
    const instalmentAmount = totalAmount / this.INSTALMENT_COUNT;
    const principalPerInstalment = amount / this.INSTALMENT_COUNT;
    const feePerInstalment = serviceFee / this.INSTALMENT_COUNT;

    return {
      totalAmount,
      principal: amount,
      serviceFee,
      instalments: Array.from({ length: this.INSTALMENT_COUNT }, (_, i) => {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + this.INSTALMENT_DAYS[i]);

        return {
          number: i + 1,
          amount: Number(instalmentAmount.toFixed(2)),
          dueDate,
          principal: Number(principalPerInstalment.toFixed(2)),
          fee: Number(feePerInstalment.toFixed(2)),
        };
      }),
    };
  }

  static getRemainingBalance(
    instalments: { paid: boolean; amount: number }[]
  ): number {
    return instalments
      .filter((i) => !i.paid)
      .reduce((sum, i) => sum + i.amount, 0);
  }

  static calculateLateFee(dueDate: Date, paidDate?: Date): number {
    if (!paidDate) return 0;
    if (paidDate <= dueDate) return 0;

    const daysLate = Math.floor(
      (paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const periodsLate = Math.floor(daysLate / 30);
    const fee = periodsLate * this.LATE_FEE;

    return Math.min(fee, this.MAX_LATE_FEE);
  }

  static getNextDueDate(
    instalments: { dueDate: Date; paid: boolean }[]
  ): Date | null {
    const pending = instalments.find((i) => !i.paid);
    return pending?.dueDate || null;
  }

  static calculateAPR(
    amount: number,
    serviceFee: number,
    termDays: number
  ): number {
    const totalInterest = serviceFee;
    const apr = (totalInterest / amount) * (365 / termDays) * 100;
    return Number(apr.toFixed(2));
  }
}
