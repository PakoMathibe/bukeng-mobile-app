// app/api/test-env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // Check if environment variables are loaded (server-side)
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return NextResponse.json({
    hasSupabaseUrl: hasUrl,
    hasSupabaseKey: hasKey,
    urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
    message: hasUrl && hasKey ? 'Environment variables loaded!' : 'Missing environment variables'
  });
}