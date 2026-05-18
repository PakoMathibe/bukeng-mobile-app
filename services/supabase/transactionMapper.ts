// services/supabase/transactionMapper.ts
import { 
    Transaction, 
    TransactionStatus, 
    PaymentMethodType,
    Instalment,
    InstalmentStatus 
  } from '@/types/transaction';
  
  /**
   * Converts a database transaction record (snake_case) to frontend Transaction type (camelCase)
   * 
   * @param dbRecord - The raw record from Supabase transactions table
   * @returns Frontend Transaction object
   * 
   * @example
   * const transaction = mapToTransaction(supabaseTransactionRecord);
   */
  export function mapToTransaction(dbRecord: any): Transaction {
    return {
      id: dbRecord.id,
      userId: dbRecord.user_id,
      merchantId: dbRecord.merchant_id,
      amount: dbRecord.total_amount,
      fee: dbRecord.fee ?? 0,
      total: dbRecord.total_amount + (dbRecord.fee ?? 0),
      status: dbRecord.status as TransactionStatus,
      paymentMethod: dbRecord.payment_method as PaymentMethodType,
      reference: dbRecord.reference ?? `txn_${dbRecord.id.substring(0, 8)}`,
      metadata: dbRecord.metadata ?? {},
      createdAt: new Date(dbRecord.created_at),
      completedAt: dbRecord.completed_at ? new Date(dbRecord.completed_at) : null,
    };
  }
  
  /**
   * Converts frontend Transaction type to database record (snake_case) for insert
   * 
   * @param transaction - Frontend Transaction object
   * @returns Database record ready for Supabase
   */
  export function mapToTransactionRecord(transaction: Partial<Transaction>): Record<string, unknown> {
    const record: Record<string, unknown> = {};
  
    if (transaction.id !== undefined) record.id = transaction.id;
    if (transaction.userId !== undefined) record.user_id = transaction.userId;
    if (transaction.merchantId !== undefined) record.merchant_id = transaction.merchantId;
    if (transaction.amount !== undefined) record.total_amount = transaction.amount;
    if (transaction.fee !== undefined) record.fee = transaction.fee;
    if (transaction.status !== undefined) record.status = transaction.status;
    if (transaction.paymentMethod !== undefined) record.payment_method = transaction.paymentMethod;
    if (transaction.reference !== undefined) record.reference = transaction.reference;
    if (transaction.metadata !== undefined) record.metadata = transaction.metadata;
    if (transaction.completedAt !== undefined) record.completed_at = transaction.completedAt?.toISOString();
  
    return record;
  }
  
  /**
   * Converts database installment plan + repayment records to frontend Instalment type
   * 
   * @param planRecord - Raw record from Supabase installment_plans table
   * @param repaymentRecord - Raw record from Supabase repayments table
   * @returns Frontend Instalment object
   */
  export function mapToInstalment(planRecord: any, repaymentRecord: any): Instalment {
    const dueDate = new Date(repaymentRecord.due_date);
    const paidAt = repaymentRecord.paid_at ? new Date(repaymentRecord.paid_at) : null;
    
    // Calculate late fee if overdue
    let lateFee = 0;
    if (!paidAt && dueDate < new Date()) {
      const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const periodsLate = Math.floor(daysOverdue / 30);
      lateFee = Math.min(periodsLate * 35, 100);
    }
  
    return {
      id: repaymentRecord.id,
      orderId: planRecord.transaction_id,
      installmentPlanId: planRecord.id,
      amount: repaymentRecord.amount_due,
      dueDate: dueDate,
      paidAt: paidAt,
      amountPaid: repaymentRecord.amount_paid || 0,
      status: repaymentRecord.status as InstalmentStatus,
      lateFee: lateFee,
    };
  }
  
  /**
   * Converts frontend Instalment to database repayment record
   * 
   * @param instalment - Frontend Instalment object
   * @returns Database record for repayments table
   */
  export function mapToRepaymentRecord(instalment: Partial<Instalment>): Record<string, unknown> {
    const record: Record<string, unknown> = {};
  
    if (instalment.id !== undefined) record.id = instalment.id;
    if (instalment.installmentPlanId !== undefined) record.installment_plan_id = instalment.installmentPlanId;
    if (instalment.amount !== undefined) record.amount_due = instalment.amount;
    if (instalment.amountPaid !== undefined) record.amount_paid = instalment.amountPaid;
    if (instalment.dueDate !== undefined) record.due_date = instalment.dueDate.toISOString().split('T')[0];
    if (instalment.paidAt !== undefined) record.paid_at = instalment.paidAt?.toISOString();
    if (instalment.status !== undefined) record.status = instalment.status;
  
    return record;
  }
  
  /**
   * Converts frontend Instalment to database installment plan record
   * 
   * @param instalment - Frontend Instalment object
   * @param transactionId - The parent transaction ID
   * @returns Database record for installment_plans table
   */
  export function mapToInstallmentPlanRecord(instalment: Instalment, transactionId: string): Record<string, unknown> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3); // 3 months for 3 instalments
  
    return {
      id: instalment.installmentPlanId,
      transaction_id: transactionId,
      number_of_installments: 3,
      installment_amount: instalment.amount,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    };
  }
  
  /**
   * Batch converts multiple database records to frontend Instalments
   * 
   * @param planRecords - Array of installment_plans records
   * @param repaymentRecords - Array of repayments records
   * @returns Array of frontend Instalment objects
   */
  export function mapToInstalmentList(planRecords: any[], repaymentRecords: any[]): Instalment[] {
    const repaymentMap = new Map();
    repaymentRecords.forEach(r => {
      if (!repaymentMap.has(r.installment_plan_id)) {
        repaymentMap.set(r.installment_plan_id, []);
      }
      repaymentMap.get(r.installment_plan_id).push(r);
    });
  
    const instalments: Instalment[] = [];
    for (const plan of planRecords) {
      const repayments = repaymentMap.get(plan.id) || [];
      for (const repayment of repayments) {
        instalments.push(mapToInstalment(plan, repayment));
      }
    }
  
    return instalments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }