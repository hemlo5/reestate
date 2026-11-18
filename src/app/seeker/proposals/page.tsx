import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getDb, getSessionUser } from '@/lib/db';
import { SeekerProposalsClient } from '@/components/seeker/SeekerProposalsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Broker Proposals',
  description: 'Compare curated broker property proposals side-by-side and book visits.',
};

export default async function SeekerProposalsPage() {
  const user = await getSessionUser();
  const db = getDb();
  const publicBrokers = await db.listPublicBrokers();

  if (!user || user.role !== 'seeker') {
    return (
      <Suspense>
        <SeekerProposalsClient
          initialRequirements={[]}
          initialProposals={[]}
          initialProperties={[]}
          publicBrokers={publicBrokers}
          initialSavedIds={[]}
        />
      </Suspense>
    );
  }

  const [requirements, proposals, propPage, savedIds] = await Promise.all([
    db.listRequirementsBySeeker(user.id),
    db.listProposalsForSeeker(user.id),
    db.listProperties({ limit: 80 }),
    db.getSavedPropertyIds(user.id),
  ]);

  return (
    <Suspense>
      <SeekerProposalsClient
        initialRequirements={requirements}
        initialProposals={proposals}
        initialProperties={propPage.items}
        publicBrokers={publicBrokers}
        initialSavedIds={savedIds}
      />
    </Suspense>
  );
}
