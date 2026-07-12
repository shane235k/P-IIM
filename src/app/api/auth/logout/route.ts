import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({ success: true, message: "Logged out successfully." });
    
    response.cookies.set({
      name: 'session',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0) // Expire immediately
    });

    return response;
  } catch (err: any) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: err.message || "An internal error occurred." }, { status: 500 });
  }
}
