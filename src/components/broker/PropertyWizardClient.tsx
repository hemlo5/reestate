'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { Property } from '@/types';
import type { CreatePropertyInput } from '@/lib/validation/schemas';
import { apiClient } from '@/lib/api/client';
import { useSession } from '@/components/providers/AppProviders';
import { AuthGateCard } from '@/components/AuthGateCard';
import { PropertyListingWizard } from './PropertyListingWizard';

interface PropertyWizardClientProps {
  editingProperty?: Property | null;
}

export function PropertyWizardClient({ editingProperty }: PropertyWizardClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();

  if (!user || user.role !== 'broker') {
    return (
      <AuthGateCard
        requiredRole="broker"
        title={
          user
            ? 'Switch to a Property Broker account to list properties'
            : 'Sign in as a Property Broker to list a property'
        }
        description="Published listings are scored automatically against active customer requirements across Bengaluru."
      />
    );
  }

  const handleSaveProperty = async (
    payload: CreatePropertyInput,
    existingId?: string
  ): Promise<Property> => {
    const res = existingId
      ? await apiClient.updateProperty(existingId, payload)
      : await apiClient.createProperty(payload);

    await queryClient.invalidateQueries({ queryKey: ['broker-inventory', user.id] });
    await queryClient.invalidateQueries({ queryKey: ['properties-catalog'] });
    router.refresh();
    return res.property;
  };

  return (
    <PropertyListingWizard
      broker={user}
      editingProperty={editingProperty}
      onCancel={() => router.push('/broker/properties')}
      onSaveProperty={handleSaveProperty}
      onGoToInventory={() => router.push('/broker/properties')}
      onGoToLeads={() => router.push('/broker/leads')}
    />
  );
}
