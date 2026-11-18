import { NextResponse } from 'next/server';
import { getDb, requireAuth } from '@/lib/db';
import { handleApiError } from '@/lib/api/route-helpers';

export async function GET() {
  try {
    const actor = await requireAuth();
    const notifications = await getDb().listNotificationsForUser(actor.id);
    return NextResponse.json({ notifications });
  } catch (err) {
    return handleApiError(err);
  }
}
