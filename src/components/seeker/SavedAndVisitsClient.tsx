'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Property, Visit } from '@/types';
import { apiClient } from '@/lib/api/client';
import { useSession } from '@/components/providers/AppProviders';
import { AuthGateCard } from '@/components/AuthGateCard';
import { SavedAndVisitsView } from './SavedAndVisitsView';

interface SavedAndVisitsClientProps {
  initialSavedProperties: Property[];
  initialSavedIds: string[];
  initialVisits: Visit[];
  initialAllProperties: Property[];
}

export function SavedAndVisitsClient({
  initialSavedProperties,
  initialSavedIds,
  initialVisits,
  initialAllProperties,
}: SavedAndVisitsClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();

  const { data: savedData } = useQuery({
    queryKey: ['saved', user?.id],
    queryFn: () => apiClient.listSaved(),
    initialData: user
      ? { savedIds: initialSavedIds, properties: initialSavedProperties }
      : undefined,
    enabled: Boolean(user),
  });

  const { data: visits = initialVisits } = useQuery({
    queryKey: ['seeker-visits', user?.id],
    queryFn: async () => (await apiClient.listVisits()).visits,
    initialData: user ? initialVisits : undefined,
    enabled: Boolean(user),
  });

  const { data: catalog = initialAllProperties } = useQuery({
    queryKey: ['properties-catalog'],
    queryFn: async () => (await apiClient.listProperties({ limit: 80 })).items,
    initialData: initialAllProperties,
    enabled: Boolean(user),
  });

  if (!user) {
    return (
      <AuthGateCard
        requiredRole="seeker"
        title="Sign in to view saved properties & scheduled visits"
        description="Access your bookmarked residences and manage upcoming property tours across Bengaluru."
      />
    );
  }

  const savedProperties = savedData?.properties ?? initialSavedProperties;
  const savedIds = savedData?.savedIds ?? initialSavedIds;

  const handleToggleSave = async (propertyId: string) => {
    await apiClient.toggleSaved(propertyId);
    await queryClient.invalidateQueries({ queryKey: ['saved', user.id] });
  };

  const handleCancelVisit = async (visitId: string) => {
    await apiClient.updateVisitStatus(visitId, 'cancelled');
    await queryClient.invalidateQueries({ queryKey: ['seeker-visits', user.id] });
    router.refresh();
  };

  return (
    <SavedAndVisitsView
      savedProperties={savedProperties}
      visits={visits}
      allProperties={catalog}
      savedIds={savedIds}
      onToggleSave={handleToggleSave}
      onViewDetails={(property) => router.push(`/properties/${property.id}`)}
      onExploreSearch={() => router.push('/')}
      onCancelVisit={handleCancelVisit}
    />
  );
}
