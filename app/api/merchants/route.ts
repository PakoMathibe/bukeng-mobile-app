// app/api/merchants/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/services/supabase/admin';
import { logger } from '@/lib/logger';

const merchantQuerySchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().min(1).max(50).default(10),
  type: z.string().optional(),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const validated = merchantQuerySchema.parse({
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      radius: searchParams.get('radius'),
      type: searchParams.get('type'),
      search: searchParams.get('search'),
    });

    let query = supabaseAdmin
      .from('merchants')
      .select('*')
      .eq('is_active', true);

    if (validated.search) {
      query = query.ilike('name', `%${validated.search}%`);
    }

    if (validated.type) {
      query = query.eq('business_type', validated.type);
    }

    const { data: merchants, error } = await query;

    if (error) throw error;

    // Calculate distances if lat/lng provided
    let merchantsWithDistance = merchants || [];
    if (validated.lat && validated.lng && merchantsWithDistance.length > 0) {
      merchantsWithDistance = merchantsWithDistance
        .map((merchant) => ({
          ...merchant,
          distance: calculateDistance(
            validated.lat!,
            validated.lng!,
            merchant.lat,
            merchant.lng
          ),
        }))
        .filter((m) => m.distance <= validated.radius)
        .sort((a, b) => a.distance - b.distance);
    }

    return NextResponse.json({
      success: true,
      data: merchantsWithDistance,
      total: merchantsWithDistance.length,
    });
  } catch (error) {
    logger.error('Failed to fetch merchants', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
