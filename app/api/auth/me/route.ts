import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '@/services/firebase/admin';

// Initialize Firebase Admin
initAdmin();

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decodedToken = await getAuth().verifyIdToken(token);

    return NextResponse.json({
      user: {
        id: decodedToken.uid,
        email: decodedToken.email,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
}
