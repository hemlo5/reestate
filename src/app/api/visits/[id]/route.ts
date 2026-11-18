import { NextResponse } from 'next/server';
import { getDb, requireAuth } from '@/lib/db';
import { updateVisitSchema } from '@/lib/validation/schemas';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAuth();
    const { id } = await context.params;
    const raw = await parseJsonBody(req);
    const parsed = updateVisitSchema.parse(raw);

    const visit = await getDb().updateVisitStatus(id, actor, parsed.status);
    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }
    return NextResponse.json({ visit });
  } catch (err) {
    return handleApiError(err);
  }
}
