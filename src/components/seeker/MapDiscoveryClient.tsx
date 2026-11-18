'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Map as MapIcon, Search } from 'lucide-react';
import type { Property, PropertyCategory, SearchFilters } from '@/types';
import { LOCALITIES, filterProperties } from '@/lib/matching';
import { apiClient } from '@/lib/api/client';
import { useSession } from '@/components/providers/AppProviders';
import { PropertyCard } from '@/components/PropertyCard';

const InteractiveMap = dynamic(
  () => import('@/components/InteractiveMap').then((m) => m.InteractiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[460px] rounded-2xl bg-[#EEF1F5] border border-[#E6E9EF] animate-pulse flex items-center justify-center text-xs font-medium text-[#5E687A]">
        Loading interactive neighbourhood map…
      </div>
    ),
  }
);

interface MapDiscoveryClientProps {
  initialFilters: SearchFilters;
  initialProperties: Property[];
  initialSavedIds: string[];
}

export function MapDiscoveryClient({
  initialFilters,
  initialProperties,
  initialSavedIds,
}: MapDiscoveryClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();

  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [mobileMode, setMobileMode] = useState<'map' | 'list'>('map');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    initialProperties[0]?.id || null
  );
  const [savedIds, setSavedIds] = useState<string[]>(initialSavedIds);

  useEffect(() => {
    setSavedIds(initialSavedIds);
  }, [initialSavedIds]);

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

  const properties = useMemo(
    () => filterProperties(propertiesData.items, filters),
    [propertiesData.items, filters]
  );

  useEffect(() => {
    if (
      properties.length > 0 &&
      (!selectedPropertyId || !properties.some((p) => p.id === selectedPropertyId))
    ) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const handleToggleSave = async (propertyId: string) => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent('/map')}`);
      return;
    }
    try {
      const res = await apiClient.toggleSaved(propertyId);
      setSavedIds(res.savedIds);
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8">
      {/* Top Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-[#E6E9EF] p-3 sm:p-4 shadow-sm mb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/"
            className="min-h-[40px] px-3 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] text-xs font-semibold text-[#0B1324] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Filters</span>
          </Link>

          <div className="relative flex-1 min-w-[160px]">
            <Search className="h-4 w-4 text-[#9AA5B5] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filters.query}
              onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
              placeholder="Search street, area, title..."
              aria-label="Search properties by keyword"
              className="w-full min-h-[40px] pl-9 pr-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] placeholder:text-[#9AA5B5] focus:outline-none focus:border-[#1A56FF] focus:bg-white"
            />
          </div>

          <select
            aria-label="Filter by locality"
            value={filters.locality}
            onChange={(e) => setFilters((prev) => ({ ...prev, locality: e.target.value }))}
            className="min-h-[40px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-xs sm:text-sm font-medium text-[#0B1324] focus:outline-none focus:border-[#1A56FF]"
          >
            <option value="All">All Localities</option>
            {LOCALITIES.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <div className="flex items-center bg-[#F7F8FA] border border-[#E6E9EF] rounded-xl p-0.5">
            {(['rent', 'buy'] as const).map((intent) => (
              <button
                key={intent}
                type="button"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, intent, budgetMax: null }))
                }
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  filters.intent === intent
                    ? 'bg-white text-[#0B1324] shadow-xs'
                    : 'text-[#5E687A] hover:text-[#0B1324]'
                }`}
              >
                {intent === 'rent' ? 'Rent' : 'Buy'}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by property type"
            value={filters.propertyType}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                propertyType: e.target.value as PropertyCategory | 'All',
              }))
            }
            className="min-h-[40px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-xs sm:text-sm font-medium text-[#0B1324] focus:outline-none focus:border-[#1A56FF]"
          >
            <option value="All">All Types</option>
            <option value="Flat">Flat</option>
            <option value="House">House</option>
            <option value="Room">Room</option>
          </select>

          <select
            aria-label="Filter by bedrooms"
            value={String(filters.bedrooms)}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                bedrooms: e.target.value === 'All' ? 'All' : Number(e.target.value),
              }))
            }
            className="min-h-[40px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-xs sm:text-sm font-medium text-[#0B1324] focus:outline-none focus:border-[#1A56FF]"
          >
            <option value="All">Any BHK</option>
            <option value="1">1 BHK</option>
            <option value="2">2 BHK</option>
            <option value="3">3 BHK</option>
            <option value="4">4+ BHK</option>
          </select>
        </div>
      </div>

      {/* Desktop Split View (List Left + Interactive Map Right) / Mobile Toggled View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div
          className={`lg:col-span-5 space-y-4 ${
            mobileMode === 'list' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#0B1324] tabular-nums">
              {properties.length} {properties.length === 1 ? 'property' : 'properties'} found
            </p>
            <button
              type="button"
              onClick={() => setMobileMode('map')}
              className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#0B1324] text-white text-xs font-semibold"
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>Show Map</span>
            </button>
          </div>

          {properties.length === 0 ? (
            <div className="bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-6 text-center">
              <p className="text-sm font-semibold text-[#0B1324]">
                No properties match your map filters
              </p>
              <p className="mt-1 text-xs text-[#5E687A]">
                Post your requirement so local brokers can pitch unlisted matches.
              </p>
              <Link
                href="/seeker/requirements/new"
                className="inline-block mt-4 px-4 py-2.5 rounded-xl bg-[#1A56FF] text-white text-xs font-semibold hover:bg-[#1244D8]"
              >
                Post your requirements
              </Link>
            </div>
          ) : (
            <div className="space-y-4 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-1">
              {properties.map((property, index) => (
                <div
                  key={property.id}
                  onMouseEnter={() => setSelectedPropertyId(property.id)}
                >
                  <PropertyCard
                    property={property}
                    priority={index < 2}
                    highlight={selectedPropertyId === property.id}
                    isSaved={savedIds.includes(property.id)}
                    onToggleSave={handleToggleSave}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className={`lg:col-span-7 lg:sticky lg:top-20 h-[66vh] min-h-[480px] lg:h-[calc(100vh-190px)] ${
            mobileMode === 'map' ? 'block' : 'hidden lg:block'
          }`}
        >
          <InteractiveMap
            properties={properties}
            selectedPropertyId={selectedPropertyId}
            onSelectProperty={(prop) => setSelectedPropertyId(prop.id)}
            onViewDetails={(prop) => router.push(`/properties/${prop.id}`)}
            showListButton={true}
            onShowList={() => setMobileMode('list')}
          />
        </div>
      </div>
    </div>
  );
}
