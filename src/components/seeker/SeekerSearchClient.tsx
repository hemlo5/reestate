'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Building2, MapPin, Play, Search, SlidersHorizontal } from 'lucide-react';
import type {
  FurnishingPreference,
  ListingIntent,
  Property,
  PropertyCategory,
  SearchFilters,
} from '@/types';
import { LOCALITIES, filterProperties, formatINR, slugifyLocality } from '@/lib/matching';
import { apiClient } from '@/lib/api/client';
import { useSession } from '@/components/providers/AppProviders';
import { PropertyCard } from '@/components/PropertyCard';

const FirstTimeDemoModal = dynamic(
  () => import('@/components/FirstTimeDemoModal').then((m) => m.FirstTimeDemoModal),
  { ssr: false }
);

const DEMO_SEEN_KEY = 'housed_demo_seen_v1';

const RENT_BUDGET_OPTIONS = [
  { label: 'Any Budget', value: null },
  { label: 'Up to ₹20,000/mo', value: 20000 },
  { label: 'Up to ₹30,000/mo', value: 30000 },
  { label: 'Up to ₹45,000/mo', value: 45000 },
  { label: 'Up to ₹75,000/mo', value: 75000 },
];

const BUY_BUDGET_OPTIONS = [
  { label: 'Any Budget', value: null },
  { label: 'Up to ₹1 Cr', value: 10000000 },
  { label: 'Up to ₹1.5 Cr', value: 15000000 },
  { label: 'Up to ₹2 Cr', value: 20000000 },
  { label: 'Up to ₹3.5 Cr', value: 35000000 },
];

interface SeekerSearchClientProps {
  initialProperties: Property[];
  initialSavedIds: string[];
}

export function SeekerSearchClient({
  initialProperties,
  initialSavedIds,
}: SeekerSearchClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();

  const [filters, setFilters] = useState<SearchFilters>({
    locality: 'All',
    intent: 'rent',
    propertyType: 'All',
    bedrooms: 'All',
    budgetMax: null,
    furnishing: 'Any',
    query: '',
  });
  const [savedIds, setSavedIds] = useState<string[]>(initialSavedIds);
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    setSavedIds(initialSavedIds);
  }, [initialSavedIds]);

  useEffect(() => {
    const openDemo = () => setDemoOpen(true);
    window.addEventListener('housed:open-demo', openDemo);
    return () => window.removeEventListener('housed:open-demo', openDemo);
  }, []);

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(DEMO_SEEN_KEY);
      if (!seen) {
        setDemoOpen(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const closeDemo = () => {
    setDemoOpen(false);
    try {
      window.localStorage.setItem(DEMO_SEEN_KEY, '1');
    } catch {
      // Ignore
    }
  };

  const { data: propertiesData } = useQuery({
    queryKey: ['properties', 'public-all'],
    queryFn: () => apiClient.listProperties({ limit: 50 }),
    initialData: {
      items: initialProperties,
      nextCursor: null,
      total: initialProperties.length,
    },
    staleTime: 60_000,
  });

  const filteredProperties = useMemo(
    () => filterProperties(propertiesData.items, filters),
    [propertiesData.items, filters]
  );

  const budgetOptions =
    filters.intent === 'rent' ? RENT_BUDGET_OPTIONS : BUY_BUDGET_OPTIONS;

  const setIntent = (intent: ListingIntent) => {
    setFilters((prev) => ({ ...prev, intent, budgetMax: null }));
  };

  const buildFilterParams = (f: SearchFilters = filters) => {
    const qs = new URLSearchParams();
    qs.set('intent', f.intent);
    if (f.locality !== 'All') qs.set('locality', f.locality);
    if (f.propertyType !== 'All') qs.set('propertyType', f.propertyType);
    if (f.bedrooms !== 'All') qs.set('bedrooms', String(f.bedrooms));
    if (f.budgetMax) qs.set('budgetMax', String(f.budgetMax));
    if (f.furnishing !== 'Any') qs.set('furnishing', f.furnishing);
    return qs.toString();
  };

  const goToPostRequirement = (prefill: SearchFilters = filters) => {
    closeDemo();
    router.push(`/seeker/requirements/new?${buildFilterParams(prefill)}`);
  };

  const goToMap = (prefill: SearchFilters = filters) => {
    router.push(`/map?${buildFilterParams(prefill)}`);
  };

  const handleToggleSave = async (propertyId: string) => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent('/')}`);
      return;
    }
    try {
      const res = await apiClient.toggleSaved(propertyId);
      setSavedIds(res.savedIds);
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    } catch {
      // ignore transient error
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-24 md:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left / Primary Search Module */}
        <section
          aria-label="Property search and requirement builder"
          className="lg:col-span-7 bg-white rounded-3xl border border-[#E6E9EF] shadow-[0_12px_36px_-8px_rgba(11,19,36,0.08)] p-4 sm:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] sm:text-xs font-semibold tracking-wide text-[#1A56FF]">
                Reverse Real Estate Marketplace
              </p>
              <h1 className="mt-1 font-display text-xl sm:text-3xl font-bold tracking-[-0.02em] text-[#0B1324] text-balance">
                Find your next home, or let verified brokers pitch to you.
              </h1>
            </div>
          </div>

          {/* Rent / Buy Segmented Toggle */}
          <div className="mt-4 sm:mt-6">
            <div
              className="grid grid-cols-2 p-1 bg-[#F7F8FA] border border-[#E6E9EF] rounded-2xl"
              role="group"
              aria-label="Rent or Buy"
            >
              {(['rent', 'buy'] as const).map((intent) => {
                const active = filters.intent === intent;
                return (
                  <button
                    key={intent}
                    type="button"
                    onClick={() => setIntent(intent)}
                    className={`min-h-[40px] sm:min-h-[44px] py-2 text-sm font-semibold rounded-xl transition-all ${
                      active
                        ? 'bg-white text-[#0B1324] shadow-sm'
                        : 'text-[#5E687A] hover:text-[#0B1324]'
                    }`}
                  >
                    {intent === 'rent' ? 'Rent' : 'Buy'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location Selector */}
          <div className="mt-3.5 sm:mt-5">
            <label
              htmlFor="search-locality"
              className="block text-xs font-semibold text-[#5E687A] mb-1.5 sm:mb-2"
            >
              Preferred Location
            </label>
            <div className="relative">
              <MapPin
                className="h-4 w-4 text-[#1A56FF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={2}
              />
              <select
                id="search-locality"
                value={filters.locality}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, locality: e.target.value }))
                }
                className="w-full min-h-[44px] sm:min-h-[48px] pl-10 pr-4 bg-[#F7F8FA] border border-[#E6E9EF] rounded-xl text-sm font-medium text-[#0B1324] focus:outline-none focus:border-[#1A56FF] focus:bg-white transition-colors"
              >
                <option value="All">All Bengaluru & Mumbai Localities</option>
                {LOCALITIES.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Property Type: Flat / House / Room */}
          <div className="mt-3.5 sm:mt-5">
            <span className="block text-xs font-semibold text-[#5E687A] mb-1.5 sm:mb-2">
              Property Type
            </span>
            <div className="grid grid-cols-4 gap-2">
              {(['All', 'Flat', 'House', 'Room'] as Array<PropertyCategory | 'All'>).map(
                (type) => {
                  const active = filters.propertyType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, propertyType: type }))
                      }
                      className={`min-h-[40px] sm:min-h-[44px] px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                          : 'bg-white border-[#E6E9EF] text-[#5E687A] hover:border-[#C5CCD8] hover:text-[#0B1324]'
                      }`}
                    >
                      {type === 'All' ? 'Any' : type}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Bedrooms Selection */}
          <div className="mt-3.5 sm:mt-5">
            <span className="block text-xs font-semibold text-[#5E687A] mb-1.5 sm:mb-2">
              Bedrooms (BHK)
            </span>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {(['All', 1, 2, 3, 4] as Array<number | 'All'>).map((bhk) => {
                const active = filters.bedrooms === bhk;
                return (
                  <button
                    key={String(bhk)}
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, bedrooms: bhk }))}
                    className={`min-h-[40px] sm:min-h-[44px] px-1.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border tabular-nums transition-colors ${
                      active
                        ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                        : 'bg-white border-[#E6E9EF] text-[#5E687A] hover:border-[#C5CCD8] hover:text-[#0B1324]'
                    }`}
                  >
                    {bhk === 'All' ? 'Any' : bhk === 4 ? '4+' : `${bhk} BHK`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget & Furnishing Row */}
          <div className="mt-3.5 sm:mt-5 grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label
                htmlFor="search-budget"
                className="block text-xs font-semibold text-[#5E687A] mb-1.5 sm:mb-2"
              >
                Max Budget
              </label>
              <select
                id="search-budget"
                value={filters.budgetMax === null ? '' : String(filters.budgetMax)}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    budgetMax: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="w-full min-h-[42px] sm:min-h-[46px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-xs sm:text-sm font-medium text-[#0B1324] focus:outline-none focus:border-[#1A56FF] focus:bg-white"
              >
                {budgetOptions.map((opt) => (
                  <option
                    key={opt.label}
                    value={opt.value === null ? '' : String(opt.value)}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="search-furnishing"
                className="block text-xs font-semibold text-[#5E687A] mb-1.5 sm:mb-2"
              >
                Furnishing
              </label>
              <select
                id="search-furnishing"
                value={filters.furnishing}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    furnishing: e.target.value as FurnishingPreference,
                  }))
                }
                className="w-full min-h-[42px] sm:min-h-[46px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-xs sm:text-sm font-medium text-[#0B1324] focus:outline-none focus:border-[#1A56FF] focus:bg-white"
              >
                <option value="Any">Any Furnishing</option>
                <option value="Furnished">Furnished</option>
                <option value="Semi-furnished">Semi-furnished</option>
                <option value="Unfurnished">Unfurnished</option>
              </select>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="mt-5 sm:mt-7 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => goToPostRequirement(filters)}
              className="flex-1 min-h-[46px] sm:min-h-[50px] px-6 py-2.5 sm:py-3 rounded-2xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm sm:text-base font-semibold shadow-[0_8px_20px_-4px_rgba(26,86,255,0.4)] transition-all flex items-center justify-center gap-2"
            >
              <span>Post your requirements</span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </button>

            <button
              type="button"
              onClick={() => goToMap(filters)}
              className="min-h-[44px] sm:min-h-[50px] px-5 py-2.5 sm:py-3 rounded-2xl bg-[#F7F8FA] hover:bg-[#ECEFF4] border border-[#E6E9EF] text-[#0B1324] text-sm font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Search className="h-4 w-4 text-[#1A56FF]" strokeWidth={2} />
              <span>Search ({filteredProperties.length})</span>
            </button>
          </div>
        </section>

        {/* Right Column */}
        <aside className="lg:col-span-5 flex flex-col gap-6">
          <div className="hidden lg:block bg-[#F7F8FA] rounded-3xl border border-[#E6E9EF] p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-[#0B1324]">
                How Hemlo flips the search
              </h2>
              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A56FF] hover:text-[#1244D8] whitespace-nowrap shrink-0"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Watch demo</span>
              </button>
            </div>
            <ol className="mt-5 space-y-5">
              <li className="flex gap-3.5">
                <span className="h-7 w-7 rounded-full bg-[#1A56FF] text-white text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                  1
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#0B1324]">
                    Describe your ideal home once
                  </p>
                  <p className="mt-0.5 text-sm text-[#5E687A]">
                    Set your locality, budget, BHK, and move-in timeline in under two minutes.
                  </p>
                </div>
              </li>
              <li className="flex gap-3.5">
                <span className="h-7 w-7 rounded-full bg-white border border-[#E6E9EF] text-[#0B1324] text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                  2
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#0B1324]">
                    Verified local brokers match inventory
                  </p>
                  <p className="mt-0.5 text-sm text-[#5E687A]">
                    Area specialists pitch off-market and verified homes scored against your exact criteria.
                  </p>
                </div>
              </li>
              <li className="flex gap-3.5">
                <span className="h-7 w-7 rounded-full bg-white border border-[#E6E9EF] text-[#0B1324] text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                  3
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#0B1324]">
                    Compare proposals & schedule visits
                  </p>
                  <p className="mt-0.5 text-sm text-[#5E687A]">
                    Review transparent brokerage fees side-by-side and book tours directly.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="bg-white rounded-3xl border border-[#E6E9EF] p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-bold text-[#0B1324]">
                Popular neighbourhoods
              </h2>
              <Link
                href={`/map?${buildFilterParams()}`}
                className="text-xs font-semibold text-[#1A56FF] hover:text-[#1244D8] inline-flex items-center gap-1"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Open Map</span>
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {LOCALITIES.slice(0, 6).map((loc) => {
                const active = filters.locality === loc;
                return (
                  <Link
                    key={loc}
                    href={`/locations/${slugifyLocality(loc)}`}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      active
                        ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                        : 'bg-[#F7F8FA] border-[#E6E9EF] text-[#0B1324] hover:border-[#1A56FF]'
                    }`}
                  >
                    {loc}
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Matching Properties Preview Section */}
      <section className="mt-12">
        <div className="flex items-baseline justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0B1324]">
              {filters.locality === 'All'
                ? `Available ${filters.intent === 'rent' ? 'rentals' : 'homes for sale'}`
                : `${filters.locality} ${filters.intent === 'rent' ? 'rentals' : 'homes'}`}
            </h2>
            <p className="mt-1 text-sm text-[#5E687A] tabular-nums">
              {filteredProperties.length} verified{' '}
              {filteredProperties.length === 1 ? 'property' : 'properties'} matching
              current filters
              {filters.budgetMax
                ? ` · Up to ${formatINR(filters.budgetMax, filters.intent)}`
                : ''}
            </p>
          </div>
          <Link
            href={`/map?${buildFilterParams()}`}
            className="text-sm font-semibold text-[#1A56FF] hover:text-[#1244D8] whitespace-nowrap shrink-0"
          >
            Explore on Map →
          </Link>
        </div>

        {filteredProperties.length === 0 ? (
          <div className="bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-8 text-center">
            <p className="font-display text-base font-semibold text-[#0B1324]">
              No direct inventory matches all selected filters yet
            </p>
            <p className="mt-1.5 text-sm text-[#5E687A] max-w-md mx-auto">
              Post your requirement and let local brokers pitch off-market properties that fit your criteria.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => goToPostRequirement(filters)}
                className="px-5 py-2.5 rounded-xl bg-[#1A56FF] text-white text-sm font-semibold hover:bg-[#1244D8]"
              >
                Post this requirement
              </button>
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    locality: 'All',
                    intent: filters.intent,
                    propertyType: 'All',
                    bedrooms: 'All',
                    budgetMax: null,
                    furnishing: 'Any',
                    query: '',
                  })
                }
                className="px-4 py-2.5 rounded-xl bg-white border border-[#E6E9EF] text-sm font-semibold text-[#0B1324] hover:bg-[#F7F8FA]"
              >
                Reset filters
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.slice(0, 6).map((property, index) => (
              <PropertyCard
                key={property.id}
                property={property}
                priority={index < 3}
                isSaved={savedIds.includes(property.id)}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/properties"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A56FF] hover:text-[#1244D8]"
          >
            <span>Browse full verified property directory</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Broker Entry Point */}
      <section
        aria-label="Broker onboarding entry point"
        className="mt-12 bg-[#F7F8FA] rounded-3xl border border-[#E6E9EF] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="flex items-start gap-4 max-w-2xl">
          <div className="h-12 w-12 rounded-2xl bg-white border border-[#E6E9EF] flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6 text-[#1A56FF]" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0B1324]">
              Are you a property broker?
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-[#5E687A] leading-relaxed">
              Join Hemlo, showcase your properties and connect with people actively looking for homes.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/broker/onboarding"
            className="min-h-[46px] px-6 py-2.5 rounded-2xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <span>Join as a Broker</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login?role=broker"
            className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-white hover:bg-[#ECEFF4] border border-[#E6E9EF] text-[#0B1324] text-sm font-semibold transition-colors whitespace-nowrap"
          >
            Existing broker? Sign in
          </Link>
        </div>
      </section>

      <FirstTimeDemoModal
        open={demoOpen}
        onClose={closeDemo}
        onStartPosting={() => goToPostRequirement(filters)}
      />
    </div>
  );
}
