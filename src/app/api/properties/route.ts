import { NextResponse } from 'next/server';
import { getDb, getSessionUser, requireRole } from '@/lib/db';
import { createPropertySchema } from '@/lib/validation/schemas';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';
import type { ListingIntent, PropertyCategory } from '@/types';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const intentParam = searchParams.get('intent');
    const locality = searchParams.get('locality') || undefined;
    const propertyTypeParam = searchParams.get('propertyType');
    const bedroomsParam = searchParams.get('bedrooms');
    const budgetMaxParam = searchParams.get('budgetMax');
    const furnishing = searchParams.get('furnishing') || undefined;
    const query = searchParams.get('query') || undefined;
    const brokerId = searchParams.get('brokerId') || undefined;
    const includeUnavailableParam = searchParams.get('includeUnavailable') === 'true';
    const cursor = searchParams.get('cursor');
    const limitParam = Number.parseInt(searchParams.get('limit') || '24', 10);

    let includeUnavailable = false;
    if (includeUnavailableParam && brokerId) {
      const actor = await getSessionUser();
      if (actor && actor.id === brokerId) {
        includeUnavailable = true;
      }
    }

    const result = await getDb().listProperties({
      intent:
        intentParam === 'rent' || intentParam === 'buy'
          ? (intentParam as ListingIntent)
          : undefined,
      locality,
      propertyType:
        propertyTypeParam === 'Flat' ||
        propertyTypeParam === 'House' ||
        propertyTypeParam === 'Room'
          ? (propertyTypeParam as PropertyCategory)
          : undefined,
      bedrooms:
        bedroomsParam && bedroomsParam !== 'All'
          ? Number.parseInt(bedroomsParam, 10) || 'All'
          : 'All',
      budgetMax: budgetMaxParam ? Number.parseInt(budgetMaxParam, 10) || null : null,
      furnishing,
      query,
      brokerId,
      includeUnavailable,
      cursor,
      limit: Number.isFinite(limitParam) ? limitParam : 24,
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const broker = await requireRole('broker');
    const raw = await parseJsonBody(req);
    const parsed = createPropertySchema.parse(raw);

    const property = await getDb().createProperty(broker, parsed);
    return NextResponse.json({ property }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
