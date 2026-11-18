import { NextResponse } from 'next/server';
import { getDb, requireAuth } from '@/lib/db';
import { toggleSavedSchema } from '@/lib/validation/schemas';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

export async function POST(req: Request) {
  try {
    const actor = await requireAuth();
    const raw = await parseJsonBody(req);
    const parsed = toggleSavedSchema.parse(raw);

    const savedIds = await getDb().toggleSavedProperty(actor.id, parsed.propertyId);
    return NextResponse.json({ savedIds });
  } catch (err) {
    return handleApiError(err);
  }
}
