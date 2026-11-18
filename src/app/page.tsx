import { getDb, getSessionUser } from '@/lib/db';
import { SeekerSearchClient } from '@/components/seeker/SeekerSearchClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let initialProperties: Awaited<
    ReturnType<ReturnType<typeof getDb>['listProperties']>
  >['items'] = [];
  let savedIds: string[] = [];

  try {
    const db = getDb();
    const [user, propertiesPage] = await Promise.all([
      getSessionUser(),
      db.listProperties({ limit: 50 }),
    ]);
    initialProperties = propertiesPage.items;
    savedIds = user ? await db.getSavedPropertyIds(user.id) : [];
  } catch (err) {
    console.error('HomePage bootstrap error:', err);
  }

  return (
    <SeekerSearchClient
      initialProperties={initialProperties}
      initialSavedIds={savedIds}
    />
  );
}
