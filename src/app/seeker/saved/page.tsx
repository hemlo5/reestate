import type { Metadata } from 'next';
import { getDb, getSessionUser } from '@/lib/db';
import { SavedAndVisitsClient } from '@/components/seeker/SavedAndVisitsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Saved Homes & Visits',
  description: 'Your shortlisted properties and scheduled Bengaluru property visits.',
};

export default async function SavedPage() {
  const user = await getSessionUser();
  const db = getDb();

  if (!user) {
    return (
      <SavedAndVisitsClient
        initialSavedProperties={[]}
        initialSavedIds={[]}
        initialVisits={[]}
        initialAllProperties={[]}
      />
    );
  }

  const [savedProperties, savedIds, visits, catalogPage] = await Promise.all([
    db.listSavedProperties(user.id),
    db.getSavedPropertyIds(user.id),
    db.listVisitsForUser(user.id, user.role),
    db.listProperties({ limit: 80 }),
  ]);

  return (
    <SavedAndVisitsClient
      initialSavedProperties={savedProperties}
      initialSavedIds={savedIds}
      initialVisits={visits}
      initialAllProperties={catalogPage.items}
    />
  );
}
