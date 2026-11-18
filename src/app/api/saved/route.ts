import { NextResponse } from 'next/server';
import { getDb, requireAuth } from '@/lib/db';
import { handleApiError } from '@/lib/api/route-helpers';

export async function GET() {
  try {
    const actor = await requireAuth();
    const db = getDb();
    const [savedIds, properties] = await Promise.all([
      db.getSavedPropertyIds(actor.id),
      db.listSavedProperties(actor.id),
    ]);
    return NextResponse.json({ savedIds, properties });
  } catch (err) {
    return handleApiError(err);
  }
}
