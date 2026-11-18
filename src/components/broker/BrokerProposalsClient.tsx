'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Message,
  Property,
  Proposal,
  ProposalLifecycleStatus,
  Requirement,
} from '@/types';
import { apiClient } from '@/lib/api/client';
import { useSession } from '@/components/providers/AppProviders';
import { AuthGateCard } from '@/components/AuthGateCard';
import { BrokerProposalsView } from './BrokerProposalsView';

interface BrokerProposalsClientProps {
  initialProposals: Proposal[];
  initialProperties: Property[];
  initialRequirements: Requirement[];
  initialMessages: Message[];
}

export function BrokerProposalsClient({
  initialProposals,
  initialProperties,
  initialRequirements,
  initialMessages,
}: BrokerProposalsClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, setProposalBadgeCount } = useSession();
  const isBroker = user?.role === 'broker';

  const { data: proposals = initialProposals } = useQuery({
    queryKey: ['broker-proposals', user?.id],
    queryFn: async () => (await apiClient.listProposals()).proposals,
    initialData: isBroker ? initialProposals : undefined,
    enabled: Boolean(isBroker),
  });

  const { data: properties = initialProperties } = useQuery({
    queryKey: ['broker-inventory', user?.id],
    queryFn: async () =>
      (
        await apiClient.listProperties({
          brokerId: user?.id,
          includeUnavailable: true,
          limit: 100,
        })
      ).items,
    initialData: isBroker ? initialProperties : undefined,
    enabled: Boolean(isBroker),
  });

  const { data: leadRequirements = initialRequirements } = useQuery({
    queryKey: ['broker-leads-summary', user?.id],
    queryFn: async () =>
      (await apiClient.listBrokerLeads({ limit: 80 })).items.map((i) => i.requirement),
    initialData: isBroker ? initialRequirements : undefined,
    enabled: Boolean(isBroker),
  });

  const { data: messages = initialMessages } = useQuery({
    queryKey: ['messages', user?.id],
    queryFn: async () => (await apiClient.listMessages()).messages,
    initialData: isBroker ? initialMessages : undefined,
    enabled: Boolean(isBroker),
  });

  useEffect(() => {
    if (isBroker) {
      setProposalBadgeCount(proposals.filter((p) => p.status !== 'declined').length);
    }
  }, [isBroker, proposals, setProposalBadgeCount]);

  if (!user || !isBroker) {
    return (
      <AuthGateCard
        requiredRole="broker"
        title={
          user
            ? 'Switch to a Property Broker account'
            : 'Sign in to track your submitted proposals'
        }
        description="Monitor seeker interest, unlocked contact details, and reply directly to interested prospects."
      />
    );
  }

  // Merge SSR-resolved requirement snapshots (including paused/fulfilled ones) with live leads
  const reqMap = new Map<string, Requirement>();
  for (const r of initialRequirements) reqMap.set(r.id, r);
  for (const r of leadRequirements) reqMap.set(r.id, r);
  const requirements = Array.from(reqMap.values());

  const handleSendMessage = async (payload: {
    propertyId: string;
    recipientId: string;
    proposalId?: string;
    body: string;
  }) => {
    await apiClient.createMessage(payload);
    await queryClient.invalidateQueries({ queryKey: ['messages', user.id] });
  };

  const handleUpdateProposal = async (
    proposalId: string,
    updates: { statusDetail?: ProposalLifecycleStatus }
  ) => {
    await apiClient.updateProposal(proposalId, updates);
    await queryClient.invalidateQueries({ queryKey: ['broker-proposals', user.id] });
    router.refresh();
  };

  return (
    <BrokerProposalsView
      broker={user}
      proposals={proposals}
      properties={properties}
      requirements={requirements}
      messages={messages}
      onSendMessage={handleSendMessage}
      onUpdateProposal={handleUpdateProposal}
    />
  );
}
