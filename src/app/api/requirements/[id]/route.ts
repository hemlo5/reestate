import { NextResponse } from 'next/server';
import { getDb, requireRole } from '@/lib/db';
import { updateRequirementSchema } from '@/lib/validation/schemas';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const seeker = await requireRole('seeker');
    const { id } = await context.params;
    const raw = await parseJsonBody(req);
    const parsed = updateRequirementSchema.parse(raw);

    const requirement = await getDb().updateRequirement(id, seeker.id, parsed);
    if (!requirement) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    }
    return NextResponse.json({ requirement });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const seeker = await requireRole('seeker');
    const { id } = await context.params;
    const deleted = await getDb().deleteRequirement(id, seeker.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
