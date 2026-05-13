// app/api/merchants/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MerchantService } from '@/domains/merchants/merchantService';
import { handleError } from '@/lib/errorHandler';

const searchSchema = z.object({
  q: z.string().min(1),
  lat: z.string().optional().transform(Number),
  lng: z.string().optional().transform(Number),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = searchSchema.safeParse({
      q: searchParams.get('q'),
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Invalid parameters', code: 'VALIDATION_ERROR' },
        },
        { status: 400 }
      );
    }

    const { q, lat, lng } = result.data;
    const location =
      lat && lng ? { lat, lng, formattedAddress: '', placeId: '' } : undefined;

    const merchants = await MerchantService.searchMerchants(q, location);

    return NextResponse.json({
      success: true,
      data: merchants,
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
