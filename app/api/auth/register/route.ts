// app/api/auth/register/route.ts - COMPLETE REWRITE
import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validators';
import { supabaseAdmin } from '@/services/supabase/admin';
import { hashPassword } from '@/lib/crypto';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', validated.email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Create auth user via Supabase Auth
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: validated.email,
        password: validated.password,
        email_confirm: true,
        user_metadata: {
          full_name: validated.fullName,
          phone_number: validated.phoneNumber,
        },
      });

    if (authError) throw authError;

    // Insert into users table
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        email: validated.email,
        full_name: validated.fullName,
        phone_number: validated.phoneNumber,
        id_number: validated.idNumber,
        status: 'active',
      })
      .select()
      .single();

    if (userError) throw userError;

    // Create user_auth record with PIN hash
    const { error: authRecordError } = await supabaseAdmin
      .from('user_auth')
      .insert({
        user_id: user.id,
        password_hash: await hashPassword(validated.password),
        pin_hash: null,
        failed_attempts: 0,
      });

    if (authRecordError) throw authRecordError;

    // Create credit profile
    const { error: creditError } = await supabaseAdmin
      .from('credit_profiles')
      .insert({
        user_id: user.id,
        credit_score: 500,
        credit_limit: 500,
        available_credit: 500,
        risk_level: 'medium',
      });

    if (creditError) throw creditError;

    logger.info(`User registered: ${user.email}`, { userId: user.id });

    return NextResponse.json(
      {
        success: true,
        data: {
          user: { id: user.id, email: user.email, full_name: user.full_name },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Registration failed', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
