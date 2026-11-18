import { NextResponse } from 'next/server';
import { getDb, requireAuth } from '@/lib/db';
import { createVisitSchema } from '@/lib/validation/schemas';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

export async function GET() {
  try {
    const actor = await requireAuth();
    const visits = await getDb().listVisitsForUser(actor.id, actor.role);
    return NextResponse.json({ visits });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireAuth();
    const raw = await parseJsonBody(req);
    const parsed = createVisitSchema.parse(raw);

    const visit = await getDb().createVisit(actor, parsed);
    return NextResponse.json({ visit }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
