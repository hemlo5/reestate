import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { registerSchema } from '@/lib/validation/schemas';
import { hashPassword } from '@/lib/auth/password';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';
import { newSessionExpiryIso, setSessionCookie } from '@/lib/auth/session';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`register:${ip}`, 15, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many registration requests. Retry in ${rl.retryAfterSec}s.` },
        { status: 429 }
      );
    }

    const raw = await parseJsonBody(req);
    const parsed = registerSchema.parse(raw);

    if (parsed.authMethod === 'password' && !parsed.password) {
      return NextResponse.json(
        { error: 'Password (minimum 6 characters) is required.' },
        { status: 400 }
      );
    }

    const passwordHash = parsed.password ? await hashPassword(parsed.password) : null;
    const db = getDb();
    const user = await db.createUser({ ...parsed, passwordHash });
    const session = await db.createSession(user.id, newSessionExpiryIso());

    const res = NextResponse.json({ user }, { status: 201 });
    await setSessionCookie(res, session.id, user.id);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
