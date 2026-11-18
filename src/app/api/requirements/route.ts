import { NextResponse } from 'next/server';
import { getDb, requireRole } from '@/lib/db';
import { createRequirementSchema } from '@/lib/validation/schemas';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

export async function GET() {
  try {
    const seeker = await requireRole('seeker');
    const requirements = await getDb().listRequirementsBySeeker(seeker.id);
    return NextResponse.json({ requirements });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const seeker = await requireRole('seeker');
    const raw = await parseJsonBody(req);
    const parsed = createRequirementSchema.parse(raw);

    const requirement = await getDb().createRequirement(seeker, parsed);
    return NextResponse.json({ requirement }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
