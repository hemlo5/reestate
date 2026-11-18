import type { MetadataRoute } from 'next';
import { getDb } from '@/lib/db';
import { LOCALITIES, slugifyLocality } from '@/lib/matching';

export const dynamic = 'force-dynamic';

function resolveBaseUrl(): string {
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const vercelPreview = process.env.VERCEL_URL?.trim();
  for (const raw of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.APP_URL,
    vercelProd ? `https://${vercelProd}` : undefined,
    vercelPreview ? `https://${vercelPreview}` : undefined,
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
  let propItems: Awaited<ReturnType<ReturnType<typeof getDb>['listProperties']>>['items'] = [];
  let brokers: Awaited<ReturnType<ReturnType<typeof getDb>['listPublicBrokers']>> = [];

  try {
    const db = getDb();
    const [propPage, brokerList] = await Promise.all([
      db.listProperties({ limit: 100 }),
      db.listPublicBrokers(),
    ]);
    propItems = propPage.items;
    brokers = brokerList;
  } catch (err) {
    console.error('Sitemap DB error:', err);
  }

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

  const propertyRoutes: MetadataRoute.Sitemap = propItems.map((prop) => ({
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
