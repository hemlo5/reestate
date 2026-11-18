import { NextResponse } from 'next/server';
import { getDb, requireAuth } from '@/lib/db';
import { markNotificationsReadSchema } from '@/lib/validation/schemas';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

export async function PATCH(req: Request) {
  try {
    const actor = await requireAuth();
    const raw = await parseJsonBody(req);
    const parsed = markNotificationsReadSchema.parse(raw);

    await getDb().markNotificationsRead(actor.id, parsed.notificationId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
