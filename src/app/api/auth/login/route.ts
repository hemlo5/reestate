import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { loginSchema } from '@/lib/validation/schemas';
import { verifyPassword } from '@/lib/auth/password';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';
import { newSessionExpiryIso, sanitizeUser, setSessionCookie } from '@/lib/auth/session';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`login:${ip}`, 20, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Retry in ${rl.retryAfterSec}s.` },
        { status: 429 }
      );
    }

    const raw = await parseJsonBody(req);
    const parsed = loginSchema.parse(raw);

    const db = getDb();
    const user = await db.getUserByEmail(parsed.email);
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(parsed.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const session = await db.createSession(user.id, newSessionExpiryIso());
    const res = NextResponse.json({ user: sanitizeUser(user) });
    await setSessionCookie(res, session.id, user.id);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
