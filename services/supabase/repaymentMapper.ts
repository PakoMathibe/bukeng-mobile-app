// services/supabase/repaymentMapper.ts
import { RepaymentInstalment, InstallmentPlan } from '@/types/repayment';

/**
 * Calculates late fee based on due date and payment status
 */
function calculateLateFee(dueDate: Date, paidAt: Date | null): number {
  if (!paidAt) {
    const now = new Date();
    if (now > dueDate) {
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const periodsLate = Math.floor(daysOverdue / 30);
      return Math.min(periodsLate * 35, 100);
    }
    return 0;
  }
  
  if (paidAt > dueDate) {
    const daysLate = Math.floor((paidAt.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const periodsLate = Math.floor(daysLate / 30);
    return Math.min(periodsLate * 35, 100);
  }
  
  return 0;
}

/**
 * Converts database repayment record (snake_case) to frontend RepaymentInstalment type (camelCase)
 */
export function mapToRepaymentInstalment(dbRepayment: any, installmentPlanId?: string): RepaymentInstalment {
  const dueDate = new Date(dbRepayment.due_date);
  const paidAt = dbRepayment.paid_at ? new Date(dbRepayment.paid_at) : null;
  
  return {
    id: dbRepayment.id,
    installmentPlanId: installmentPlanId ?? dbRepayment.installment_plan_id,
    amountDue: dbRepayment.amount_due,
    amountPaid: dbRepayment.amount_paid ?? 0,
    dueDate: dueDate,
    paidAt: paidAt,
    status: dbRepayment.status ?? 'pending',
    lateFee: calculateLateFee(dueDate, paidAt),
  };
}

/**
 * Converts frontend RepaymentInstalment to database repayment record (snake_case) for insert/update
 */
export function mapToRepaymentRecord(instalment: Partial<RepaymentInstalment>): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  if (instalment.id !== undefined) record.id = instalment.id;
  if (instalment.installmentPlanId !== undefined) record.installment_plan_id = instalment.installmentPlanId;
  if (instalment.amountDue !== undefined) record.amount_due = instalment.amountDue;
  if (instalment.amountPaid !== undefined) record.amount_paid = instalment.amountPaid;
  if (instalment.dueDate !== undefined) record.due_date = instalment.dueDate.toISOString().split('T')[0];
  if (instalment.paidAt !== undefined) record.paid_at = instalment.paidAt?.toISOString();
  if (instalment.status !== undefined) record.status = instalment.status;

  return record;
}

/**
 * Converts database installment_plans record (snake_case) to frontend InstallmentPlan type (camelCase)
 */
export function mapToInstallmentPlan(dbRecord: any): InstallmentPlan {
  return {
    id: dbRecord.id,
    transactionId: dbRecord.transaction_id,
    numberOfInstallments: dbRecord.number_of_installments,
    installmentAmount: dbRecord.installment_amount,
    startDate: new Date(dbRecord.start_date),
    endDate: new Date(dbRecord.end_date),
    status: dbRecord.status ?? 'active',
    createdAt: new Date(dbRecord.created_at || dbRecord.created_at),
    updatedAt: new Date(dbRecord.updated_at || dbRecord.created_at),
  };
}

/**
 * Converts frontend InstallmentPlan to database installment_plans record (snake_case) for insert
 */
export function mapToInstallmentPlanRecord(plan: Partial<InstallmentPlan>): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  if (plan.id !== undefined) record.id = plan.id;
  if (plan.transactionId !== undefined) record.transaction_id = plan.transactionId;
  if (plan.numberOfInstallments !== undefined) record.number_of_installments = plan.numberOfInstallments;
  if (plan.installmentAmount !== undefined) record.installment_amount = plan.installmentAmount;
  if (plan.startDate !== undefined) record.start_date = plan.startDate.toISOString().split('T')[0];
  if (plan.endDate !== undefined) record.end_date = plan.endDate.toISOString().split('T')[0];
  if (plan.status !== undefined) record.status = plan.status;

  return record;
}

/**
 * Converts database records to frontend RepaymentInstalment list
 * @param repayments - Array of repayment records
 * @param planMap - Optional map of installment_plan_id to plan (for batch processing)
 */
export function mapToRepaymentInstalmentList(
  repayments: any[], 
  planMap?: Map<string, any>
): RepaymentInstalment[] {
  return repayments.map(r => {
    const planId = planMap?.get(r.installment_plan_id)?.id ?? r.installment_plan_id;
    return mapToRepaymentInstalment(r, planId);
  }).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

/**
 * Converts database records to frontend InstallmentPlan list
 */
export function mapToInstallmentPlanList(dbRecords: any[]): InstallmentPlan[] {
  return dbRecords.map(mapToInstallmentPlan);
}