import crypto from 'crypto';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.SESSION_SECRET || 'stress-test-engine-fallback-session-secret-key-998877';

// 1. PBKDF2 Password Hashing
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// Helper to base64url encode
function base64url(str: string | Buffer): string {
  const buf = typeof str === 'string' ? Buffer.from(str) : str;
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Helper to base64url decode
function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

// 2. Custom HS256 JWT Implementation
export function createSessionToken(payload: { userId: string; email: string }): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days expiration
  const fullPayload = { ...payload, exp };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  
  const signatureB64 = base64url(signature);

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

export function verifySessionToken(token: string): { userId: string; email: string } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  
  // Recreate signature and verify
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  
  const expectedSignatureB64 = base64url(expectedSignature);

  if (signatureB64 !== expectedSignatureB64) {
    return null; // Invalid signature
  }

  try {
    const payload = JSON.parse(base64urlDecode(payloadB64));
    
    // Check expiration
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Expired
    }

    return {
      userId: payload.userId,
      email: payload.email
    };
  } catch (err) {
    return null;
  }
}

// 3. Resolve user from request cookie
export async function getSessionUser(req: NextRequest): Promise<{ userId: string; email: string } | null> {
  const sessionCookie = req.cookies.get('session')?.value;
  if (!sessionCookie) return null;
  return verifySessionToken(sessionCookie);
}
