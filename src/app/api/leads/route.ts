import { NextResponse } from 'next/server';
import { getDb, requireRole } from '@/lib/db';
import { handleApiError } from '@/lib/api/route-helpers';
import type { ListingIntent, PropertyCategory } from '@/types';

export async function GET(req: Request) {
  try {
    const broker = await requireRole('broker');
    const { searchParams } = new URL(req.url);

    const intentParam = searchParams.get('intent');
    const locality = searchParams.get('locality') || undefined;
    const propertyTypeParam = searchParams.get('propertyType');
    const bedroomsParam = searchParams.get('bedrooms');
    const query = searchParams.get('query') || undefined;
    const onlyMatching = searchParams.get('onlyMatching') === 'true';
    const cursor = searchParams.get('cursor');
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10);

    const result = await getDb().getLeadsForBroker({
      brokerId: broker.id,
      intent:
        intentParam === 'rent' || intentParam === 'buy'
          ? (intentParam as ListingIntent)
          : 'All',
      locality,
      propertyType:
        propertyTypeParam === 'Flat' ||
        propertyTypeParam === 'House' ||
        propertyTypeParam === 'Room'
          ? (propertyTypeParam as PropertyCategory)
          : 'All',
      bedrooms:
        bedroomsParam && bedroomsParam !== 'All'
          ? Number.parseInt(bedroomsParam, 10) || 'All'
          : 'All',
      query,
      onlyMatchingMyInventory: onlyMatching,
      cursor,
      limit: Number.isFinite(limit) ? limit : 20,
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
