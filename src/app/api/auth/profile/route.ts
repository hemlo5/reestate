import { NextResponse } from 'next/server';
import { getDb, requireAuth } from '@/lib/db';
import { updateProfileSchema } from '@/lib/validation/schemas';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

export async function PUT(req: Request) {
  try {
    const actor = await requireAuth();
    const raw = await parseJsonBody(req);
    const parsed = updateProfileSchema.parse(raw);

    const updated = await getDb().updateUserProfile(actor.id, parsed);
    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ user: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
