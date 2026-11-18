'use client';

import { Calendar } from 'lucide-react';
import type { Property, Visit } from '@/types';
import { PropertyCard } from '@/components/PropertyCard';

interface SavedAndVisitsViewProps {
  savedProperties: Property[];
  visits: Visit[];
  allProperties: Property[];
  savedIds: string[];
  onToggleSave: (propertyId: string) => void;
  onViewDetails: (property: Property) => void;
  onExploreSearch: () => void;
  onCancelVisit: (visitId: string) => Promise<void>;
}

export function SavedAndVisitsView({
  savedProperties,
  visits,
  allProperties,
  savedIds,
  onToggleSave,
  onViewDetails,
  onExploreSearch,
  onCancelVisit,
}: SavedAndVisitsViewProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-24 md:pb-12 space-y-10">
      {/* Scheduled Visits */}
      <section>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1324]">
          Saved Homes & Visits
        </h1>
        <p className="mt-1 text-sm text-[#5E687A]">
          Shortlisted properties and upcoming property tours.
        </p>

        <h2 className="mt-7 font-display text-lg font-bold text-[#0B1324]">
          Scheduled Property Visits ({visits.length})
        </h2>
        {visits.length === 0 ? (
          <div className="mt-3 bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-6 text-sm text-[#5E687A]">
            No visits scheduled yet. Open any property or proposal to pick a tour date.
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            {visits.map((visit) => {
              const property = allProperties.find((p) => p.id === visit.propertyId);
              if (!property) return null;
              return (
                <div
                  key={visit.id}
                  className="bg-white rounded-2xl border border-[#E6E9EF] p-4 sm:p-5 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[#1A56FF] font-semibold tabular-nums">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {visit.date} · {visit.timeSlot}
                      </span>
                      <span className="text-[#5E687A] capitalize">· {visit.status}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onViewDetails(property)}
                      className="mt-1 font-display text-base font-bold text-[#0B1324] hover:text-[#1A56FF] text-left truncate block w-full"
                    >
                      {property.title}
                    </button>
                    <p className="text-xs text-[#5E687A] truncate">
                      {property.address} · Broker: {property.brokerName}
                    </p>
                  </div>

                  {visit.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => onCancelVisit(visit.id)}
                      className="px-3 py-1.5 rounded-xl border border-[#E6E9EF] text-xs font-semibold text-[#5E687A] hover:text-red-600 shrink-0"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Saved Properties */}
      <section>
        <h2 className="font-display text-lg font-bold text-[#0B1324]">
          Saved Properties ({savedProperties.length})
        </h2>
        {savedProperties.length === 0 ? (
          <div className="mt-3 bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-8 text-center">
            <p className="text-sm font-semibold text-[#0B1324]">
              You haven’t saved any properties yet
            </p>
            <button
              type="button"
              onClick={onExploreSearch}
              className="mt-4 px-5 py-2.5 rounded-xl bg-[#1A56FF] text-white text-xs font-semibold hover:bg-[#1244D8]"
            >
              Explore Properties
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isSaved={savedIds.includes(property.id)}
                onToggleSave={onToggleSave}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
