// app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/crypto';
import { AuthService } from '@/domains/auth/authService';
import { logger } from '@/lib/logger';
import { handleError } from '@/lib/errorHandler';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('bukeng_token')?.value;
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    const finalToken = token || bearerToken;

    if (!finalToken) {
      return NextResponse.json({
        success: false,
        data: { authenticated: false },
      });
    }

    const user = await AuthService.validateSession(finalToken);

    return NextResponse.json({
      success: true,
      data: {
        authenticated: !!user,
        user: user || null,
      },
    });
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
