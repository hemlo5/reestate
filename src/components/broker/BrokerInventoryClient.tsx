'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Property, Requirement } from '@/types';
import { apiClient } from '@/lib/api/client';
import { useSession } from '@/components/providers/AppProviders';
import { AuthGateCard } from '@/components/AuthGateCard';
import { BrokerInventoryView } from './BrokerInventoryView';

interface BrokerInventoryClientProps {
  initialInventory: Property[];
  initialRequirements: Requirement[];
}

export function BrokerInventoryClient({
  initialInventory,
  initialRequirements,
}: BrokerInventoryClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const isBroker = user?.role === 'broker';

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

  const { data: requirements = initialRequirements } = useQuery({
    queryKey: ['broker-leads-summary', user?.id],
    queryFn: async () =>
      (await apiClient.listBrokerLeads({ limit: 50 })).items.map((i) => i.requirement),
    initialData: isBroker ? initialRequirements : undefined,
    enabled: Boolean(isBroker),
  });

  if (!user || !isBroker) {
    return (
      <AuthGateCard
        requiredRole="broker"
        title={
          user
            ? 'Switch to a Property Broker account'
            : 'Sign in to manage your property inventory'
        }
        description="List, edit, publish, pause, or mark properties as rented/sold from one workspace."
      />
    );
  }

  const handleUpdateProperty = async (id: string, updates: Partial<Property>) => {
    await apiClient.updateProperty(id, {
      availability: updates.availability,
    });
    await queryClient.invalidateQueries({ queryKey: ['broker-inventory', user.id] });
    router.refresh();
  };

  const handleDeleteProperty = async (id: string) => {
    await apiClient.deleteProperty(id);
    await queryClient.invalidateQueries({ queryKey: ['broker-inventory', user.id] });
    router.refresh();
  };

  return (
    <BrokerInventoryView
      inventory={inventory}
      requirements={requirements}
      onListNewProperty={() => router.push('/broker/properties/new')}
      onEditProperty={(prop) => router.push(`/broker/properties/${prop.id}/edit`)}
      onViewProperty={(prop) => router.push(`/properties/${prop.id}`)}
      onUpdateProperty={handleUpdateProperty}
      onDeleteProperty={handleDeleteProperty}
    />
  );
}
