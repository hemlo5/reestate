import type { Metadata } from 'next';
import { BrokerOnboardingClient } from '@/components/broker/BrokerOnboardingClient';

export const metadata: Metadata = {
  title: 'Join as a Broker',
  description:
    'Register as a verified property broker on Housed, showcase your inventory, and pitch directly to active Bengaluru home seekers.',
};

export default function BrokerOnboardingPage() {
  return <BrokerOnboardingClient />;
}
