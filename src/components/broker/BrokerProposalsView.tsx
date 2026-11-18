'use client';

import { useState } from 'react';
import { CheckCircle2, Lock, Mail, Phone, Send } from 'lucide-react';
import type {
  Message,
  Property,
  Proposal,
  ProposalLifecycleStatus,
  Requirement,
  User,
} from '@/types';
import {
  formatINR,
  formatProposalLifecycle,
  formatRelativeDate,
} from '@/lib/matching';
import { PropertyImage } from '@/components/PropertyImage';

interface BrokerProposalsViewProps {
  broker: User;
  proposals: Proposal[];
  properties: Property[];
  requirements: Requirement[];
  messages: Message[];
  onSendMessage: (payload: {
    propertyId: string;
    recipientId: string;
    proposalId?: string;
    body: string;
  }) => Promise<void>;
  onUpdateProposal: (
    proposalId: string,
    updates: { statusDetail?: ProposalLifecycleStatus }
  ) => Promise<void>;
}

const LIFECYCLE_FILTERS: Array<'All' | ProposalLifecycleStatus> = [
  'All',
  'Sent',
  'Viewed',
  'Interested',
  'Visit Requested',
  'Visit Scheduled',
  'Rejected',
  'Closed',
];

export function BrokerProposalsView({
  broker,
  proposals,
  properties,
  requirements,
  messages,
  onSendMessage,
  onUpdateProposal,
}: BrokerProposalsViewProps) {
  const [replyTextByProp, setReplyTextByProp] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<'All' | ProposalLifecycleStatus>('All');

  const brokerProposals = proposals.filter((p) => p.brokerId === broker.id);
  const visibleProposals = brokerProposals.filter((p) =>
    statusFilter === 'All' ? true : formatProposalLifecycle(p) === statusFilter
  );

  const handleReply = async (proposal: Proposal) => {
    const text = (replyTextByProp[proposal.id] || '').trim();
    if (!text) return;
    await onSendMessage({
      propertyId: proposal.propertyId,
      recipientId: proposal.seekerId,
      proposalId: proposal.id,
      body: text,
    });
    setReplyTextByProp((prev) => ({ ...prev, [proposal.id]: '' }));
  };

  const lifecycleTone = (label: ProposalLifecycleStatus) => {
    if (label === 'Interested' || label === 'Visit Scheduled') return 'text-emerald-700';
    if (label === 'Viewed' || label === 'Visit Requested') return 'text-[#1A56FF]';
    if (label === 'Rejected' || label === 'Closed') return 'text-[#9AA5B5]';
    return 'text-[#5E687A]';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-24 md:pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1324]">
            Submitted Proposals
          </h1>
          <p className="mt-1 text-sm text-[#5E687A]">
            Track seeker views, interest, scheduled visits, and consented contact details.
          </p>
        </div>
      </div>

      {/* Lifecycle Status Tabs */}
      <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
        {LIFECYCLE_FILTERS.map((tab) => {
          const count =
            tab === 'All'
              ? brokerProposals.length
              : brokerProposals.filter((p) => formatProposalLifecycle(p) === tab).length;
          const active = statusFilter === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold border whitespace-nowrap transition-colors tabular-nums ${
                active
                  ? 'bg-[#0B1324] border-[#0B1324] text-white'
                  : 'bg-white border-[#E6E9EF] text-[#5E687A] hover:text-[#0B1324]'
              }`}
            >
              {tab} ({count})
            </button>
          );
        })}
      </div>

      {visibleProposals.length === 0 ? (
        <div className="mt-8 bg-[#F7F8FA] rounded-3xl border border-[#E6E9EF] p-10 text-center">
          <p className="font-display text-lg font-bold text-[#0B1324]">
            {brokerProposals.length === 0
              ? 'No proposals submitted yet'
              : `No proposals with status “${statusFilter}”`}
          </p>
          <p className="mt-1 text-sm text-[#5E687A]">
            Go to Find Leads to match your active inventory to customer requirements.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {visibleProposals.map((proposal) => {
            const prop = properties.find((p) => p.id === proposal.propertyId);
            const req = requirements.find((r) => r.id === proposal.requirementId);
            const thread = messages.filter(
              (m) =>
                m.propertyId === proposal.propertyId &&
                (m.senderId === proposal.seekerId || m.recipientId === proposal.seekerId)
            );
            if (!prop || !req) return null;

            const lifecycle = formatProposalLifecycle(proposal);
            const canViewContact = Boolean(proposal.contactShared || proposal.status === 'accepted');

            return (
              <article
                key={proposal.id}
                className="bg-white rounded-2xl border border-[#E6E9EF] p-5 shadow-[0_4px_20px_-2px_rgba(11,19,36,0.04)]"
              >
                <div className="flex flex-col md:flex-row gap-5">
                  <PropertyImage
                    src={prop.images[0]}
                    alt={prop.title}
                    className="w-full md:w-48 aspect-[4/3] rounded-xl shrink-0"
                  />

                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-[#5E687A] tabular-nums">
                          Sent {formatRelativeDate(proposal.createdAt)} · To {req.seekerName} ·{' '}
                          <span className={`font-semibold ${lifecycleTone(lifecycle)}`}>
                            {lifecycle}
                          </span>
                        </p>
                        <h2 className="mt-0.5 font-display text-lg font-bold text-[#0B1324]">
                          {prop.title}
                        </h2>
                      </div>
                      <p className="font-display text-base font-bold text-[#1A56FF] tabular-nums">
                        {formatINR(proposal.proposedPrice, prop.intent)}
                        {prop.intent === 'rent' ? '/mo' : ''}
                      </p>
                    </div>

                    <p className="text-xs text-[#5E687A]">
                      Match:{' '}
                      <span className="font-semibold text-[#0B1324] tabular-nums">
                        {proposal.matchScore}%
                      </span>{' '}
                      · Brokerage: {proposal.brokerageCharge} · Requirement: {req.bedrooms} BHK{' '}
                      {req.propertyType} in {req.localities.join(', ')}
                    </p>

                    {proposal.whyMatches && (
                      <p className="text-xs text-[#5E687A]">
                        <span className="font-semibold text-[#0B1324]">Match rationale:</span>{' '}
                        {proposal.whyMatches}
                      </p>
                    )}

                    <p className="text-xs text-[#0B1324] bg-[#F7F8FA] rounded-xl p-3">
                      Your pitch: “{proposal.message}”
                    </p>

                    {/* Consent-gated Seeker Contact */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                      {canViewContact && (req.seekerPhone || req.seekerEmail) ? (
                        <div className="flex flex-wrap items-center gap-4 text-emerald-800 bg-emerald-50 rounded-xl px-3 py-2">
                          <span className="font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Contact Unlocked
                          </span>
                          {req.seekerPhone && (
                            <a
                              href={`tel:${req.seekerPhone}`}
                              className="inline-flex items-center gap-1 font-medium hover:underline tabular-nums"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              <span>{req.seekerPhone}</span>
                            </a>
                          )}
                          {req.seekerEmail && (
                            <span className="inline-flex items-center gap-1 font-medium">
                              <Mail className="h-3.5 w-3.5" />
                              <span>{req.seekerEmail}</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[#5E687A] inline-flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-[#5E687A]" />
                          <span>
                            Contact details locked until seeker accepts or shares contact
                          </span>
                        </p>
                      )}

                      {lifecycle !== 'Closed' && lifecycle !== 'Rejected' && (
                        <button
                          type="button"
                          onClick={() => onUpdateProposal(proposal.id, { statusDetail: 'Closed' })}
                          className="min-h-[34px] px-3 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] border border-[#E6E9EF] text-xs font-semibold text-[#5E687A]"
                        >
                          Mark Closed
                        </button>
                      )}
                    </div>

                    {thread.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-[#E6E9EF]">
                        {thread.slice(-3).map((m) => (
                          <p key={m.id} className="text-xs text-[#5E687A]">
                            <span className="font-semibold text-[#0B1324]">{m.senderName}:</span>{' '}
                            {m.body}
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <input
                        type="text"
                        value={replyTextByProp[proposal.id] || ''}
                        onChange={(e) =>
                          setReplyTextByProp((prev) => ({
                            ...prev,
                            [proposal.id]: e.target.value,
                          }))
                        }
                        placeholder={`Reply to ${req.seekerName}...`}
                        aria-label={`Reply to ${req.seekerName}`}
                        className="flex-1 min-h-[40px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-xs text-[#0B1324]"
                      />
                      <button
                        type="button"
                        onClick={() => handleReply(proposal)}
                        aria-label="Send reply"
                        className="min-h-[40px] px-3.5 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Send</span>
                      </button>
                    </div>
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
