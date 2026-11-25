import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/db';
import { setWorkspaceCookie } from '@/lib/auth/session';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await parseJsonBody<{ role?: string }>(req);
    if (body.role !== 'broker' && body.role !== 'seeker') {
      return NextResponse.json({ error: 'Choose a valid workspace.' }, { status: 400 });
    }
    if (body.role === 'broker' && !user.brokerProfile) {
      return NextResponse.json({ error: 'This account does not have a broker workspace.' }, { status: 403 });
    }
    const res = NextResponse.json({ role: body.role });
    setWorkspaceCookie(res, body.role);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
