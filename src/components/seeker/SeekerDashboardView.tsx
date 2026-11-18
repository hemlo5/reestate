'use client';

import { Calendar, Pause, Play, Plus, Trash2 } from 'lucide-react';
import type { Proposal, Requirement, Visit } from '@/types';
import { formatBudgetRange, formatRelativeDate } from '@/lib/matching';

interface SeekerDashboardViewProps {
  requirements: Requirement[];
  proposals: Proposal[];
  visits: Visit[];
  savedCount: number;
  onPostNew: () => void;
  onViewProposals: (requirementId?: string) => void;
  onToggleStatus: (req: Requirement) => Promise<void>;
  onDeleteRequirement: (id: string) => Promise<void>;
  onOpenSaved: () => void;
}

export function SeekerDashboardView({
  requirements,
  proposals,
  visits,
  savedCount,
  onPostNew,
  onViewProposals,
  onToggleStatus,
  onDeleteRequirement,
  onOpenSaved,
}: SeekerDashboardViewProps) {
  const activeCount = requirements.filter((r) => r.status === 'active').length;
  const respondedBrokerIds = new Set(proposals.map((p) => p.brokerId));
  const upcomingVisitsCount = visits.filter((v) => v.status !== 'cancelled').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-24 md:pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1324]">
            My Requirements
          </h1>
          <p className="mt-1 text-sm text-[#5E687A]">
            Track your active home briefs, broker responses, and scheduled visits.
          </p>
        </div>

        <button
          type="button"
          onClick={onPostNew}
          className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Requirement</span>
        </button>
      </div>

      {/* Summary Metrics Strip */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          { label: 'Active Briefs', value: activeCount, onClick: undefined },
          {
            label: 'Brokers Responded',
            value: respondedBrokerIds.size,
            onClick: () => onViewProposals(),
          },
          {
            label: 'Proposals Received',
            value: proposals.length,
            onClick: () => onViewProposals(),
          },
          { label: 'Scheduled Visits', value: upcomingVisitsCount, onClick: onOpenSaved },
          { label: 'Saved Properties', value: savedCount, onClick: onOpenSaved },
        ].map((metric) => (
          <div
            key={metric.label}
            className="bg-white rounded-2xl border border-[#E6E9EF] p-4 sm:p-5"
          >
            <p className="text-xs font-medium text-[#5E687A]">{metric.label}</p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="font-display text-2xl font-bold text-[#0B1324] tabular-nums">
                {metric.value}
              </span>
              {metric.onClick && (
                <button
                  type="button"
                  onClick={metric.onClick}
                  className="text-xs font-semibold text-[#1A56FF] hover:text-[#1244D8]"
                >
                  View →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Requirement Cards */}
      <section className="mt-8" aria-label="Posted requirements">
        {requirements.length === 0 ? (
          <div className="bg-[#F7F8FA] rounded-3xl border border-[#E6E9EF] p-10 text-center">
            <h2 className="font-display text-lg font-bold text-[#0B1324]">
              No requirements posted yet
            </h2>
            <p className="mt-1.5 text-sm text-[#5E687A] max-w-md mx-auto">
              Publish what you are looking for and receive curated proposals directly from verified local brokers.
            </p>
            <button
              type="button"
              onClick={onPostNew}
              className="mt-5 px-5 py-2.5 rounded-xl bg-[#1A56FF] text-white text-sm font-semibold hover:bg-[#1244D8]"
            >
              Post your first requirement
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {requirements.map((req) => {
              const reqProposals = proposals.filter((p) => p.requirementId === req.id);
              const reqBrokers = new Set(reqProposals.map((p) => p.brokerId)).size;

              return (
                <article
                  key={req.id}
                  className="bg-white rounded-2xl border border-[#E6E9EF] p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(11,19,36,0.04)] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-[#5E687A] tabular-nums">
                          {req.intent === 'rent' ? 'Rent' : 'Buy'} · Posted{' '}
                          {formatRelativeDate(req.createdAt)} ·{' '}
                          <span
                            className={
                              req.status === 'active'
                                ? 'text-emerald-700 font-semibold'
                                : 'text-[#5E687A] font-semibold'
                            }
                          >
                            {req.status === 'active' ? 'Active' : 'Paused'}
                          </span>
                        </p>
                        <h2 className="mt-1 font-display text-lg font-bold text-[#0B1324]">
                          {req.bedrooms === 4 ? '4+' : req.bedrooms} BHK {req.propertyType} in{' '}
                          {req.localities.join(', ')}
                        </h2>
                      </div>

                      <p className="font-display text-base font-bold text-[#1A56FF] tabular-nums whitespace-nowrap">
                        {formatBudgetRange(req.budgetMin, req.budgetMax, req.intent)}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5E687A]">
                      <span>{req.furnishing}</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Calendar className="h-3.5 w-3.5" />
                        Move-in {req.moveInDate}
                      </span>
                      {req.amenities.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{req.amenities.slice(0, 3).join(', ')}</span>
                        </>
                      )}
                    </div>

                    {req.notes && (
                      <p className="mt-3 text-sm text-[#5E687A] line-clamp-2">{req.notes}</p>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#E6E9EF] flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-medium text-[#0B1324] tabular-nums">
                      <span>{reqProposals.length} proposals</span>
                      <span className="mx-1.5 text-[#9AA5B5]">·</span>
                      <span className="text-[#5E687A]">{reqBrokers} brokers responded</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleStatus(req)}
                        aria-label={
                          req.status === 'active'
                            ? `Pause requirement ${req.localities.join(', ')}`
                            : `Resume requirement ${req.localities.join(', ')}`
                        }
                        className="h-9 px-3 rounded-xl border border-[#E6E9EF] text-xs font-semibold text-[#5E687A] hover:text-[#0B1324] hover:bg-[#F7F8FA] inline-flex items-center gap-1.5"
                      >
                        {req.status === 'active' ? (
                          <>
                            <Pause className="h-3.5 w-3.5" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" />
                            <span>Resume</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteRequirement(req.id)}
                        aria-label={`Delete requirement in ${req.localities.join(', ')}`}
                        className="h-9 w-9 rounded-xl border border-[#E6E9EF] text-[#5E687A] hover:text-red-600 hover:border-red-200 flex items-center justify-center"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onViewProposals(req.id)}
                        className="h-9 px-4 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-xs font-semibold whitespace-nowrap"
                      >
                        View Proposals ({reqProposals.length})
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
