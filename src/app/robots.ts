import type { MetadataRoute } from 'next';

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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/map', '/properties', '/brokers', '/locations'],
        disallow: ['/seeker/', '/broker/', '/account', '/api/', '/login', '/register'],
      },
    ],
    sitemap: `${BASE_URL.replace(/\/$/, '')}/sitemap.xml`,
  };
}
