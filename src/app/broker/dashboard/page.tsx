import type { Metadata } from 'next';
import { getDb, getSessionUser } from '@/lib/db';
import { BrokerDashboardClient } from '@/components/broker/BrokerDashboardClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Broker Dashboard',
  description: 'Overview of your active properties, matching home-seeker leads, proposals, and scheduled visits.',
};

export default async function BrokerDashboardPage() {
  const user = await getSessionUser();
  const db = getDb();

  if (!user || user.role !== 'broker') {
    return (
      <BrokerDashboardClient
        initialRequirements={[]}
        initialInventory={[]}
        initialProposals={[]}
        initialVisits={[]}
        initialNotifications={[]}
      />
    );
  }

  const [leadsPage, inventoryPage, proposals, visits, notifications] = await Promise.all([
    db.getLeadsForBroker({ brokerId: user.id, limit: 50 }),
    db.listProperties({ brokerId: user.id, includeUnavailable: true, limit: 100 }),
    db.listProposalsForBroker(user.id),
    db.listVisitsForUser(user.id, 'broker'),
    db.listNotificationsForUser(user.id),
  ]);

  return (
    <BrokerDashboardClient
      initialRequirements={leadsPage.items.map((item) => item.requirement)}
      initialInventory={inventoryPage.items}
      initialProposals={proposals}
      initialVisits={visits}
      initialNotifications={notifications}
    />
  );
}
