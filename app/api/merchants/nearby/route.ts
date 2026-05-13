// app/api/merchants/nearby/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MapService } from '@/domains/maps/mapService';
import { logger } from '@/lib/logger';
import { handleError } from '@/lib/errorHandler';

const nearbyQuerySchema = z.object({
  lat: z.string().transform(Number),
  lng: z.string().transform(Number),
  radius: z.string().optional().transform(Number),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = nearbyQuerySchema.safeParse({
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      radius: searchParams.get('radius'),
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

    const { lat, lng, radius = 5 } = result.data;

    const searchResult = await MapService.getNearbyMerchants(
      { lat, lng, formattedAddress: '', placeId: '' },
      radius
    );

    return NextResponse.json({
      success: true,
      data: searchResult,
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
