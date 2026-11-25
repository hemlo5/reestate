import type { Metadata } from 'next';
import { getDb, getSessionUser } from '@/lib/db';
import { BrokerInventoryClient } from '@/components/broker/BrokerInventoryClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Properties',
  description: 'Manage your listed flats, houses, villas, and commercial inventory on Hemlo.',
};

export default async function BrokerPropertiesPage() {
  const user = await getSessionUser();
  const db = getDb();

  if (!user || user.role !== 'broker') {
    return <BrokerInventoryClient initialInventory={[]} initialRequirements={[]} />;
  }

  const [inventoryPage, leadsPage] = await Promise.all([
    db.listProperties({ brokerId: user.id, includeUnavailable: true, limit: 100 }),
    db.getLeadsForBroker({ brokerId: user.id, limit: 50 }),
  ]);

  return (
    <BrokerInventoryClient
      initialInventory={inventoryPage.items}
      initialRequirements={leadsPage.items.map((item) => item.requirement)}
    />
  );
}
