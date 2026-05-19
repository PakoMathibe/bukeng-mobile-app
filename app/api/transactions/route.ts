// app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/services/supabase/admin';
import { getCurrentUser } from '@/services/supabase/client';
import { logger } from '@/lib/logger';
import { FraudService } from '@/domains/fraud/fraudService';
import { DeviceFingerprinter } from '@/modules/FraudDetector/deviceFingerprint';

const createTransactionSchema = z.object({
  merchantId: z.string().uuid('Invalid merchant ID'),
  amount: z.number().min(10, 'Minimum amount is R10').max(5000, 'Maximum amount is R5000'),
  paymentMethod: z.enum(['qr', 'online', 'manual']),
});

const transactionQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const validated = transactionQuerySchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    const { data: transactions, error, count } = await supabaseAdmin
      .from('transactions')
      .select('*, merchants(name)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(validated.offset, validated.offset + validated.limit - 1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        total: count,
        limit: validated.limit,
        offset: validated.offset,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch transactions', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createTransactionSchema.parse(body);

    // Check user's available credit
    const { data: creditProfile } = await supabaseAdmin
      .from('credit_profiles')
      .select('available_credit')
      .eq('user_id', user.id)
      .single();

    if (!creditProfile || creditProfile.available_credit < validated.amount) {
      return NextResponse.json({ error: 'Insufficient credit' }, { status: 400 });
    }

    // Fraud detection
    const deviceFingerprint = await DeviceFingerprinter.generate();
    const fraudCheck = await FraudService.assessTransactionRisk(
      { id: user.id, email: user.email } as any,
      { amount: validated.amount },
      deviceFingerprint
    );

    if (fraudCheck.isFraudulent) {
      await supabaseAdmin
        .from('fraud_logs')
        .insert({
          user_id: user.id,
          risk_score: fraudCheck.riskScore,
          reason: fraudCheck.flags.join(', '),
          device_info: deviceFingerprint,
        });

      return NextResponse.json(
        { error: 'Transaction blocked for security review' },
        { status: 403 }
      );
    }

    // Create transaction
    const serviceFee = validated.amount * 0.008;
    const totalAmount = validated.amount + serviceFee;

    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: user.id,
        merchant_id: validated.merchantId,
        amount: validated.amount,
        fee: serviceFee,
        total: totalAmount,
        status: 'pending',
        type: 'purchase',
        payment_method: validated.paymentMethod,
      })
      .select()
      .single();

    if (txError) throw txError;

    // Create installment plan (3 installments over 3 months)
    const installmentAmount = totalAmount / 3;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);

    const { data: installmentPlan, error: planError } = await supabaseAdmin
      .from('installment_plans')
      .insert({
        transaction_id: transaction.id,
        number_of_installments: 3,
        installment_amount: installmentAmount,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      })
      .select()
      .single();

    if (planError) throw planError;

    // Create repayment schedule
    const repayments = [];
    for (let i = 1; i <= 3; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);

      const { data: repayment } = await supabaseAdmin
        .from('repayments')
        .insert({
          installment_plan_id: installmentPlan.id,
          due_date: dueDate.toISOString().split('T')[0],
          amount_due: installmentAmount,
          amount_paid: 0,
          status: 'pending',
        })
        .select()
        .single();

      repayments.push(repayment);
    }

    // Update available credit
    await supabaseAdmin
      .from('credit_profiles')
      .update({
        available_credit: creditProfile.available_credit - validated.amount,
        used_credit: (creditProfile.used_credit || 0) + validated.amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // Create payment record
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: user.id,
        transaction_id: transaction.id,
        amount: totalAmount,
        payment_gateway: validated.paymentMethod,
        status: 'pending',
      })
      .select()
      .single();

    logger.info(`Transaction created for user ${user.id}`, { transactionId: transaction.id });

    return NextResponse.json({
      success: true,
      data: {
        transaction,
        installmentPlan,
        repayments,
        payment,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error('Transaction creation failed', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}