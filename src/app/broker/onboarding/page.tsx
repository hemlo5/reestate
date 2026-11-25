import type { Metadata } from 'next';
import { BrokerOnboardingClient } from '@/components/broker/BrokerOnboardingClient';

export const metadata: Metadata = {
  title: 'Join as a Broker',
  description:
    'Create a broker profile on Housed and submit state RERA verification from your dashboard when ready.',
};

export default function BrokerOnboardingPage() {
  return <BrokerOnboardingClient />;
}
