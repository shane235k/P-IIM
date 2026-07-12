import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, createSessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    const emailNormalized = email.toLowerCase().trim();

    // Check if email already exists
    const { rows: existingUsers } = await query(
      "SELECT id FROM users WHERE email = $1",
      [emailNormalized]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
    }

    // Hash password and insert
    const passwordHash = hashPassword(password);
    const { rows: newUser } = await query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
      [emailNormalized, passwordHash]
    );

    const userId = newUser[0].id;
    const token = createSessionToken({ userId, email: emailNormalized });

    const response = NextResponse.json({
      success: true,
      user: { id: userId, email: emailNormalized }
    });

    response.cookies.set({
      name: 'session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (err: any) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: err.message || "An internal error occurred." }, { status: 500 });
  }
}
