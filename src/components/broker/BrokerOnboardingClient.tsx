'use client';

import { useRouter } from 'next/navigation';
import type { RegisterInput, UpdateProfileInput } from '@/lib/validation/schemas';
import { useSession } from '@/components/providers/AppProviders';
import { BrokerOnboardingWizard } from './BrokerOnboardingWizard';

export function BrokerOnboardingClient() {
  const router = useRouter();
  const { user, register, updateProfile } = useSession();

  const existingBroker = user?.role === 'broker' ? user : null;

  const handleCompleteNewBroker = async (payload: RegisterInput) => {
    await register(payload);
    router.push('/broker/dashboard');
    router.refresh();
  };

  const handleUpdateExistingBroker = async (updates: UpdateProfileInput) => {
    await updateProfile(updates);
    router.push('/broker/dashboard');
    router.refresh();
  };

  return (
    <BrokerOnboardingWizard
      existingBroker={existingBroker}
      onCancel={() => router.push(existingBroker ? '/broker/dashboard' : '/')}
      onCompleteNewBroker={handleCompleteNewBroker}
      onUpdateExistingBroker={handleUpdateExistingBroker}
      onSwitchToLogin={() => router.push('/login?role=broker&next=/broker/dashboard')}
    />
  );
}
