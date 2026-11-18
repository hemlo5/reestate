'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Property, Proposal, ProposalStatus, Requirement, User } from '@/types';
import { apiClient } from '@/lib/api/client';
import { useSession } from '@/components/providers/AppProviders';
import { AuthGateCard } from '@/components/AuthGateCard';
import { ProposalsView } from './ProposalsView';

interface SeekerProposalsClientProps {
  initialRequirements: Requirement[];
  initialProposals: Proposal[];
  initialProperties: Property[];
  publicBrokers: User[];
  initialSavedIds: string[];
}

export function SeekerProposalsClient({
  initialRequirements,
  initialProposals,
  initialProperties,
  publicBrokers,
  initialSavedIds,
}: SeekerProposalsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, setProposalBadgeCount } = useSession();
  const isSeeker = user?.role === 'seeker';

  const reqParam = searchParams.get('requirementId') || 'all';
  const [filterReqId, setFilterReqId] = useState<string | 'all'>(reqParam);

  useEffect(() => {
    setFilterReqId(reqParam);
  }, [reqParam]);

  const { data: requirements = initialRequirements } = useQuery({
    queryKey: ['seeker-requirements', user?.id],
    queryFn: async () => (await apiClient.listRequirements()).requirements,
    initialData: isSeeker ? initialRequirements : undefined,
    enabled: Boolean(isSeeker),
  });

  const { data: proposals = initialProposals } = useQuery({
    queryKey: ['seeker-proposals', user?.id],
    queryFn: async () => (await apiClient.listProposals()).proposals,
    initialData: isSeeker ? initialProposals : undefined,
    enabled: Boolean(isSeeker),
  });

  const { data: properties = initialProperties } = useQuery({
    queryKey: ['properties-catalog'],
    queryFn: async () => (await apiClient.listProperties({ limit: 80 })).items,
    initialData: initialProperties,
    enabled: Boolean(isSeeker),
  });

  const { data: savedData } = useQuery({
    queryKey: ['saved', user?.id],
    queryFn: () => apiClient.listSaved(),
    initialData: isSeeker ? { savedIds: initialSavedIds, properties: [] } : undefined,
    enabled: Boolean(isSeeker),
  });

  const savedIds = savedData?.savedIds ?? initialSavedIds;

  useEffect(() => {
    if (isSeeker) {
      setProposalBadgeCount(proposals.filter((p) => p.status !== 'declined').length);
    }
  }, [isSeeker, proposals, setProposalBadgeCount]);

  if (!user || !isSeeker) {
    return (
      <AuthGateCard
        requiredRole="seeker"
        title={
          user
            ? 'Switch to a Home Seeker account to inspect proposals'
            : 'Sign in to compare broker proposals'
        }
        description="Review matched homes pitched directly by Bengaluru brokers, compare up to 3 side-by-side, and control when your phone & email are shared."
      />
    );
  }

  const handleToggleSave = async (propertyId: string) => {
    await apiClient.toggleSaved(propertyId);
    await queryClient.invalidateQueries({ queryKey: ['saved', user.id] });
  };

  const handleUpdateProposalStatus = async (proposalId: string, status: ProposalStatus) => {
    await apiClient.updateProposal(proposalId, {
      status,
      ...(status === 'accepted' ? { contactShared: true } : {}),
    });
    await queryClient.invalidateQueries({ queryKey: ['seeker-proposals', user.id] });
    router.refresh();
  };

  const handleShareContact = async (proposalId: string) => {
    await apiClient.updateProposal(proposalId, { contactShared: true });
    await queryClient.invalidateQueries({ queryKey: ['seeker-proposals', user.id] });
  };

  const handleMarkViewed = async (proposalId: string) => {
    await apiClient.updateProposal(proposalId, { markViewed: true });
    await queryClient.invalidateQueries({ queryKey: ['seeker-proposals', user.id] });
  };

  return (
    <ProposalsView
      requirements={requirements}
      proposals={proposals}
      properties={properties}
      brokers={publicBrokers}
      savedIds={savedIds}
      filterRequirementId={filterReqId}
      onChangeFilterRequirement={(id) => {
        setFilterReqId(id);
        router.replace(
          id === 'all'
            ? '/seeker/proposals'
            : `/seeker/proposals?requirementId=${encodeURIComponent(id)}`
        );
      }}
      onToggleSave={handleToggleSave}
      onViewDetails={(property, focusContact) =>
        router.push(`/properties/${property.id}${focusContact ? '?contact=1' : ''}`)
      }
      onUpdateProposalStatus={handleUpdateProposalStatus}
      onOpenBrokerProfile={(brokerId) => router.push(`/brokers/${brokerId}`)}
      onShareContact={handleShareContact}
      onMarkProposalViewed={handleMarkViewed}
    />
  );
}
