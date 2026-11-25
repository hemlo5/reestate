import { getDb, getSessionUser } from '@/lib/db';
import { SeekerSearchClient } from '@/components/seeker/SeekerSearchClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getSessionUser();
  if (user?.role === 'broker') redirect('/broker/dashboard');

  let initialProperties: Awaited<
    ReturnType<ReturnType<typeof getDb>['listProperties']>
  >['items'] = [];
  let savedIds: string[] = [];

  try {
    const db = getDb();
    const propertiesPage = await db.listProperties({ limit: 50 });
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
