// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/crypto';
import { AuthService } from '@/domains/auth/authService';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('bukeng_token')?.value;

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        await AuthService.logout(payload.userId);
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    response.cookies.delete('bukeng_token');

    logger.info('User logged out');

    return response;
  } catch (error) {
    logger.error('Logout error', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: 'Logout failed', code: 'LOGOUT_ERROR' },
      },
      { status: 500 }
    );
  }
}
