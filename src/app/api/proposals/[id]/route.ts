import { NextResponse } from 'next/server';
import { getDb, requireAuth } from '@/lib/db';
import { updateProposalSchema } from '@/lib/validation/schemas';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAuth();
    const { id } = await context.params;
    const raw = await parseJsonBody(req);
    const parsed = updateProposalSchema.parse(raw);

    const proposal = await getDb().updateProposal(id, actor, parsed);
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }
    return NextResponse.json({ proposal });
  } catch (err) {
    return handleApiError(err);
  }
}
