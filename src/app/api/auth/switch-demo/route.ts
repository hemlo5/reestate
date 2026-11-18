import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { switchDemoSchema } from '@/lib/validation/schemas';
import { newSessionExpiryIso, sanitizeUser, setSessionCookie } from '@/lib/auth/session';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

export async function POST(req: Request) {
  try {
    const raw = await parseJsonBody(req);
    const parsed = switchDemoSchema.parse(raw);

    const db = getDb();
    const user = await db.getUserById(parsed.userId);
    if (!user) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    if (!user.isDemo) {
      return NextResponse.json(
        { error: 'Quick switching is strictly restricted to seeded demo accounts.' },
        { status: 403 }
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
