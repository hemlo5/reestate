import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { clearSessionCookie, readCookieSession } from '@/lib/auth/session';
import { handleApiError } from '@/lib/api/route-helpers';

export async function POST() {
  try {
    const tokenData = await readCookieSession();
    if (tokenData) {
      await getDb().deleteSession(tokenData.sessionId);
    }
    const res = NextResponse.json({ ok: true });
    clearSessionCookie(res);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
