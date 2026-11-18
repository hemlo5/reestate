import { getDb, getSessionUser } from '@/lib/db';
import { SeekerSearchClient } from '@/components/seeker/SeekerSearchClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const db = getDb();
  const [user, propertiesPage] = await Promise.all([
    getSessionUser(),
    db.listProperties({ limit: 50 }),
  ]);

  const savedIds = user ? await db.getSavedPropertyIds(user.id) : [];

  return (
    <SeekerSearchClient
      initialProperties={propertiesPage.items}
      initialSavedIds={savedIds}
    />
  );
}
