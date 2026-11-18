import type { Metadata } from 'next';
import { getDb, getSessionUser } from '@/lib/db';
import type { Requirement } from '@/types';
import { BrokerProposalsClient } from '@/components/broker/BrokerProposalsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Submitted Proposals',
  description: 'Track customer proposal responses, unlocked contact details, and direct messages.',
};

export default async function BrokerProposalsPage() {
  const user = await getSessionUser();
  const db = getDb();

  if (!user || user.role !== 'broker') {
    return (
      <BrokerProposalsClient
        initialProposals={[]}
        initialProperties={[]}
        initialRequirements={[]}
        initialMessages={[]}
      />
    );
  }

  const [proposals, inventoryPage, leadsPage, messages] = await Promise.all([
    db.listProposalsForBroker(user.id),
    db.listProperties({ brokerId: user.id, includeUnavailable: true, limit: 100 }),
    db.getLeadsForBroker({ brokerId: user.id, limit: 80 }),
    db.listMessagesForUser(user.id),
  ]);

  // Ensure every proposal has its requirement object (even if paused/fulfilled)
  const reqMap = new Map<string, Requirement>();
  for (const item of leadsPage.items) {
    reqMap.set(item.requirement.id, item.requirement);
  }
  const missingReqIds = Array.from(
    new Set(proposals.map((p) => p.requirementId).filter((id) => !reqMap.has(id)))
  );
  if (missingReqIds.length > 0) {
    const fetchedReqs = await Promise.all(
      missingReqIds.map((id) => db.getRequirementById(id))
    );
    for (const r of fetchedReqs) {
      if (r) reqMap.set(r.id, r);
    }
  }

  return (
    <BrokerProposalsClient
      initialProposals={proposals}
      initialProperties={inventoryPage.items}
      initialRequirements={Array.from(reqMap.values())}
      initialMessages={messages}
    />
  );
}
