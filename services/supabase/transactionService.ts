// services/supabase/transactionService.ts
import { supabase } from './client';
import { mapToTransaction, mapToTransactionRecord, mapToInstalmentList } from './transactionMapper';
import { Transaction, Instalment } from '@/types/transaction';

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapToTransaction(data);
}

export async function getInstalmentsByTransactionId(transactionId: string): Promise<Instalment[]> {
  // Get installment plan
  const { data: plan } = await supabase
    .from('installment_plans')
    .select('*')
    .eq('transaction_id', transactionId)
    .single();

  if (!plan) return [];

  // Get repayments
  const { data: repayments } = await supabase
    .from('repayments')
    .select('*')
    .eq('installment_plan_id', plan.id);

  if (!repayments) return [];

  return mapToInstalmentList([plan], repayments);
}

export async function createTransaction(transaction: Partial<Transaction>): Promise<Transaction | null> {
  const dbRecord = mapToTransactionRecord(transaction);
  
  const { data, error } = await supabase
    .from('transactions')
    .insert(dbRecord)
    .select()
    .single();

  if (error || !data) return null;
  return mapToTransaction(data);
}