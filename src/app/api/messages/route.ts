import { NextResponse } from 'next/server';
import { getDb, requireAuth } from '@/lib/db';
import { createMessageSchema } from '@/lib/validation/schemas';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

export async function GET(req: Request) {
  try {
    const actor = await requireAuth();
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');

    const db = getDb();
    const messages = propertyId
      ? await db.listMessagesForProperty(propertyId, actor.id)
      : await db.listMessagesForUser(actor.id);

    return NextResponse.json({ messages });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireAuth();
    const raw = await parseJsonBody(req);
    const parsed = createMessageSchema.parse(raw);

    const message = await getDb().createMessage(actor, parsed);
    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
