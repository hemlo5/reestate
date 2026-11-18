import type { Metadata } from 'next';
import { getDb, getSessionUser } from '@/lib/db';
import type { FurnishingPreference, ListingIntent, PropertyCategory, SearchFilters } from '@/types';
import { MapDiscoveryClient } from '@/components/seeker/MapDiscoveryClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Interactive Property Map',
  description:
    'Explore verified homes for rent and sale across Bengaluru & Mumbai with interactive price markers.',
};

interface MapPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val;
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const sp = await searchParams;
  const intentParam = firstParam(sp.intent);
  const locality = firstParam(sp.locality) || 'All';
  const propertyTypeParam = firstParam(sp.propertyType);
  const bedroomsParam = firstParam(sp.bedrooms);
  const budgetMaxParam = firstParam(sp.budgetMax);
  const furnishingParam = firstParam(sp.furnishing);

  const initialFilters: SearchFilters = {
    intent: (intentParam === 'buy' ? 'buy' : 'rent') as ListingIntent,
    locality,
    propertyType: (
      propertyTypeParam === 'Flat' ||
      propertyTypeParam === 'House' ||
      propertyTypeParam === 'Room'
        ? propertyTypeParam
        : 'All'
    ) as PropertyCategory | 'All',
    bedrooms:
      bedroomsParam && bedroomsParam !== 'All'
        ? Number.parseInt(bedroomsParam, 10) || 'All'
        : 'All',
    budgetMax: budgetMaxParam ? Number.parseInt(budgetMaxParam, 10) || null : null,
    furnishing: (
      furnishingParam === 'Furnished' ||
      furnishingParam === 'Semi-furnished' ||
      furnishingParam === 'Unfurnished'
        ? furnishingParam
        : 'Any'
    ) as FurnishingPreference,
    query: firstParam(sp.query) || '',
  };

  const db = getDb();
  const [user, propertiesPage] = await Promise.all([
    getSessionUser(),
    db.listProperties({ limit: 50 }),
  ]);

  const savedIds = user ? await db.getSavedPropertyIds(user.id) : [];

  return (
    <MapDiscoveryClient
      initialFilters={initialFilters}
      initialProperties={propertiesPage.items}
      initialSavedIds={savedIds}
    />
  );
}
