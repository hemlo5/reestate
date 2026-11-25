import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import type { User, UserRole } from '@/types';
import type { StoredUser } from '@/lib/db/types';

export const SESSION_COOKIE_NAME = 'housed_session';
export const WORKSPACE_COOKIE_NAME = 'housed_workspace';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    'dev-housed-fallback-secret-change-me-in-production'
  );
}

export function signSessionToken(sessionId: string, userId: string): string {
  const payload = `${sessionId}.${userId}`;
  const sig = createHmac('sha256', getAuthSecret())
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(
  token: string | undefined
): { sessionId: string; userId: string } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [sessionId, userId, sig] = parts;
  if (!sessionId || !userId || !sig) return null;

  const expected = createHmac('sha256', getAuthSecret())
    .update(`${sessionId}.${userId}`)
    .digest('base64url');

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
    return { sessionId, userId };
  } catch {
    return null;
  }
}

export function sanitizeUser(user: StoredUser): User {
  const { passwordHash: _ph, ...safe } = user;
  if (!safe.brokerProfile?.verificationDocs) return safe;
  const { govtIdFileData: _blob, ...safeDocs } = safe.brokerProfile.verificationDocs;
  return {
    ...safe,
    brokerProfile: {
      ...safe.brokerProfile,
      verificationDocs: safeDocs,
    },
  };
}

export function sanitizePublicBroker(user: StoredUser): User {
  const safe = sanitizeUser(user);
  if (!safe.brokerProfile?.verificationDocs) return safe;
  return {
    ...safe,
    brokerProfile: {
      ...safe.brokerProfile,
      verificationDocs: {
        reraAuthority: safe.brokerProfile.verificationDocs.reraAuthority,
      },
    },
  };
}

export async function setSessionCookie(
  res: NextResponse,
  sessionId: string,
  userId: string
): Promise<void> {
  const value = signSessionToken(sessionId, userId);
  res.cookies.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  res.cookies.set(WORKSPACE_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  res.cookies.set(WORKSPACE_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export function setWorkspaceCookie(res: NextResponse, role: 'broker' | 'seeker'): void {
  res.cookies.set(WORKSPACE_COOKIE_NAME, role, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function newSessionExpiryIso(): string {
  return new Date(Date.now() + SESSION_TTL_MS).toISOString();
}

export async function readCookieSession(): Promise<{ sessionId: string; userId: string } | null> {
  try {
    const store = await cookies();
    const raw = store.get(SESSION_COOKIE_NAME)?.value;
    return verifySessionToken(raw);
  } catch {
    return null;
  }
}

export async function readWorkspaceRole(): Promise<'broker' | 'seeker' | null> {
  try {
    const store = await cookies();
    const role = store.get(WORKSPACE_COOKIE_NAME)?.value;
    return role === 'broker' || role === 'seeker' ? role : null;
  } catch {
    return null;
  }
}

export function assertRole(user: User | null, role: UserRole): user is User {
  return Boolean(user && user.role === role);
}
