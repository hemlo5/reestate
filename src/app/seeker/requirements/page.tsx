import type { Metadata } from 'next';
import { getDb, getSessionUser } from '@/lib/db';
import { SeekerRequirementsClient } from '@/components/seeker/SeekerRequirementsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Requirements',
  description: 'Manage your active property briefs and track matched broker responses on Housed.',
};

export default async function SeekerRequirementsPage() {
  const user = await getSessionUser();
  const db = getDb();

  if (!user || user.role !== 'seeker') {
    return (
      <SeekerRequirementsClient
        initialRequirements={[]}
        initialProposals={[]}
        initialVisits={[]}
        initialSavedCount={0}
      />
    );
  }

  const [requirements, proposals, visits, savedIds] = await Promise.all([
    db.listRequirementsBySeeker(user.id),
    db.listProposalsForSeeker(user.id),
    db.listVisitsForUser(user.id, 'seeker'),
    db.getSavedPropertyIds(user.id),
  ]);

  return (
    <SeekerRequirementsClient
      initialRequirements={requirements}
      initialProposals={proposals}
      initialVisits={visits}
      initialSavedCount={savedIds.length}
    />
  );
}
