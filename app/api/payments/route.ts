// app/api/payments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/services/supabase/admin';
import { getCurrentUser } from '@/services/supabase/client';
import { logger } from '@/lib/logger';

const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive().max(5000),
  paymentMethod: z.enum(['debit_order', 'card', 'qr']),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createPaymentSchema.parse(body);

    // Create payment record in Supabase
    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: user.id,
        order_id: validated.orderId,
        amount: validated.amount,
        status: 'pending',
        payment_method: validated.paymentMethod,
      })
      .select()
      .single();

    if (error) throw error;

    // Get user's credit profile
    const { data: creditProfile } = await supabaseAdmin
      .from('credit_profiles')
      .select('available_credit')
      .eq('user_id', user.id)
      .single();

    if (!creditProfile || creditProfile.available_credit < validated.amount) {
      return NextResponse.json(
        { error: 'Insufficient credit' },
        { status: 400 }
      );
    }

    // Update available credit
    await supabaseAdmin
      .from('credit_profiles')
      .update({
        available_credit: creditProfile.available_credit - validated.amount,
        used_credit: supabaseAdmin.rpc('increment', {
          row_id: user.id,
          amount: validated.amount,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    logger.info(`Payment created for user ${user.id}`, {
      paymentId: payment.id,
    });

    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch (error) {
    logger.error('Payment creation failed', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: payments, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    logger.error('Failed to fetch payments', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
