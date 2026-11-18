import type { Metadata } from 'next';
import { DM_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import { getDb, getSessionUser } from '@/lib/db';
import { AppProviders } from '@/components/providers/AppProviders';
import { AppShell } from '@/components/AppShell';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

function resolveSiteUrl(): URL {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.APP_URL,
    'http://localhost:3000',
  ];
  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    try {
      return new URL(trimmed);
    } catch {
      // Skip malformed placeholder values
    }
  }
  return new URL('http://localhost:3000');
}

export const metadata: Metadata = {
  metadataBase: resolveSiteUrl(),
  title: {
    default: 'Housed — Reverse Real Estate Marketplace',
    template: '%s | Housed',
  },
  description:
    'Reverse real estate marketplace where home seekers post property requirements and verified local brokers pitch matched homes.',
  openGraph: {
    type: 'website',
    siteName: 'Housed',
    title: 'Housed — Reverse Real Estate Marketplace',
    description:
      'Post your housing criteria once. Receive verified property proposals from trusted local brokers with transparent brokerage.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Housed — Reverse Real Estate Marketplace',
    description:
      'Post your housing criteria once. Receive verified property proposals from trusted local brokers.',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const db = getDb();
  const [user, demoUsers] = await Promise.all([
    getSessionUser(),
    db.listDemoUsers(),
  ]);

  let proposalBadgeCount = 0;
  if (user) {
    if (user.role === 'seeker') {
      const proposals = await db.listProposalsForSeeker(user.id);
      proposalBadgeCount = proposals.filter((p) => p.status === 'pending').length;
    } else {
      const proposals = await db.listProposalsForBroker(user.id);
      proposalBadgeCount = proposals.filter((p) => p.status === 'pending').length;
    }
  }

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${plusJakarta.variable} ${dmSans.variable}`}
    >
      <body className="min-h-screen bg-white text-[#0B1324] antialiased">
        <AppProviders
          initialUser={user}
          initialDemoUsers={demoUsers}
          initialProposalBadgeCount={proposalBadgeCount}
        >
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
