'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AppNotification,
  Property,
  Proposal,
  Requirement,
  Visit,
  VisitStatus,
} from '@/types';
import type { CreatePropertyInput, CreateProposalInput } from '@/lib/validation/schemas';
import { apiClient } from '@/lib/api/client';
import { useSession } from '@/components/providers/AppProviders';
import { AuthGateCard } from '@/components/AuthGateCard';
import { BrokerDashboardView } from './BrokerDashboardView';

const SubmitProposalModal = dynamic(
  () => import('./SubmitProposalModal').then((m) => m.SubmitProposalModal),
  { ssr: false }
);

interface BrokerDashboardClientProps {
  initialRequirements: Requirement[];
  initialInventory: Property[];
  initialProposals: Proposal[];
  initialVisits: Visit[];
  initialNotifications: AppNotification[];
}

export function BrokerDashboardClient({
  initialRequirements,
  initialInventory,
  initialProposals,
  initialVisits,
  initialNotifications,
}: BrokerDashboardClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const isBroker = user?.role === 'broker';

  const [proposalModalReq, setProposalModalReq] = useState<Requirement | null>(null);
  const handleSharePortfolio = async () => {
    if (!user) return;
    const portfolioUrl = `${window.location.origin}/brokers/${user.id}`;
    try {
      await navigator.clipboard.writeText(portfolioUrl);
      window.alert('Public portfolio link copied to clipboard.');
    } catch {
      window.prompt('Copy your public portfolio link:', portfolioUrl);
    }
  };

  const { data: requirements = initialRequirements } = useQuery({
    queryKey: ['broker-leads-summary', user?.id],
    queryFn: async () =>
      (await apiClient.listBrokerLeads({ limit: 50 })).items.map((i) => i.requirement),
    initialData: isBroker ? initialRequirements : undefined,
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

  const { data: visits = initialVisits } = useQuery({
    queryKey: ['broker-visits', user?.id],
    queryFn: async () => (await apiClient.listVisits()).visits,
    initialData: isBroker ? initialVisits : undefined,
    enabled: Boolean(isBroker),
  });

  const { data: notifications = initialNotifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => (await apiClient.listNotifications()).notifications,
    initialData: isBroker ? initialNotifications : undefined,
    enabled: Boolean(isBroker),
  });

  if (!user || !isBroker) {
    return (
      <AuthGateCard
        requiredRole="broker"
        title={
          user
            ? 'Switch to a Property Broker account'
            : 'Sign in to access your Broker Dashboard'
        }
        description="Manage your property inventory, discover matching customer briefs, and send curated proposals."
      />
    );
  }

  const handleUpdateVisitStatus = async (visitId: string, status: VisitStatus) => {
    await apiClient.updateVisitStatus(visitId, status);
    await queryClient.invalidateQueries({ queryKey: ['broker-visits', user.id] });
    await queryClient.invalidateQueries({ queryKey: ['broker-proposals', user.id] });
  };

  const handleMarkNotificationsRead = async () => {
    await apiClient.markNotificationsRead();
    await queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
  };

  const handleCreateProperty = async (payload: CreatePropertyInput) => {
    const res = await apiClient.createProperty(payload);
    await queryClient.invalidateQueries({ queryKey: ['broker-inventory', user.id] });
    return res.property;
  };

  const handleSubmitProposal = async (payload: CreateProposalInput) => {
    await apiClient.createProposal(payload);
    await queryClient.invalidateQueries({ queryKey: ['broker-proposals', user.id] });
    await queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
    router.refresh();
  };

  return (
    <>
      <BrokerDashboardView
        broker={user}
        requirements={requirements}
        inventory={inventory}
        proposals={proposals}
        visits={visits}
        notifications={notifications}
        onAddNewProperty={() => router.push('/broker/properties/new')}
        onFindLeads={() => router.push('/broker/leads')}
        onManageInventory={() => router.push('/broker/properties')}
        onViewProposals={() => router.push('/broker/proposals')}
        onViewPublicProfile={() => router.push(`/brokers/${user.id}`)}
        onSharePortfolio={() => void handleSharePortfolio()}
        onCompleteVerification={() => router.push('/broker/verification')}
        onSubmitProposalFor={(req) => setProposalModalReq(req)}
        onUpdateVisitStatus={handleUpdateVisitStatus}
        onMarkNotificationsRead={handleMarkNotificationsRead}
      />

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
