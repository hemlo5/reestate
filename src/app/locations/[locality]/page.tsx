import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, MapPin } from 'lucide-react';
import { getDb, getSessionUser } from '@/lib/db';
import { LOCALITIES, findLocalityBySlug, slugifyLocality } from '@/lib/matching';
import { PropertyCard } from '@/components/PropertyCard';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locality: string }>;
}): Promise<Metadata> {
  const { locality: slug } = await params;
  const locality = findLocalityBySlug(slug);
  if (!locality) {
    return { title: 'Neighbourhood Not Found' };
  }

  const title = `Homes for Rent & Sale in ${locality}`;
  const description = `Explore verified apartments, villas, and rooms in ${locality}, or post your housing requirement for local brokers to pitch matched options.`;

  return {
    title,
    description,
    alternates: { canonical: `/locations/${slugifyLocality(locality)}` },
    openGraph: { title, description },
  };
}

export default async function LocalityPage({
  params,
}: {
  params: Promise<{ locality: string }>;
}) {
  const { locality: slug } = await params;
  const locality = findLocalityBySlug(slug);
  if (!locality) {
    notFound();
  }

  const db = getDb();
  const [user, page] = await Promise.all([
    getSessionUser(),
    db.listProperties({ locality, limit: 24 }),
  ]);
  const savedIds = user ? await db.getSavedPropertyIds(user.id) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-28 md:pb-14 space-y-8">
      <div className="bg-[#F7F8FA] rounded-3xl border border-[#E6E9EF] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-[#1A56FF] inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span>Neighbourhood Guide & Verified Listings</span>
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#0B1324]">
            Properties in {locality}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#5E687A]">
            Browse {page.total} active verified{' '}
            {page.total === 1 ? 'listing' : 'listings'} in {locality}, or post your brief so area specialists pitch off-market homes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href={`/seeker/requirements/new?locality=${encodeURIComponent(locality)}`}
            className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <span>Post Requirement in {locality}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/map?locality=${encodeURIComponent(locality)}`}
            className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-white hover:bg-[#ECEFF4] border border-[#E6E9EF] text-sm font-semibold text-[#0B1324]"
          >
            View on Map
          </Link>
        </div>
      </div>

      {page.items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E6E9EF] p-8 text-center space-y-3">
          <p className="font-display text-lg font-bold text-[#0B1324]">
            No public listings in {locality} right now
          </p>
          <p className="text-sm text-[#5E687A] max-w-md mx-auto">
            Brokers covering {locality} receive instant notifications when you publish a housing requirement.
          </p>
          <Link
            href={`/seeker/requirements/new?locality=${encodeURIComponent(locality)}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A56FF] text-white text-sm font-semibold"
          >
            <span>Post Brief for {locality}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {page.items.map((property, idx) => (
            <PropertyCard
              key={property.id}
              property={property}
              priority={idx < 3}
              isSaved={savedIds.includes(property.id)}
            />
          ))}
        </div>
      )}

      <section className="pt-4 border-t border-[#E6E9EF]">
        <h2 className="font-display text-base font-bold text-[#0B1324] mb-3">
          Explore Other Neighbourhoods
        </h2>
        <div className="flex flex-wrap gap-2">
          {LOCALITIES.filter((l) => l !== locality).map((loc) => (
            <Link
              key={loc}
              href={`/locations/${slugifyLocality(loc)}`}
              className="px-3.5 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#EEF3FF] border border-[#E6E9EF] hover:border-[#1A56FF] text-xs font-semibold text-[#0B1324] hover:text-[#1A56FF] transition-colors"
            >
              {loc}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
