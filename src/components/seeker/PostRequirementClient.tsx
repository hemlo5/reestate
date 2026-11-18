'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { ListingIntent, PropertyCategory, SearchFilters } from '@/types';
import type { CreateRequirementInput } from '@/lib/validation/schemas';
import { apiClient } from '@/lib/api/client';
import { useSession } from '@/components/providers/AppProviders';
import { AuthGateCard } from '@/components/AuthGateCard';
import { PostRequirementWizard } from './PostRequirementWizard';

export function PostRequirementClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useSession();

  if (!user || user.role !== 'seeker') {
    return (
      <AuthGateCard
        requiredRole="seeker"
        title={
          user
            ? 'Switch to a Home Seeker account to post a requirement'
            : 'Sign in as a Home Seeker to post your requirement'
        }
        description="Home seekers post their property brief once and verified brokers send matched property proposals straight to your inbox."
      />
    );
  }

  const intentParam = searchParams.get('intent');
  const localityParam = searchParams.get('locality');
  const typeParam = searchParams.get('propertyType');
  const bedroomsParam = searchParams.get('bedrooms');
  const budgetParam = searchParams.get('budgetMax');

  const initialPrefill: Partial<SearchFilters> = {
    intent: intentParam === 'buy' || intentParam === 'rent' ? (intentParam as ListingIntent) : undefined,
    locality: localityParam || undefined,
    propertyType:
      typeParam === 'Flat' || typeParam === 'House' || typeParam === 'Room'
        ? (typeParam as PropertyCategory)
        : undefined,
    bedrooms: bedroomsParam ? Number.parseInt(bedroomsParam, 10) || undefined : undefined,
    budgetMax: budgetParam ? Number.parseInt(budgetParam, 10) || undefined : undefined,
  };

  const handleSubmit = async (payload: CreateRequirementInput) => {
    await apiClient.createRequirement(payload);
    await queryClient.invalidateQueries({ queryKey: ['seeker-requirements'] });
    await queryClient.invalidateQueries({ queryKey: ['seeker-proposals'] });
    router.push('/seeker/requirements');
    router.refresh();
  };

  return (
    <PostRequirementWizard
      user={user}
      initialPrefill={initialPrefill}
      onCancel={() => router.push('/')}
      onSubmit={handleSubmit}
    />
  );
}
