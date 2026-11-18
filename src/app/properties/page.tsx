import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { getDb, getSessionUser } from '@/lib/db';
import { LOCALITIES, slugifyLocality } from '@/lib/matching';
import type { ListingIntent, PropertyCategory } from '@/types';
import { PropertyCard } from '@/components/PropertyCard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Verified Properties for Rent & Sale',
  description:
    'Browse verified apartments, independent houses, villas, and studios listed by trusted local brokers on Housed.',
};

interface PropertiesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val;
}

export default async function PropertiesDirectoryPage({
  searchParams,
}: PropertiesPageProps) {
  const sp = await searchParams;
  const intentParam = first(sp.intent);
  const locality = first(sp.locality);
  const propertyTypeParam = first(sp.propertyType);
  const cursor = first(sp.cursor) || null;

  const intent: ListingIntent | undefined =
    intentParam === 'rent' || intentParam === 'buy' ? intentParam : undefined;
  const propertyType: PropertyCategory | undefined =
    propertyTypeParam === 'Flat' ||
    propertyTypeParam === 'House' ||
    propertyTypeParam === 'Room'
      ? propertyTypeParam
      : undefined;

  const db = getDb();
  const [user, page] = await Promise.all([
    getSessionUser(),
    db.listProperties({
      intent,
      locality,
      propertyType,
      cursor,
      limit: 12,
    }),
  ]);
  const savedIds = user ? await db.getSavedPropertyIds(user.id) : [];

  const makeFilterHref = (next: {
    intent?: ListingIntent | 'all';
    locality?: string;
    propertyType?: PropertyCategory | 'all';
    cursor?: string | null;
  }) => {
    const qs = new URLSearchParams();
    const effIntent = next.intent === 'all' ? undefined : (next.intent ?? intent);
    const effLoc = next.locality === 'All' ? undefined : (next.locality ?? locality);
    const effType =
      next.propertyType === 'all' ? undefined : (next.propertyType ?? propertyType);

    if (effIntent) qs.set('intent', effIntent);
    if (effLoc) qs.set('locality', effLoc);
    if (effType) qs.set('propertyType', effType);
    if (next.cursor) qs.set('cursor', next.cursor);
    const str = qs.toString();
    return `/properties${str ? `?${str}` : ''}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-28 md:pb-14 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#1A56FF]">Verified Broker Inventory</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#0B1324]">
            Properties across Bengaluru & Mumbai
          </h1>
          <p className="mt-1 text-sm text-[#5E687A] tabular-nums">
            Showing {page.items.length} of {page.total} active verified listings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/map"
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] border border-[#E6E9EF] text-xs font-semibold text-[#0B1324] inline-flex items-center gap-1.5"
          >
            <MapPin className="h-3.5 w-3.5 text-[#1A56FF]" />
            <span>Map View</span>
          </Link>
          <Link
            href="/seeker/requirements/new"
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <span>Post Requirement</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-4 flex flex-wrap items-center gap-2">
        {[
          { label: 'All Intents', href: makeFilterHref({ intent: 'all', cursor: null }), active: !intent },
          { label: 'For Rent', href: makeFilterHref({ intent: 'rent', cursor: null }), active: intent === 'rent' },
          { label: 'For Sale', href: makeFilterHref({ intent: 'buy', cursor: null }), active: intent === 'buy' },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              item.active
                ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                : 'bg-white border-[#E6E9EF] text-[#5E687A] hover:text-[#0B1324]'
            }`}
          >
            {item.label}
          </Link>
        ))}

        <span className="h-5 w-px bg-[#DCE2EC] mx-1 hidden sm:inline-block" aria-hidden="true" />

        {(['all', 'Flat', 'House', 'Room'] as const).map((type) => {
          const active = type === 'all' ? !propertyType : propertyType === type;
          return (
            <Link
              key={type}
              href={makeFilterHref({ propertyType: type, cursor: null })}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                active
                  ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                  : 'bg-white border-[#E6E9EF] text-[#5E687A] hover:text-[#0B1324]'
              }`}
            >
              {type === 'all' ? 'All Types' : type}
            </Link>
          );
        })}

        <span className="h-5 w-px bg-[#DCE2EC] mx-1 hidden sm:inline-block" aria-hidden="true" />

        {LOCALITIES.slice(0, 6).map((loc) => {
          const active = locality === loc;
          return (
            <Link
              key={loc}
              href={`/locations/${slugifyLocality(loc)}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                active
                  ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                  : 'bg-white border-[#E6E9EF] text-[#5E687A] hover:text-[#0B1324]'
              }`}
            >
              {loc}
            </Link>
          );
        })}
      </div>

      {page.items.length === 0 ? (
        <div className="bg-[#F7F8FA] rounded-3xl border border-[#E6E9EF] p-10 text-center space-y-3">
          <p className="font-display text-lg font-bold text-[#0B1324]">
            No verified properties match these filters yet
          </p>
          <p className="text-sm text-[#5E687A] max-w-md mx-auto">
            Post your requirement and verified area specialists will pitch matching unlisted inventory.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/seeker/requirements/new"
              className="px-5 py-2.5 rounded-xl bg-[#1A56FF] text-white text-sm font-semibold"
            >
              Post Requirement
            </Link>
            <Link
              href="/properties"
              className="px-4 py-2.5 rounded-xl bg-white border border-[#E6E9EF] text-sm font-semibold text-[#0B1324]"
            >
              Clear Filters
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {page.items.map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              priority={index < 3}
              isSaved={savedIds.includes(property.id)}
            />
          ))}
        </div>
      )}

      {(cursor || page.nextCursor) && (
        <div className="flex items-center justify-center gap-3 pt-2">
          {cursor && (
            <Link
              href={makeFilterHref({ cursor: null })}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] border border-[#E6E9EF] text-sm font-semibold text-[#0B1324]"
            >
              First Page
            </Link>
          )}
          {page.nextCursor && (
            <Link
              href={makeFilterHref({ cursor: page.nextCursor })}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold"
            >
              Next Page →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
