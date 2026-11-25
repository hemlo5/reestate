import type { Metadata } from 'next';
import { BrokerVerificationClient } from '@/components/broker/BrokerVerificationClient';

export const metadata: Metadata = {
  title: 'Broker Verification',
  description: 'Submit your state RERA registration and identity details for broker verification.',
};

export default function BrokerVerificationPage() {
  return <BrokerVerificationClient />;
}
