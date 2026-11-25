'use client';

import { useState } from 'react';
import { CheckCircle2, Edit3, Eye, Plus, Trash2 } from 'lucide-react';
import type { Property, PropertyAvailability, Requirement } from '@/types';
import {
  countMatchingRequirementsForProperty,
  formatINR,
  formatRelativeDate,
} from '@/lib/matching';
import { PropertyImage } from '@/components/PropertyImage';

interface BrokerInventoryViewProps {
  inventory: Property[];
  requirements: Requirement[];
  onListNewProperty: () => void;
  onEditProperty: (property: Property) => void;
  onViewProperty: (property: Property) => void;
  onUpdateProperty: (id: string, updates: Partial<Property>) => Promise<void>;
  onDeleteProperty: (id: string) => Promise<void>;
}

type InventoryFilter = 'all' | 'available' | 'draft' | 'rented' | 'sold' | 'inactive';

const FILTER_TABS: Array<{ id: InventoryFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Active' },
  { id: 'draft', label: 'Draft' },
  { id: 'rented', label: 'Rented' },
  { id: 'sold', label: 'Sold' },
  { id: 'inactive', label: 'Inactive' },
];

export function BrokerInventoryView({
  inventory,
  requirements,
  onListNewProperty,
  onEditProperty,
  onViewProperty,
  onUpdateProperty,
  onDeleteProperty,
}: BrokerInventoryViewProps) {
  const [filter, setFilter] = useState<InventoryFilter>('all');

  const counts: Record<InventoryFilter, number> = {
    all: inventory.length,
    available: inventory.filter((p) => p.availability === 'available').length,
    draft: inventory.filter((p) => p.availability === 'draft').length,
    rented: inventory.filter((p) => p.availability === 'rented').length,
    sold: inventory.filter((p) => p.availability === 'sold').length,
    inactive: inventory.filter((p) => p.availability === 'inactive').length,
  };

  const visibleInventory =
    filter === 'all' ? inventory : inventory.filter((p) => p.availability === filter);

  const statusDisplay = (status: PropertyAvailability) => {
    if (status === 'available') return { text: 'Active', cls: 'bg-white/95 text-emerald-700' };
    if (status === 'draft') return { text: 'Draft', cls: 'bg-amber-50 text-amber-800' };
    if (status === 'rented') return { text: 'Rented', cls: 'bg-[#0B1324]/90 text-white' };
    if (status === 'sold') return { text: 'Sold', cls: 'bg-[#0B1324]/90 text-white' };
    return { text: 'Inactive', cls: 'bg-[#5E687A] text-white' };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 md:pb-14">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1324]">
            My Properties
          </h1>
          <p className="mt-1 text-sm text-[#5E687A]">
            Active properties are automatically scored against incoming customer requirements. Rented, sold, draft, or inactive listings are excluded from recommendations.
          </p>
        </div>

        <button
          type="button"
          onClick={onListNewProperty}
          className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>List a Property</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-2" role="tablist" aria-label="Property status filters">
        {FILTER_TABS.map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(tab.id)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl border text-xs font-semibold tabular-nums transition-colors ${
                active
                  ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                  : 'bg-white border-[#E6E9EF] text-[#5E687A] hover:text-[#0B1324]'
              }`}
            >
              {tab.label} ({counts[tab.id]})
            </button>
          );
        })}
      </div>

      {visibleInventory.length === 0 ? (
        <div className="mt-8 bg-[#F7F8FA] rounded-3xl border border-[#E6E9EF] p-10 text-center">
          <h2 className="font-display text-lg font-bold text-[#0B1324]">
            {inventory.length === 0
              ? 'Your property inventory is empty'
              : `No ${filter === 'available' ? 'active' : filter} properties`}
          </h2>
          <p className="mt-1.5 text-sm text-[#5E687A] max-w-md mx-auto">
            List residences or commercial spaces you represent so Hemlo can match them with active customer briefs.
          </p>
          <button
            type="button"
            onClick={onListNewProperty}
            className="mt-5 px-5 py-2.5 rounded-xl bg-[#1A56FF] text-white text-sm font-semibold"
          >
            + List a Property
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleInventory.map((prop) => {
            const matchCount = countMatchingRequirementsForProperty(prop, requirements);
            const badge = statusDisplay(prop.availability);

            return (
              <article
                key={prop.id}
                className="bg-white rounded-2xl border border-[#E6E9EF] overflow-hidden shadow-[0_4px_20px_-2px_rgba(11,19,36,0.04)] flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[4/3] bg-[#F2F4F8] relative">
                    <PropertyImage
                      src={prop.images[0]}
                      alt={prop.title}
                      className="w-full h-full"
                    />
                    <span
                      className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${badge.cls}`}
                    >
                      {badge.text}
                    </span>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-display text-lg font-bold text-[#0B1324] tabular-nums">
                        {formatINR(prop.price, prop.intent)}
                        {prop.intent === 'rent' ? '/mo' : ''}
                      </p>
                      <span className="text-xs text-[#5E687A] tabular-nums">
                        Listed {formatRelativeDate(prop.createdAt)}
                      </span>
                    </div>

                    <h2 className="mt-1 font-display text-base font-bold text-[#0B1324] line-clamp-1">
                      {prop.title}
                    </h2>
                    <p className="text-xs text-[#5E687A] mt-0.5 line-clamp-1">
                      {prop.locality} · {prop.address}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5E687A] tabular-nums">
                      <span>{prop.bedrooms} BHK</span>
                      <span aria-hidden="true">·</span>
                      <span>{prop.listingCategory || prop.propertyType}</span>
                      <span aria-hidden="true">·</span>
                      <span>{prop.furnishing}</span>
                    </div>

                    <p className="mt-2.5 text-xs font-semibold text-[#1A56FF] tabular-nums">
                      {prop.availability === 'available'
                        ? `${matchCount} matching customer ${matchCount === 1 ? 'requirement' : 'requirements'}`
                        : 'Excluded from new recommendations'}
                    </p>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="px-4 sm:px-5 py-3.5 border-t border-[#E6E9EF] space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onViewProperty(prop)}
                      aria-label={`View ${prop.title}`}
                      className="h-9 px-3 rounded-xl border border-[#E6E9EF] text-xs font-semibold text-[#0B1324] hover:bg-[#F7F8FA] inline-flex items-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditProperty(prop)}
                      aria-label={`Edit ${prop.title}`}
                      className="h-9 px-3 rounded-xl border border-[#E6E9EF] text-xs font-semibold text-[#0B1324] hover:bg-[#F7F8FA] inline-flex items-center gap-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteProperty(prop.id)}
                      aria-label={`Delete ${prop.title}`}
                      className="h-9 px-2.5 rounded-xl border border-[#E6E9EF] text-xs font-semibold text-[#5E687A] hover:text-red-600 inline-flex items-center gap-1 ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                  {/* Quick Lifecycle Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    {prop.availability !== 'available' && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateProperty(prop.id, { availability: 'available' })
                        }
                        className="px-2.5 py-1 rounded-lg bg-[#EEF3FF] text-[#1A56FF] font-semibold inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{prop.availability === 'draft' ? 'Publish' : 'Activate'}</span>
                      </button>
                    )}

                    {prop.availability !== 'rented' && prop.intent === 'rent' && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateProperty(prop.id, { availability: 'rented' })
                        }
                        className="px-2.5 py-1 rounded-lg bg-[#F7F8FA] hover:bg-[#ECEFF4] text-[#0B1324] font-semibold"
                      >
                        Mark as Rented
                      </button>
                    )}

                    {prop.availability !== 'sold' && prop.intent === 'buy' && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateProperty(prop.id, { availability: 'sold' })
                        }
                        className="px-2.5 py-1 rounded-lg bg-[#F7F8FA] hover:bg-[#ECEFF4] text-[#0B1324] font-semibold"
                      >
                        Mark as Sold
                      </button>
                    )}

                    {prop.availability === 'available' && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateProperty(prop.id, { availability: 'inactive' })
                        }
                        className="px-2.5 py-1 rounded-lg bg-[#F7F8FA] hover:bg-[#ECEFF4] text-[#5E687A] font-semibold"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
