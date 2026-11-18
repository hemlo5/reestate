import { NextResponse } from 'next/server';
import { getDb, requireAuth, requireRole } from '@/lib/db';
import { createProposalSchema } from '@/lib/validation/schemas';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

export async function GET(req: Request) {
  try {
    const actor = await requireAuth();
    const { searchParams } = new URL(req.url);
    const requirementId = searchParams.get('requirementId') || undefined;

    const db = getDb();
    const proposals =
      actor.role === 'broker'
        ? await db.listProposalsForBroker(actor.id)
        : await db.listProposalsForSeeker(actor.id, requirementId);

    return NextResponse.json({ proposals });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const broker = await requireRole('broker');
    const raw = await parseJsonBody(req);
    const parsed = createProposalSchema.parse(raw);

    const proposal = await getDb().createProposal(broker, parsed);
    return NextResponse.json({ proposal }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
