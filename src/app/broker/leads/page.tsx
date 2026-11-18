import type { Metadata } from 'next';
import { getDb, getSessionUser } from '@/lib/db';
import { BrokerLeadsClient } from '@/components/broker/BrokerLeadsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Find Leads',
  description: 'Discover active Bengaluru home seeker requirements and submit property proposals.',
};

export default async function BrokerLeadsPage() {
  const user = await getSessionUser();
  const db = getDb();

  if (!user || user.role !== 'broker') {
    return (
      <BrokerLeadsClient
        initialRequirements={[]}
        initialNextCursor={null}
        initialInventory={[]}
        initialProposals={[]}
      />
    );
  }

  const [leadsPage, inventoryPage, proposals] = await Promise.all([
    db.getLeadsForBroker({ brokerId: user.id, limit: 40 }),
    db.listProperties({ brokerId: user.id, includeUnavailable: true, limit: 100 }),
    db.listProposalsForBroker(user.id),
  ]);

  return (
    <BrokerLeadsClient
      initialRequirements={leadsPage.items.map((item) => item.requirement)}
      initialNextCursor={leadsPage.nextCursor}
      initialInventory={inventoryPage.items}
      initialProposals={proposals}
    />
  );
}
