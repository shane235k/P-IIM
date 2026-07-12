import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.userId,
        email: user.email
      }
    });
  } catch (err: any) {
    console.error("Session fetch error:", err);
    return NextResponse.json({ error: err.message || "An internal error occurred." }, { status: 500 });
  }
}
