'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Property, Proposal, Requirement } from '@/types';
import type { CreatePropertyInput, CreateProposalInput } from '@/lib/validation/schemas';
import { apiClient } from '@/lib/api/client';
import { useSession } from '@/components/providers/AppProviders';
import { AuthGateCard } from '@/components/AuthGateCard';
import { BrokerDiscoverLeadsView } from './BrokerDiscoverLeadsView';

const SubmitProposalModal = dynamic(
  () => import('./SubmitProposalModal').then((m) => m.SubmitProposalModal),
  { ssr: false }
);

interface BrokerLeadsClientProps {
  initialRequirements: Requirement[];
  initialNextCursor: string | null;
  initialInventory: Property[];
  initialProposals: Proposal[];
}

export function BrokerLeadsClient({
  initialRequirements,
  initialNextCursor,
  initialInventory,
  initialProposals,
}: BrokerLeadsClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const isBroker = user?.role === 'broker';

  const [proposalModalReq, setProposalModalReq] = useState<Requirement | null>(null);
  const [extraRequirements, setExtraRequirements] = useState<Requirement[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data: baseLeads } = useQuery({
    queryKey: ['broker-leads', user?.id],
    queryFn: () => apiClient.listBrokerLeads({ limit: 40 }),
    initialData: isBroker
      ? {
          items: initialRequirements.map((r) => ({
            requirement: r,
            bestProperty: null,
            bestMatch: null,
            alreadyProposed: false,
          })),
          nextCursor: initialNextCursor,
          total: initialRequirements.length,
        }
      : undefined,
    enabled: Boolean(isBroker),
  });

  const { data: inventory = initialInventory } = useQuery({
    queryKey: ['broker-inventory', user?.id],
    queryFn: async () =>
      (
        await apiClient.listProperties({
          brokerId: user?.id,
          includeUnavailable: true,
          limit: 100,
        })
      ).items,
    initialData: isBroker ? initialInventory : undefined,
    enabled: Boolean(isBroker),
  });

  const { data: proposals = initialProposals } = useQuery({
    queryKey: ['broker-proposals', user?.id],
    queryFn: async () => (await apiClient.listProposals()).proposals,
    initialData: isBroker ? initialProposals : undefined,
    enabled: Boolean(isBroker),
  });

  if (!user || !isBroker) {
    return (
      <AuthGateCard
        requiredRole="broker"
        title={
          user
            ? 'Switch to a Property Broker account to browse leads'
            : 'Sign in as a Property Broker to discover active leads'
        }
        description="See verified home-seeker briefs matched to your inventory and operating localities."
      />
    );
  }

  const primaryReqs = baseLeads?.items.map((i) => i.requirement) ?? initialRequirements;
  const seenIds = new Set(primaryReqs.map((r) => r.id));
  const combinedRequirements = [
    ...primaryReqs,
    ...extraRequirements.filter((r) => !seenIds.has(r.id)),
  ];

  const effectiveCursor = nextCursor ?? baseLeads?.nextCursor ?? null;

  const handleLoadMore = async () => {
    if (!effectiveCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await apiClient.listBrokerLeads({
        cursor: effectiveCursor,
        limit: 40,
      });
      setExtraRequirements((prev) => [
        ...prev,
        ...page.items.map((i) => i.requirement),
      ]);
      setNextCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCreateProperty = async (payload: CreatePropertyInput) => {
    const res = await apiClient.createProperty(payload);
    await queryClient.invalidateQueries({ queryKey: ['broker-inventory', user.id] });
    return res.property;
  };

  const handleSubmitProposal = async (payload: CreateProposalInput) => {
    await apiClient.createProposal(payload);
    await queryClient.invalidateQueries({ queryKey: ['broker-proposals', user.id] });
    await queryClient.invalidateQueries({ queryKey: ['broker-leads', user.id] });
    router.refresh();
  };

  return (
    <>
      <BrokerDiscoverLeadsView
        broker={user}
        requirements={combinedRequirements}
        inventory={inventory}
        proposals={proposals}
        onSubmitProposal={(req) => setProposalModalReq(req)}
      />

      {effectiveCursor && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 md:pb-14 -mt-8 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={handleLoadMore}
            className="min-h-[44px] px-6 rounded-xl bg-white hover:bg-[#F7F8FA] border border-[#E6E9EF] text-sm font-semibold text-[#0B1324] disabled:opacity-60"
          >
            {loadingMore ? 'Loading more leads...' : 'Load More Requirements'}
          </button>
        </div>
      )}

      {proposalModalReq && (
        <SubmitProposalModal
          broker={user}
          requirement={proposalModalReq}
          inventory={inventory}
          existingProposals={proposals}
          onClose={() => setProposalModalReq(null)}
          onListNewProperty={() => {
            setProposalModalReq(null);
            router.push('/broker/properties/new');
          }}
          onCreateProperty={handleCreateProperty}
          onSubmitProposal={handleSubmitProposal}
        />
      )}
    </>
  );
}
