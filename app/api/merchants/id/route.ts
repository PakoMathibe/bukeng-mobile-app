// app/api/merchants/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MerchantService } from '@/domains/merchants/merchantService';
import { handleError } from '@/lib/errorHandler';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const merchant = await MerchantService.getMerchantById(params.id);

    return NextResponse.json({
      success: true,
      data: merchant,
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
