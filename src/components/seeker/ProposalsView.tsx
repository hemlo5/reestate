'use client';

import { useState } from 'react';
import { CheckCircle2, Columns2, MessageSquare, Share2, X } from 'lucide-react';
import type { Property, Proposal, ProposalStatus, Requirement, User } from '@/types';
import { formatINR, formatProposalLifecycle } from '@/lib/matching';
import { PropertyCard } from '@/components/PropertyCard';

interface ProposalsViewProps {
  requirements: Requirement[];
  proposals: Proposal[];
  properties: Property[];
  brokers: User[];
  savedIds: string[];
  filterRequirementId: string | 'all';
  onChangeFilterRequirement: (id: string | 'all') => void;
  onToggleSave: (propertyId: string) => void;
  onViewDetails: (property: Property, focusContact?: boolean) => void;
  onUpdateProposalStatus: (proposalId: string, status: ProposalStatus) => Promise<void>;
  onOpenBrokerProfile?: (brokerId: string) => void;
  onShareContact?: (proposalId: string) => Promise<void>;
  onMarkProposalViewed?: (proposalId: string) => Promise<void>;
}

export function ProposalsView({
  requirements,
  proposals,
  properties,
  brokers,
  savedIds,
  filterRequirementId,
  onChangeFilterRequirement,
  onToggleSave,
  onViewDetails,
  onUpdateProposalStatus,
  onOpenBrokerProfile,
  onShareContact,
  onMarkProposalViewed,
}: ProposalsViewProps) {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const visibleProposals =
    filterRequirementId === 'all'
      ? proposals
      : proposals.filter((p) => p.requirementId === filterRequirementId);

  const toggleCompare = (proposalId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(proposalId)) return prev.filter((id) => id !== proposalId);
      if (prev.length >= 3) return [...prev.slice(1), proposalId];
      return [...prev, proposalId];
    });
  };

  const comparedItems = compareIds
    .map((pid) => {
      const proposal = proposals.find((p) => p.id === pid);
      const property = proposal
        ? properties.find((prop) => prop.id === proposal.propertyId)
        : undefined;
      const broker = proposal
        ? brokers.find((b) => b.id === proposal.brokerId)
        : undefined;
      return proposal && property ? { proposal, property, broker } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 md:pb-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1324]">
            Property Proposals
          </h1>
          <p className="mt-1 text-sm text-[#5E687A]">
            Properties matched and pitched directly by verified brokers for your requirements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Filter proposals by requirement"
            value={filterRequirementId}
            onChange={(e) => onChangeFilterRequirement(e.target.value)}
            className="min-h-[42px] px-3.5 rounded-xl bg-white border border-[#E6E9EF] text-sm font-medium text-[#0B1324] focus:outline-none focus:border-[#1A56FF]"
          >
            <option value="all">All Requirements ({proposals.length})</option>
            {requirements.map((req) => (
              <option key={req.id} value={req.id}>
                {req.bedrooms} BHK {req.propertyType} · {req.localities.join(', ')}
              </option>
            ))}
          </select>

          {compareIds.length >= 2 && (
            <button
              type="button"
              onClick={() => setShowCompareModal(true)}
              className="min-h-[42px] px-4 rounded-xl bg-[#0B1324] hover:bg-[#1C273F] text-white text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Columns2 className="h-4 w-4" />
              <span>Compare ({compareIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {visibleProposals.length === 0 ? (
        <div className="mt-8 bg-[#F7F8FA] rounded-3xl border border-[#E6E9EF] p-10 text-center">
          <h2 className="font-display text-lg font-bold text-[#0B1324]">
            No proposals for this requirement yet
          </h2>
          <p className="mt-1.5 text-sm text-[#5E687A] max-w-md mx-auto">
            Brokers covering your selected localities are reviewing your brief and will submit matched options soon.
          </p>
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleProposals.map((proposal) => {
            const property = properties.find((p) => p.id === proposal.propertyId);
            const requirement = requirements.find((r) => r.id === proposal.requirementId);
            const broker = brokers.find((b) => b.id === proposal.brokerId);
            if (!property) return null;

            const isCompared = compareIds.includes(proposal.id);
            const lifecycle = formatProposalLifecycle(proposal);
            const statusText =
              proposal.status === 'accepted'
                ? 'Accepted'
                : proposal.status === 'shortlisted'
                ? 'Shortlisted'
                : proposal.status === 'declined'
                ? 'Declined'
                : lifecycle === 'Sent'
                ? 'New Proposal'
                : lifecycle;

            const handleOpenProperty = (focusContact: boolean) => {
              if (!proposal.viewedAt && onMarkProposalViewed) {
                void onMarkProposalViewed(proposal.id);
              }
              onViewDetails(property, focusContact);
            };

            return (
              <div key={proposal.id} className="flex flex-col">
                <PropertyCard
                  property={{ ...property, price: proposal.proposedPrice, brokerageFee: proposal.brokerageCharge }}
                  isSaved={savedIds.includes(property.id)}
                  onToggleSave={onToggleSave}
                  onViewDetails={() => handleOpenProperty(false)}
                  highlight={proposal.status === 'shortlisted' || proposal.status === 'accepted'}
                  footerSlot={
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#1A56FF] tabular-nums">
                          {proposal.matchScore}% Match
                        </span>
                        <span
                          className={`font-semibold ${
                            proposal.status === 'accepted'
                              ? 'text-emerald-700'
                              : proposal.status === 'shortlisted'
                              ? 'text-[#1A56FF]'
                              : proposal.status === 'declined'
                              ? 'text-[#9AA5B5]'
                              : 'text-[#5E687A]'
                          }`}
                        >
                          {statusText}
                        </span>
                      </div>

                      {requirement && (
                        <p className="text-[11px] text-[#5E687A]">
                          For: {requirement.bedrooms} BHK {requirement.propertyType} in{' '}
                          {requirement.localities.join(', ')}
                        </p>
                      )}

                      {onOpenBrokerProfile && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#5E687A]">
                            Broker:{' '}
                            <button
                              type="button"
                              onClick={() => onOpenBrokerProfile(proposal.brokerId)}
                              className="font-semibold text-[#0B1324] hover:text-[#1A56FF] underline-offset-2 hover:underline"
                            >
                              {broker?.name || property.brokerName}
                            </button>
                          </span>
                        </div>
                      )}

                      <p className="text-xs text-[#0B1324] bg-[#F7F8FA] rounded-xl p-3 leading-relaxed">
                        “{proposal.message}”
                      </p>

                      {proposal.whyMatches && (
                        <p className="text-[11px] text-[#5E687A] leading-snug">
                          <span className="font-semibold text-[#0B1324]">Why it matches: </span>
                          {proposal.whyMatches}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenProperty(true)}
                          className="flex-1 min-h-[38px] px-3 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Contact Broker</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleCompare(proposal.id)}
                          className={`min-h-[38px] px-3 rounded-xl border text-xs font-semibold whitespace-nowrap transition-colors ${
                            isCompared
                              ? 'bg-[#0B1324] border-[#0B1324] text-white'
                              : 'bg-white border-[#E6E9EF] text-[#0B1324] hover:bg-[#F7F8FA]'
                          }`}
                        >
                          {isCompared ? 'Comparing' : 'Compare'}
                        </button>
                      </div>

                      {proposal.status !== 'declined' && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateProposalStatus(
                                proposal.id,
                                proposal.status === 'shortlisted' ? 'accepted' : 'shortlisted'
                              )
                            }
                            className="font-semibold text-[#1A56FF] hover:text-[#1244D8] inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>
                              {proposal.status === 'shortlisted'
                                ? 'Accept & Share Contact'
                                : proposal.status === 'accepted'
                                ? 'Accepted'
                                : 'Shortlist'}
                            </span>
                          </button>

                          {onShareContact && !proposal.contactShared && proposal.status !== 'accepted' && (
                            <button
                              type="button"
                              onClick={() => onShareContact(proposal.id)}
                              className="font-semibold text-[#0B1324] hover:text-[#1A56FF] inline-flex items-center gap-1"
                            >
                              <Share2 className="h-3 w-3" />
                              <span>Share Contact</span>
                            </button>
                          )}

                          {proposal.contactShared && (
                            <span className="text-[11px] font-semibold text-emerald-700">
                              Contact Shared
                            </span>
                          )}

                          {proposal.status !== 'accepted' && (
                            <button
                              type="button"
                              onClick={() => onUpdateProposalStatus(proposal.id, 'declined')}
                              className="font-medium text-[#5E687A] hover:text-red-600"
                            >
                              Decline
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      {showCompareModal && comparedItems.length >= 2 && (
        <div
          className="fixed inset-0 z-50 bg-[#0B1324]/55 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Compare property proposals"
        >
          <div className="bg-white rounded-3xl border border-[#E6E9EF] shadow-2xl max-w-4xl w-full max-h-[88vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#E6E9EF] flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#0B1324]">
                Side-by-Side Proposal Comparison
              </h2>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                aria-label="Close comparison"
                className="h-9 w-9 rounded-xl hover:bg-[#F7F8FA] flex items-center justify-center text-[#5E687A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-auto p-6">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E6E9EF]">
                    <th className="py-3 pr-4 text-xs font-semibold text-[#5E687A] w-36">
                      Criteria
                    </th>
                    {comparedItems.map(({ property }) => (
                      <th key={property.id} className="py-3 px-4 font-display font-bold text-[#0B1324] min-w-[200px]">
                        {property.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E9EF]">
                  <tr>
                    <td className="py-3 pr-4 text-xs font-medium text-[#5E687A]">Match Score</td>
                    {comparedItems.map(({ proposal }) => (
                      <td key={proposal.id} className="py-3 px-4 font-bold text-[#1A56FF] tabular-nums">
                        {proposal.matchScore}% Match
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-xs font-medium text-[#5E687A]">Price</td>
                    {comparedItems.map(({ proposal, property }) => (
                      <td key={proposal.id} className="py-3 px-4 font-bold text-[#0B1324] tabular-nums">
                        {formatINR(proposal.proposedPrice, property.intent)}
                        {property.intent === 'rent' ? '/mo' : ''}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-xs font-medium text-[#5E687A]">Location</td>
                    {comparedItems.map(({ property }) => (
                      <td key={property.id} className="py-3 px-4 text-[#0B1324]">
                        {property.locality}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-xs font-medium text-[#5E687A]">Configuration</td>
                    {comparedItems.map(({ property }) => (
                      <td key={property.id} className="py-3 px-4 text-[#0B1324] tabular-nums">
                        {property.bedrooms} BHK · {property.areaSqFt} sq.ft
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-xs font-medium text-[#5E687A]">Furnishing</td>
                    {comparedItems.map(({ property }) => (
                      <td key={property.id} className="py-3 px-4 text-[#0B1324]">
                        {property.furnishing}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-xs font-medium text-[#5E687A]">Brokerage Fee</td>
                    {comparedItems.map(({ proposal }) => (
                      <td key={proposal.id} className="py-3 px-4 font-medium text-[#0B1324]">
                        {proposal.brokerageCharge}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-xs font-medium text-[#5E687A]">Broker</td>
                    {comparedItems.map(({ property, broker }) => (
                      <td key={property.id} className="py-3 px-4 text-[#0B1324]">
                        {broker?.name || property.brokerName}
                        {property.brokerAgency ? ` · ${property.brokerAgency}` : ''}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-xs font-medium text-[#5E687A]">Amenities</td>
                    {comparedItems.map(({ property }) => (
                      <td key={property.id} className="py-3 px-4 text-xs text-[#5E687A]">
                        {property.amenities.join(', ')}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
