'use client';

import { useRouter } from 'next/navigation';
import type { RegisterInput, UpdateProfileInput } from '@/lib/validation/schemas';
import { useSession } from '@/components/providers/AppProviders';
import { BrokerOnboardingWizard } from './BrokerOnboardingWizard';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { apiClient } from '@/lib/api/client';

export function BrokerOnboardingClient() {
  const router = useRouter();
  const { user, register, registerAsBroker, updateProfile } = useSession();

  const existingBroker = user?.brokerProfile
    ? { ...user, role: 'broker' as const }
    : null;
  const existingSeeker = user && !user.brokerProfile && user.role === 'seeker' ? user : null;

  if (!user) {
    return <main className="mx-auto max-w-xl px-4 py-12 sm:py-16"><section className="rounded-3xl border border-[#E6E9EF] bg-white p-7 shadow-sm sm:p-9">
      <p className="text-xs font-semibold text-[#1A56FF]">Broker registration</p>
      <h1 className="mt-2 text-3xl font-bold text-[#0B1324]">Start with Google sign-in</h1>
      <p className="my-5 text-sm text-[#5E687A]">Authenticate your account first, then complete your broker profile. You can submit your broker verification from your dashboard afterward.</p>
      <GoogleSignInButton role="broker" next="/broker/onboarding" />
    </section></main>;
  }

  const handleCompleteNewBroker = async (payload: RegisterInput) => {
    await register(payload);
    router.push('/broker/dashboard');
    router.refresh();
  };

  const handleUpdateExistingBroker = async (updates: UpdateProfileInput) => {
    await updateProfile(updates);
    await apiClient.switchWorkspace('broker');
    router.push('/broker/dashboard');
    router.refresh();
  };

  const handlePromoteSeekerToBroker = async (updates: UpdateProfileInput) => {
    if (!updates.name || !updates.phone || !updates.city || !updates.brokerProfile) {
      throw new Error('Complete your personal and broker profile details first.');
    }
    await registerAsBroker({
      name: updates.name,
      phone: updates.phone,
      city: updates.city,
      avatarUrl: updates.avatarUrl,
      brokerProfile: updates.brokerProfile,
    });
    router.push('/broker/dashboard');
    router.refresh();
  };

  return (
    <BrokerOnboardingWizard
      existingBroker={existingBroker}
      existingSeeker={existingSeeker}
      onCancel={() => router.push(existingBroker ? '/broker/dashboard' : '/')}
      onCompleteNewBroker={handleCompleteNewBroker}
      onUpdateExistingBroker={handleUpdateExistingBroker}
      onPromoteSeekerToBroker={handlePromoteSeekerToBroker}
      onSwitchToLogin={() => router.push('/login?role=broker&next=/broker/dashboard')}
    />
  );
}
