import type { Metadata } from 'next';
import { AccountClient } from '@/components/auth/AccountClient';

export const metadata: Metadata = {
  title: 'Account & Switch Role',
  description: 'Manage your Housed profile or switch between Home Seeker and Property Broker accounts.',
};

export default function AccountPage() {
  return <AccountClient />;
}
