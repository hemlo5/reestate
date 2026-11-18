import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDb, getSessionUser } from '@/lib/db';
import { formatINR } from '@/lib/matching';
import { PropertyDetailsClient } from '@/components/seeker/PropertyDetailsClient';

export const dynamic = 'force-dynamic';

interface PropertyPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const property = await getDb().getPropertyById(id);

  if (!property) {
    return { title: 'Property Not Found' };
  }

  const priceText = `${formatINR(property.price, property.intent)}${
    property.intent === 'rent' ? '/mo' : ''
  }`;
  const title = `${property.title} — ${priceText}`;
  const description = `${property.bedrooms} BHK ${property.propertyType} (${property.furnishing}, ${property.areaSqFt} sq.ft) in ${property.locality}, ${property.city}. Represented by ${property.brokerName}.`;

  return {
    title,
    description,
    alternates: { canonical: `/properties/${property.id}` },
    openGraph: {
      title,
      description,
      type: 'article',
      images: property.images[0] ? [{ url: property.images[0], alt: property.title }] : [],
    },
  };
}

export default async function PropertyDetailsPage({
  params,
  searchParams,
}: PropertyPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const contactOpen = sp.contact === '1';

  const db = getDb();
  const [property, viewer] = await Promise.all([
    db.getPropertyById(id),
    getSessionUser(),
  ]);

  if (!property) {
    notFound();
  }

  if (
    property.availability !== 'available' &&
    (!viewer || viewer.id !== property.brokerId)
  ) {
    notFound();
  }

  let initialSaved = false;
  let initialMessages: Awaited<ReturnType<typeof db.listMessagesForProperty>> = [];
  let initialVisits: Awaited<ReturnType<typeof db.listVisitsForUser>> = [];

  if (viewer) {
    const [savedIds, msgs, allVisits] = await Promise.all([
      db.getSavedPropertyIds(viewer.id),
      db.listMessagesForProperty(property.id, viewer.id),
      db.listVisitsForUser(viewer.id, viewer.role),
    ]);
    initialSaved = savedIds.includes(property.id);
    initialMessages = msgs;
    initialVisits = allVisits.filter((v) => v.propertyId === property.id);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.title,
    description: property.description,
    datePosted: property.createdAt,
    image: property.images,
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.address,
      addressLocality: property.locality,
      addressRegion: property.city,
      postalCode: property.pincode || undefined,
      addressCountry: 'IN',
    },
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: 'INR',
      availability:
        property.availability === 'available'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PropertyDetailsClient
        property={property}
        initialSaved={initialSaved}
        initialMessages={initialMessages}
        initialVisits={initialVisits}
        initialContactOpen={contactOpen}
      />
    </>
  );
}
