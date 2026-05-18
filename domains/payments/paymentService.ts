// domains/payments/paymentService.ts - Production version with Supabase
import { supabase } from '@/services/supabase/client';
import { Order, PaymentIntent, Transaction, Instalment } from '@/types/transaction';
import { User } from '@/types/user';
import { AppError, NotFoundError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { InstallmentCalculator } from '@/modules/InstallmentCalculator/calculatePlan';
import { PaymentProcessor } from '@/modules/PaymentProcessor/processPayment';
import { MerchantService } from '@/domains/merchants/merchantService';
import { CreditService } from '@/domains/credit/creditService';
import { RepaymentService } from '@/domains/repayments/repaymentService';
import { v4 as uuidv4 } from 'uuid';

export class PaymentService {
  static async createOrder(
    userId: string,
    merchantId: string,
    amount: number
  ): Promise<Order> {
    // Validate amount
    if (amount < 10) {
      throw new ValidationError('Minimum order amount is R10');
    }
    if (amount > 5000) {
      throw new ValidationError('Maximum order amount is R5000');
    }

    const merchant = await MerchantService.getMerchantById(merchantId);
    if (!merchant) {
      throw new NotFoundError(`Merchant ${merchantId}`);
    }

    // Check user's available credit
    const creditSummary = await CreditService.getCreditSummary(userId);
    if (creditSummary.availableCredit < amount) {
      throw new ValidationError(
        `Insufficient credit. Available: R${creditSummary.availableCredit}`
      );
    }

    // Calculate installment plan
    const plan = InstallmentCalculator.calculatePlan(amount);

    const orderId = uuidv4();
    
    // Create order in database
    const { data: order, error } = await supabase
      .from('transactions')
      .insert({
        id: orderId,
        user_id: userId,
        merchant_id: merchantId,
        amount,
        fee: plan.serviceFee,
        total: plan.totalAmount,
        status: 'pending',
        type: 'purchase',
        payment_method: 'qr',
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create order:', error);
      throw new AppError('Failed to create order', 'ORDER_CREATE_ERROR', 500);
    }

    // Create installment plan
    const { data: installmentPlan, error: planError } = await supabase
      .from('installment_plans')
      .insert({
        transaction_id: orderId,
        number_of_installments: 3,
        installment_amount: plan.instalments[0].amount,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })
      .select()
      .single();

    if (planError) {
      logger.error('Failed to create installment plan:', planError);
    }

    // Create repayments
    for (const inst of plan.instalments) {
      await supabase.from('repayments').insert({
        installment_plan_id: installmentPlan?.id,
        due_date: inst.dueDate.toISOString().split('T')[0],
        amount_due: inst.amount,
        status: 'pending',
      });
    }

    // Update available credit
    await CreditService.updateAvailableCredit(userId, amount);

    logger.info(`Order created: ${orderId} for user ${userId}`, { amount, merchantId });

    return {
      id: orderId,
      userId,
      merchantId,
      merchantName: merchant.name,
      amount,
      serviceFee: plan.serviceFee,
      totalAmount: plan.totalAmount,
      status: 'pending',
      instalments: plan.instalments.map(inst => ({
        id: uuidv4(),
        orderId,
        amount: inst.amount,
        dueDate: inst.dueDate,
        paidAt: null,
        status: 'pending',
        lateFee: 0,
        paymentId: null,
        reminderSent: false,
        reminderCount: 0,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
      paidAt: null,
      paymentMethod: 'qr',
    };
  }

  static async getOrder(orderId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, merchants(name)')
      .eq('id', orderId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      merchantId: data.merchant_id,
      merchantName: data.merchants?.name,
      amount: data.amount,
      serviceFee: data.fee,
      totalAmount: data.total,
      status: data.status,
      instalments: [], // Would fetch from installment_plans and repayments
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      paidAt: data.completed_at ? new Date(data.completed_at) : null,
      paymentMethod: data.payment_method,
    };
  }

  static async getUserOrders(userId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, merchants(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];

    return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      merchantId: item.merchant_id,
      merchantName: item.merchants?.name,
      amount: item.amount,
      serviceFee: item.fee,
      totalAmount: item.total,
      status: item.status,
      instalments: [],
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      paidAt: item.completed_at ? new Date(item.completed_at) : null,
      paymentMethod: item.payment_method,
    }));
  }

  static async confirmPayment(orderId: string): Promise<Transaction> {
    // Get order
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new NotFoundError(`Order ${orderId}`);
    }

    if (order.status !== 'pending') {
      throw new ValidationError(`Order cannot be paid. Status: ${order.status}`);
    }

    // Process payment (integrate with Paystack/Ozow/Peach)
    const paymentResult = await PaymentProcessor.processPayment({
      orderId: order.id,
      amount: order.totalAmount,
      paymentMethod: 'debit_order',
      customerId: order.userId,
      merchantId: order.merchantId,
    });

    if (!paymentResult.success) {
      throw new AppError(paymentResult.message || 'Payment failed', 'PAYMENT_FAILED', 400);
    }

    // Update order status
    await supabase
      .from('transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // Create transaction record
    const transactionId = paymentResult.transactionId || uuidv4();
    const transaction: Transaction = {
      id: transactionId,
      userId: order.userId,
      orderId: order.id,
      type: 'purchase',
      amount: order.amount,
      fee: order.serviceFee,
      total: order.totalAmount,
      status: 'completed',
      reference: `txn_${Date.now()}`,
      metadata: { merchantId: order.merchantId },
      createdAt: new Date(),
      completedAt: new Date(),
    };

    logger.info(`Payment confirmed for order ${order.id}`, { transactionId });

    return transaction;
  }
}