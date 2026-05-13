// domains/payments/paymentService.ts
import {
  Order,
  PaymentIntent,
  Transaction,
  Instalment,
} from '@/types/transaction';
import { User } from '@/types/user';
import { AppError, NotFoundError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { InstallmentCalculator } from '@/modules/InstallmentCalculator/calculatePlan';
import { PaymentProcessor } from '@/modules/PaymentProcessor/processPayment';
import { v4 as uuidv4 } from 'uuid';

// Mock databases
const orderDatabase: Map<string, Order> = new Map();
const paymentIntentDatabase: Map<string, PaymentIntent> = new Map();
const transactionDatabase: Map<string, Transaction> = new Map();

export class PaymentService {
  static async createOrder(
    userId: string,
    merchantId: string,
    amount: number
  ): Promise<Order> {
    try {
      // Validate amount
      if (amount < 10) {
        throw new ValidationError('Minimum order amount is R10');
      }
      if (amount > 5000) {
        throw new ValidationError('Maximum order amount is R5000');
      }

      // Get merchant details
      const { MerchantService } = await import(
        '@/domains/merchants/merchantService'
      );
      const merchant = await MerchantService.getMerchantById(merchantId);

      // Check user's available credit
      const { CreditService } = await import('@/domains/credit/creditService');
      const creditSummary = await CreditService.getCreditSummary(userId);

      if (creditSummary.availableCredit < amount) {
        throw new ValidationError(
          `Insufficient credit. Available: R${creditSummary.availableCredit}`
        );
      }

      // Calculate installment plan
      const plan = InstallmentCalculator.calculatePlan(amount);

      // Create instalments
      const instalments: Instalment[] = plan.instalments.map((inst, index) => ({
        id: uuidv4(),
        orderId: '', // Will be set after order creation
        amount: inst.amount,
        dueDate: inst.dueDate,
        paidAt: null,
        status: 'pending',
        lateFee: 0,
        paymentId: null,
        reminderSent: false,
        reminderCount: 0,
      }));

      const orderId = uuidv4();
      const order: Order = {
        id: orderId,
        userId,
        merchantId,
        merchantName: merchant.name,
        amount,
        serviceFee: plan.serviceFee,
        totalAmount: plan.totalAmount,
        status: 'pending',
        instalments: instalments.map((i) => ({ ...i, orderId })),
        createdAt: new Date(),
        updatedAt: new Date(),
        paidAt: null,
        paymentMethod: 'qr',
      };

      orderDatabase.set(orderId, order);

      // Update credit
      await CreditService.updateAvailableCredit(userId, amount);

      logger.info(`Order created: ${orderId} for user ${userId}`, {
        amount,
        merchantId,
      });

      return order;
    } catch (error) {
      logger.error('Failed to create order', error);
      throw error;
    }
  }

  static async getOrder(orderId: string): Promise<Order> {
    try {
      const order = orderDatabase.get(orderId);
      if (!order) {
        throw new NotFoundError(`Order ${orderId}`);
      }
      return order;
    } catch (error) {
      logger.error('Failed to get order', error);
      throw error;
    }
  }

  static async getUserOrders(userId: string): Promise<Order[]> {
    try {
      const orders = Array.from(orderDatabase.values()).filter(
        (order) => order.userId === userId
      );
      return orders.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    } catch (error) {
      logger.error('Failed to get user orders', error);
      throw error;
    }
  }

  static async createPaymentIntent(orderId: string): Promise<PaymentIntent> {
    try {
      const order = await this.getOrder(orderId);

      if (order.status !== 'pending') {
        throw new ValidationError(
          `Order cannot be paid. Status: ${order.status}`
        );
      }

      const paymentIntent: PaymentIntent = {
        id: uuidv4(),
        orderId,
        amount: order.amount,
        fee: order.serviceFee,
        total: order.totalAmount,
        status: 'requires_confirmation',
        clientSecret: `pi_${uuidv4()}_secret_${uuidv4()}`,
        paymentMethodTypes: ['card', 'debit_order'],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes expiry
      };

      paymentIntentDatabase.set(paymentIntent.id, paymentIntent);

      logger.info(`Payment intent created for order ${orderId}`);

      return paymentIntent;
    } catch (error) {
      logger.error('Failed to create payment intent', error);
      throw error;
    }
  }

  static async confirmPayment(paymentIntentId: string): Promise<Transaction> {
    try {
      const paymentIntent = paymentIntentDatabase.get(paymentIntentId);

      if (!paymentIntent) {
        throw new NotFoundError(`Payment intent ${paymentIntentId}`);
      }

      if (paymentIntent.status !== 'requires_confirmation') {
        throw new ValidationError(
          `Payment intent cannot be confirmed. Status: ${paymentIntent.status}`
        );
      }

      // Process payment
      const paymentResult = await PaymentProcessor.processPayment({
        orderId: paymentIntent.orderId,
        amount: paymentIntent.total,
        paymentMethod: 'debit_order',
        customerId: '', // Would come from order
        merchantId: '', // Would come from order
      });

      if (!paymentResult.success) {
        paymentIntent.status = 'failed';
        paymentIntentDatabase.set(paymentIntent.id, paymentIntent);
        throw new AppError(
          paymentResult.message || 'Payment failed',
          'PAYMENT_FAILED',
          400
        );
      }

      // Update payment intent
      paymentIntent.status = 'succeeded';
      paymentIntentDatabase.set(paymentIntent.id, paymentIntent);

      // Update order
      const order = await this.getOrder(paymentIntent.orderId);
      order.status = 'active';
      order.paidAt = new Date();
      order.updatedAt = new Date();
      orderDatabase.set(order.id, order);

      // Create transaction record
      const transaction: Transaction = {
        id: paymentResult.transactionId || uuidv4(),
        userId: order.userId,
        orderId: order.id,
        type: 'purchase',
        amount: order.amount,
        fee: order.serviceFee,
        total: order.totalAmount,
        status: 'completed',
        reference: `txn_${Date.now()}`,
        metadata: {
          paymentIntentId: paymentIntent.id,
          merchantId: order.merchantId,
        },
        createdAt: new Date(),
        completedAt: new Date(),
      };

      transactionDatabase.set(transaction.id, transaction);

      // Record repayment schedule
      const { RepaymentService } = await import(
        '@/domains/repayments/repaymentService'
      );
      for (const instalment of order.instalments) {
        await RepaymentService.createInstalment(order.userId, instalment);
      }

      logger.info(`Payment confirmed for order ${order.id}`, {
        transactionId: transaction.id,
      });

      return transaction;
    } catch (error) {
      logger.error('Failed to confirm payment', error);
      throw error;
    }
  }

  static async getPaymentStatus(
    paymentIntentId: string
  ): Promise<PaymentIntent['status']> {
    try {
      const paymentIntent = paymentIntentDatabase.get(paymentIntentId);
      if (!paymentIntent) {
        throw new NotFoundError(`Payment intent ${paymentIntentId}`);
      }
      return paymentIntent.status;
    } catch (error) {
      logger.error('Failed to get payment status', error);
      throw error;
    }
  }

  static async processQRPayment(
    userId: string,
    merchantId: string,
    amount: number
  ): Promise<Transaction> {
    try {
      // Create order
      const order = await this.createOrder(userId, merchantId, amount);

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(order.id);

      // Confirm payment
      const transaction = await this.confirmPayment(paymentIntent.id);

      return transaction;
    } catch (error) {
      logger.error('Failed to process QR payment', error);
      throw error;
    }
  }
}
