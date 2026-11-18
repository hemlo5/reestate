import { NextResponse } from 'next/server';
import { getDb, requireAuth } from '@/lib/db';
import { createReviewSchema } from '@/lib/validation/schemas';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const brokerId = searchParams.get('brokerId');
    if (!brokerId) {
      return NextResponse.json({ error: 'brokerId is required' }, { status: 400 });
    }
    const reviews = await getDb().listReviewsForBroker(brokerId);
    return NextResponse.json({ reviews });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireAuth();
    const raw = await parseJsonBody(req);
    const parsed = createReviewSchema.parse(raw);

    const review = await getDb().createReview(actor, parsed);
    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
