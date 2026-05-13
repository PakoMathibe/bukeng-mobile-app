// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validators';
import { AuthService } from '@/domains/auth/authService';
import { logger } from '@/lib/logger';
import { handleError } from '@/lib/errorHandler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validated = loginSchema.parse(body);

    // Login user
    const result = await AuthService.login(validated);

    // Set cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
      },
    });

    response.cookies.set('bukeng_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    logger.info(`User logged in: ${result.user.email}`);

    return response;
  } catch (error) {
    const { message, code, statusCode } = handleError(error);
    return NextResponse.json(
      {
        success: false,
        error: { message, code },
      },
      { status: statusCode }
    );
  }
}
