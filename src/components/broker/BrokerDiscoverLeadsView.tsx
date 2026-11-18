'use client';

import { useState } from 'react';
import { Calendar, CheckCircle2, Lock, Search, Sparkles, X } from 'lucide-react';
import type {
  FurnishingPreference,
  ListingIntent,
  Property,
  PropertyCategory,
  Proposal,
  Requirement,
  User,
} from '@/types';
import {
  LOCALITIES,
  formatBudgetRange,
  formatINR,
  formatRelativeDate,
  rankPropertiesForRequirement,
} from '@/lib/matching';

interface BrokerDiscoverLeadsViewProps {
  broker: User;
  requirements: Requirement[];
  inventory: Property[];
  proposals: Proposal[];
  onSubmitProposal: (requirement: Requirement) => void;
}

export function BrokerDiscoverLeadsView({
  broker,
  requirements,
  inventory,
  proposals,
  onSubmitProposal,
}: BrokerDiscoverLeadsViewProps) {
  const [query, setQuery] = useState('');
  const [locality, setLocality] = useState<string>('All');
  const [intent, setIntent] = useState<ListingIntent | 'all'>('all');
  const [propertyType, setPropertyType] = useState<PropertyCategory | 'All'>('All');
  const [bedrooms, setBedrooms] = useState<number | 'All'>('All');
  const [furnishing, setFurnishing] = useState<FurnishingPreference>('Any');
  const [maxBudget, setMaxBudget] = useState<string>('');
  const [postedWindow, setPostedWindow] = useState<'all' | '7d' | '24h'>('all');
  const [serviceAreasOnly, setServiceAreasOnly] = useState<boolean>(false);
  const [selectedLead, setSelectedLead] = useState<Requirement | null>(null);

  const operatingAreas = broker.brokerProfile?.operatingLocalities || [];
  const activeInventory = inventory.filter((p) => p.availability === 'available');

  const filteredRequirements = requirements
    .filter((req) => {
      if (req.status !== 'active') return false;
      if (intent !== 'all' && req.intent !== intent) return false;
      if (
        locality !== 'All' &&
        !req.localities.some((l) => l.toLowerCase() === locality.toLowerCase())
      ) {
        return false;
      }
      if (
        serviceAreasOnly &&
        operatingAreas.length > 0 &&
        !req.localities.some((l) =>
          operatingAreas.some((area) => area.toLowerCase() === l.toLowerCase())
        )
      ) {
        return false;
      }
      if (propertyType !== 'All' && req.propertyType !== propertyType) return false;
      if (bedrooms !== 'All') {
        if (bedrooms >= 4 ? req.bedrooms < 4 : req.bedrooms !== bedrooms) return false;
      }
      if (furnishing !== 'Any' && req.furnishing !== furnishing) return false;
      if (maxBudget && Number(maxBudget) > 0 && req.budgetMin > Number(maxBudget)) {
        return false;
      }
      if (postedWindow !== 'all') {
        const ageHours = (Date.now() - new Date(req.createdAt).getTime()) / (1000 * 60 * 60);
        if (postedWindow === '24h' && ageHours > 24) return false;
        if (postedWindow === '7d' && ageHours > 24 * 7) return false;
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${req.id} ${req.localities.join(' ')} ${req.notes} ${req.propertyType} ${req.amenities.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 md:pb-14">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1324]">
            Find Leads
          </h1>
          <p className="mt-1 text-sm text-[#5E687A]">
            Discover home seekers actively posting property requirements and pitch matched inventory.
          </p>
        </div>

        <p className="text-xs font-medium text-[#5E687A] inline-flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-[#1A56FF]" />
          <span>Customer contact details stay private until proposal consent</span>
        </p>
      </div>

      {/* Filters Bar */}
      <div className="mt-6 bg-white rounded-2xl border border-[#E6E9EF] p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="relative sm:col-span-2">
            <Search className="h-4 w-4 text-[#9AA5B5] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search requirement ID, locality, notes..."
              aria-label="Search customer requirements"
              className="w-full min-h-[42px] pl-9 pr-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] focus:outline-none focus:border-[#1A56FF] focus:bg-white"
            />
          </div>

          <select
            aria-label="Filter leads by locality"
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            className="w-full min-h-[42px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm font-medium text-[#0B1324]"
          >
            <option value="All">All Localities</option>
            {LOCALITIES.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter leads by rent or buy"
            value={intent}
            onChange={(e) => setIntent(e.target.value as ListingIntent | 'all')}
            className="w-full min-h-[42px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm font-medium text-[#0B1324]"
          >
            <option value="all">Rent & Buy</option>
            <option value="rent">Rent Only</option>
            <option value="buy">Buy Only</option>
          </select>

          <select
            aria-label="Filter leads by property category"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value as PropertyCategory | 'All')}
            className="w-full min-h-[42px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm font-medium text-[#0B1324]"
          >
            <option value="All">All Categories</option>
            <option value="Flat">Flat / Apartment</option>
            <option value="House">House / Villa</option>
            <option value="Room">Room / PG</option>
          </select>

          <select
            aria-label="Filter leads by BHK"
            value={String(bedrooms)}
            onChange={(e) =>
              setBedrooms(e.target.value === 'All' ? 'All' : Number(e.target.value))
            }
            className="w-full min-h-[42px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm font-medium text-[#0B1324]"
          >
            <option value="All">Any BHK</option>
            <option value="1">1 BHK</option>
            <option value="2">2 BHK</option>
            <option value="3">3 BHK</option>
            <option value="4">4+ BHK</option>
          </select>

          <select
            aria-label="Filter leads by furnishing"
            value={furnishing}
            onChange={(e) => setFurnishing(e.target.value as FurnishingPreference)}
            className="w-full min-h-[42px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm font-medium text-[#0B1324]"
          >
            <option value="Any">Any Furnishing</option>
            <option value="Furnished">Furnished</option>
            <option value="Semi-furnished">Semi-furnished</option>
            <option value="Unfurnished">Unfurnished</option>
          </select>

          <div className="grid grid-cols-2 gap-2.5">
            <select
              aria-label="Filter leads by posted date"
              value={postedWindow}
              onChange={(e) => setPostedWindow(e.target.value as 'all' | '7d' | '24h')}
              className="w-full min-h-[42px] px-2.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-xs font-medium text-[#0B1324]"
            >
              <option value="all">Any Date</option>
              <option value="7d">Last 7d</option>
              <option value="24h">Last 24h</option>
            </select>

            <input
              type="number"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              placeholder="Max ₹"
              aria-label="Filter leads by maximum budget"
              className="w-full min-h-[42px] px-2.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-xs text-[#0B1324] tabular-nums"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-[#0B1324] cursor-pointer">
            <input
              type="checkbox"
              checked={serviceAreasOnly}
              onChange={(e) => setServiceAreasOnly(e.target.checked)}
              className="h-4 w-4 accent-[#1A56FF] rounded"
            />
            <span>
              My operating localities only ({operatingAreas.join(', ') || 'None set'})
            </span>
          </label>
          <span className="text-xs font-medium text-[#5E687A] tabular-nums">
            {filteredRequirements.length} active{' '}
            {filteredRequirements.length === 1 ? 'requirement' : 'requirements'}
          </span>
        </div>
      </div>

      {/* Leads Feed */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredRequirements.length === 0 ? (
          <div className="lg:col-span-2 bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-10 text-center">
            <p className="font-display text-base font-bold text-[#0B1324]">
              No leads match your current filters
            </p>
            <p className="mt-1 text-sm text-[#5E687A]">
              Try clearing locality or budget filters to discover more customer requirements.
            </p>
          </div>
        ) : (
          filteredRequirements.map((req) => {
            const rankedMatches = rankPropertiesForRequirement(req, activeInventory);
            const bestMatch = rankedMatches[0];
            const areaMatch = req.localities.some((l) =>
              operatingAreas.some((a) => a.toLowerCase() === l.toLowerCase())
            );
            const sentByMe = proposals.filter(
              (p) => p.requirementId === req.id && p.brokerId === broker.id
            );

            return (
              <article
                key={req.id}
                className="bg-white rounded-2xl border border-[#E6E9EF] p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(11,19,36,0.04)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-[#5E687A] tabular-nums">
                        {req.id.toUpperCase()} · {req.intent === 'rent' ? 'Rent' : 'Buy'} · Posted{' '}
                        {formatRelativeDate(req.createdAt)}
                        {areaMatch ? ' · In your operating area' : ''}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedLead(req)}
                        className="mt-1 text-left font-display text-lg font-bold text-[#0B1324] hover:text-[#1A56FF] transition-colors"
                      >
                        Looking for a {req.bedrooms === 4 ? '4+' : req.bedrooms} BHK{' '}
                        {req.propertyType} in {req.localities.join(', ')}
                      </button>
                    </div>

                    <p className="font-display text-base font-bold text-[#1A56FF] tabular-nums whitespace-nowrap">
                      {formatBudgetRange(req.budgetMin, req.budgetMax, req.intent)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5E687A]">
                    <span>Furnishing: {req.furnishing}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Calendar className="h-3.5 w-3.5" />
                      Move-in {req.moveInDate}
                    </span>
                    {req.amenities.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Wants: {req.amenities.slice(0, 3).join(', ')}</span>
                      </>
                    )}
                  </div>

                  {req.notes && (
                    <p className="mt-3 text-sm text-[#0B1324] bg-[#F7F8FA] rounded-xl p-3">
                      {req.notes}
                    </p>
                  )}

                  {/* Deterministic Match Engine Insight */}
                  {bestMatch && (
                    <div className="mt-4 rounded-xl border border-[#E6E9EF] p-3.5 bg-[#FAFBFD]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#0B1324] flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-[#1A56FF]" />
                          <span>Inventory Match: {bestMatch.property.title}</span>
                        </span>
                        <span
                          className={`text-xs font-bold tabular-nums ${
                            bestMatch.match.score >= 85
                              ? 'text-emerald-700'
                              : bestMatch.match.score >= 65
                              ? 'text-[#1A56FF]'
                              : 'text-[#5E687A]'
                          }`}
                        >
                          {bestMatch.match.score}% ({bestMatch.match.label})
                        </span>
                      </div>

                      <p className="mt-1 text-[11px] text-[#5E687A] tabular-nums">
                        Listed at {formatINR(bestMatch.property.price, bestMatch.property.intent)} ·{' '}
                        {bestMatch.property.locality} · {bestMatch.property.bedrooms} BHK
                      </p>

                      {bestMatch.match.reasons.length > 0 && (
                        <ul className="mt-2 space-y-1 text-[11px] text-[#0B1324]">
                          {bestMatch.match.reasons.slice(0, 3).map((reason) => (
                            <li key={reason} className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-[#E6E9EF] flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedLead(req)}
                    className="text-xs font-semibold text-[#5E687A] hover:text-[#1A56FF]"
                  >
                    {sentByMe.length > 0
                      ? `View Details (${sentByMe.length} pitched)`
                      : 'View Requirement Details →'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSubmitProposal(req)}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-xs font-semibold whitespace-nowrap"
                  >
                    Send Property Proposal
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Requirement Full Details Modal (Privacy-Safe) */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-50 bg-[#0B1324]/55 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Customer requirement details"
        >
          <div className="bg-white rounded-3xl border border-[#E6E9EF] shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#E6E9EF] flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#1A56FF] tabular-nums">
                  {selectedLead.id.toUpperCase()} · Posted {formatRelativeDate(selectedLead.createdAt)}
                </p>
                <h2 className="mt-0.5 font-display text-lg font-bold text-[#0B1324]">
                  {selectedLead.bedrooms === 4 ? '4+' : selectedLead.bedrooms} BHK{' '}
                  {selectedLead.propertyType} in {selectedLead.localities.join(', ')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                aria-label="Close requirement details"
                className="h-9 w-9 rounded-xl hover:bg-[#F7F8FA] flex items-center justify-center text-[#5E687A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#F7F8FA] rounded-xl p-3">
                  <p className="text-[#5E687A]">Transaction</p>
                  <p className="mt-0.5 font-bold text-[#0B1324]">
                    {selectedLead.intent === 'rent' ? 'For Rent' : 'For Purchase'}
                  </p>
                </div>
                <div className="bg-[#F7F8FA] rounded-xl p-3">
                  <p className="text-[#5E687A]">Budget Range</p>
                  <p className="mt-0.5 font-bold text-[#1A56FF] tabular-nums">
                    {formatBudgetRange(
                      selectedLead.budgetMin,
                      selectedLead.budgetMax,
                      selectedLead.intent
                    )}
                  </p>
                </div>
                <div className="bg-[#F7F8FA] rounded-xl p-3">
                  <p className="text-[#5E687A]">Furnishing</p>
                  <p className="mt-0.5 font-bold text-[#0B1324]">{selectedLead.furnishing}</p>
                </div>
                <div className="bg-[#F7F8FA] rounded-xl p-3">
                  <p className="text-[#5E687A]">Move-in Date</p>
                  <p className="mt-0.5 font-bold text-[#0B1324] tabular-nums">
                    {selectedLead.moveInDate}
                  </p>
                </div>
              </div>

              {selectedLead.amenities.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#5E687A]">Required Amenities</p>
                  <p className="mt-1 text-sm text-[#0B1324]">
                    {selectedLead.amenities.join(' · ')}
                  </p>
                </div>
              )}

              {selectedLead.notes && (
                <div>
                  <p className="text-xs font-semibold text-[#5E687A]">Additional Preferences</p>
                  <p className="mt-1 text-sm text-[#0B1324] bg-[#F7F8FA] rounded-xl p-3.5">
                    {selectedLead.notes}
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-[#E6E9EF] p-3.5 bg-[#FAFBFD] flex items-start gap-2.5 text-xs text-[#5E687A]">
                <Lock className="h-4 w-4 text-[#1A56FF] shrink-0 mt-0.5" />
                <span>
                  Seeker phone and email are protected. Send a property proposal first—private contact details unlock once the customer accepts or consents.
                </span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#E6E9EF] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="min-h-[42px] px-4 rounded-xl bg-[#F7F8FA] text-sm font-semibold text-[#0B1324]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const req = selectedLead;
                  setSelectedLead(null);
                  onSubmitProposal(req);
                }}
                className="min-h-[42px] px-5 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold"
              >
                Send Property Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
