import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDb, getSessionUser } from '@/lib/db';
import { sanitizeUser } from '@/lib/auth/session';
import { PublicBrokerProfileClient } from '@/components/broker/PublicBrokerProfileClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await getDb().getUserById(id);

  if (!user || user.role !== 'broker') {
    return { title: 'Broker Not Found' };
  }

  const bp = user.brokerProfile;
  const title = `${user.name}${bp?.agencyName ? ` — ${bp.agencyName}` : ''}`;
  const description =
    bp?.bio ||
    `Verified real estate specialist operating in ${bp?.operatingLocalities.join(', ') || user.city}.`;

  return {
    title,
    description,
    alternates: { canonical: `/brokers/${user.id}` },
    openGraph: {
      title,
      description,
      type: 'profile',
      images: bp?.avatarUrl || user.avatarUrl ? [{ url: (bp?.avatarUrl || user.avatarUrl)! }] : [],
    },
  };
}

export default async function BrokerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const [rawBroker, viewer, propPage, reviews] = await Promise.all([
    db.getUserById(id),
    getSessionUser(),
    db.listProperties({ brokerId: id, limit: 50 }),
    db.listReviewsForBroker(id),
  ]);

  if (!rawBroker || rawBroker.role !== 'broker') {
    notFound();
  }

  const broker = sanitizeUser(rawBroker);
  const initialSavedIds = viewer ? await db.getSavedPropertyIds(viewer.id) : [];

  const avgRating =
    reviews.length > 0
      ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1))
      : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: broker.name,
    worksFor: broker.brokerProfile?.agencyName || undefined,
    areaServed: broker.brokerProfile?.operatingLocalities || [broker.city],
    telephone: broker.brokerProfile?.phone || broker.phone,
    image: broker.brokerProfile?.avatarUrl || broker.avatarUrl,
    ...(avgRating && reviews.length > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: avgRating,
            reviewCount: reviews.length,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicBrokerProfileClient
        broker={broker}
        brokerProperties={propPage.items}
        initialReviews={reviews}
        initialSavedIds={initialSavedIds}
      />
    </>
  );
}
