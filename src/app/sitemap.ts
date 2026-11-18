import type { MetadataRoute } from 'next';
import { getDb } from '@/lib/db';
import { LOCALITIES, slugifyLocality } from '@/lib/matching';

export const dynamic = 'force-dynamic';

function resolveBaseUrl(): string {
  for (const raw of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.APP_URL,
    'http://localhost:3000',
  ]) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    try {
      return new URL(trimmed).toString().replace(/\/$/, '');
    } catch {
      // Ignore invalid placeholder URL
    }
  }
  return 'http://localhost:3000';
}

const BASE_URL = resolveBaseUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getDb();
  const [propPage, brokers] = await Promise.all([
    db.listProperties({ limit: 100 }),
    db.listPublicBrokers(),
  ]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${BASE_URL}/map`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/properties`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
  ];

  const localityRoutes: MetadataRoute.Sitemap = LOCALITIES.map((loc) => ({
    url: `${BASE_URL}/locations/${slugifyLocality(loc)}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.85,
  }));

  const propertyRoutes: MetadataRoute.Sitemap = propPage.items.map((prop) => ({
    url: `${BASE_URL}/properties/${prop.id}`,
    lastModified: prop.createdAt ? new Date(prop.createdAt) : now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const brokerRoutes: MetadataRoute.Sitemap = brokers.map((broker) => ({
    url: `${BASE_URL}/brokers/${broker.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.75,
  }));

  return [...staticRoutes, ...localityRoutes, ...propertyRoutes, ...brokerRoutes];
}
