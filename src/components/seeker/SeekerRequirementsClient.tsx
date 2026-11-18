'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Proposal, Requirement, Visit } from '@/types';
import { apiClient } from '@/lib/api/client';
import { useSession } from '@/components/providers/AppProviders';
import { AuthGateCard } from '@/components/AuthGateCard';
import { SeekerDashboardView } from './SeekerDashboardView';

interface SeekerRequirementsClientProps {
  initialRequirements: Requirement[];
  initialProposals: Proposal[];
  initialVisits: Visit[];
  initialSavedCount: number;
}

export function SeekerRequirementsClient({
  initialRequirements,
  initialProposals,
  initialVisits,
  initialSavedCount,
}: SeekerRequirementsClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const isSeeker = user?.role === 'seeker';

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

  const { data: visits = initialVisits } = useQuery({
    queryKey: ['seeker-visits', user?.id],
    queryFn: async () => (await apiClient.listVisits()).visits,
    initialData: isSeeker ? initialVisits : undefined,
    enabled: Boolean(isSeeker),
  });

  const { data: savedData } = useQuery({
    queryKey: ['saved', user?.id],
    queryFn: () => apiClient.listSaved(),
    initialData: isSeeker ? { savedIds: Array(initialSavedCount).fill(''), properties: [] } : undefined,
    enabled: Boolean(isSeeker),
  });

  if (!user || !isSeeker) {
    return (
      <AuthGateCard
        requiredRole="seeker"
        title={
          user
            ? 'Switch to a Home Seeker account'
            : 'Sign in to view your posted requirements'
        }
        description="Track active briefs, pause requirements, and compare incoming broker proposals."
      />
    );
  }

  const handleToggleStatus = async (req: Requirement) => {
    const nextStatus = req.status === 'active' ? 'paused' : 'active';
    await apiClient.updateRequirement(req.id, { status: nextStatus });
    await queryClient.invalidateQueries({ queryKey: ['seeker-requirements', user.id] });
  };

  const handleDeleteRequirement = async (id: string) => {
    await apiClient.deleteRequirement(id);
    await queryClient.invalidateQueries({ queryKey: ['seeker-requirements', user.id] });
    await queryClient.invalidateQueries({ queryKey: ['seeker-proposals', user.id] });
  };

  return (
    <SeekerDashboardView
      requirements={requirements}
      proposals={proposals}
      visits={visits}
      savedCount={savedData?.savedIds.length ?? initialSavedCount}
      onPostNew={() => router.push('/seeker/requirements/new')}
      onViewProposals={(requirementId) =>
        router.push(
          requirementId
            ? `/seeker/proposals?requirementId=${encodeURIComponent(requirementId)}`
            : '/seeker/proposals'
        )
      }
      onToggleStatus={handleToggleStatus}
      onDeleteRequirement={handleDeleteRequirement}
      onOpenSaved={() => router.push('/seeker/saved')}
    />
  );
}
