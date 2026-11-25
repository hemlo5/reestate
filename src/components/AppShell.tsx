'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bookmark,
  Building2,
  ClipboardList,
  Compass,
  LayoutDashboard,
  MapPin,
  MessageSquareText,
  Play,
  Search,
  UserCircle2,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';
import { useSession } from './providers/AppProviders';

interface NavLinkItem {
  href: string;
  label: string;
  badge?: number;
  matchPrefixes: string[];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const { user, proposalBadgeCount } = useSession();

  const role = user?.role ?? 'seeker';
  const isBroker = role === 'broker';

  const seekerLinks: NavLinkItem[] = user
    ? [
        { href: '/', label: 'Search', matchPrefixes: ['/', '/map', '/properties', '/locations'] },
        {
          href: '/seeker/requirements',
          label: 'My Requirements',
          matchPrefixes: ['/seeker/requirements'],
        },
        {
          href: '/seeker/proposals',
          label: 'Proposals',
          badge: proposalBadgeCount,
          matchPrefixes: ['/seeker/proposals'],
        },
        { href: '/seeker/saved', label: 'Saved', matchPrefixes: ['/seeker/saved'] },
      ]
    : [
        { href: '/', label: 'Search', matchPrefixes: ['/', '/locations'] },
        { href: '/map', label: 'Map', matchPrefixes: ['/map'] },
        { href: '/properties', label: 'Properties', matchPrefixes: ['/properties'] },
        {
          href: '/broker/onboarding',
          label: 'For Brokers',
          matchPrefixes: ['/broker/onboarding'],
        },
      ];

  const brokerLinks: NavLinkItem[] = [
    { href: '/broker/dashboard', label: 'Dashboard', matchPrefixes: ['/broker/dashboard'] },
    { href: '/broker/leads', label: 'Find Leads', matchPrefixes: ['/broker/leads'] },
    {
      href: '/broker/properties',
      label: 'My Properties',
      matchPrefixes: ['/broker/properties'],
    },
    {
      href: '/broker/proposals',
      label: 'Proposals',
      badge: proposalBadgeCount,
      matchPrefixes: ['/broker/proposals'],
    },
  ];

  const links = isBroker ? brokerLinks : seekerLinks;

  const isNavActive = (item: NavLinkItem) => {
    if (item.href === '/') {
      if (pathname === '/') return true;
      if (!user) return pathname.startsWith('/locations');
      return (
        pathname.startsWith('/map') ||
        pathname.startsWith('/properties') ||
        pathname.startsWith('/locations')
      );
    }
    return item.matchPrefixes.some(
      (prefix) => prefix !== '/' && pathname.startsWith(prefix)
    );
  };

  const homeHref = isBroker ? '/broker/dashboard' : '/';
  const ctaHref = isBroker ? '/broker/properties/new' : '/seeker/requirements/new';
  const ctaLabel = isBroker ? '+ List a Property' : 'Post Requirement';

  const hideMobileCta =
    pathname === '/' ||
    pathname === '/seeker/requirements/new' ||
    pathname === '/broker/properties/new';

  const mobileSeekerItems = user
    ? [
        { href: '/', label: 'Search', icon: Search, prefixes: ['/', '/map', '/properties'] },
        {
          href: '/seeker/requirements',
          label: 'Requests',
          icon: ClipboardList,
          prefixes: ['/seeker/requirements'],
        },
        {
          href: '/seeker/proposals',
          label: 'Proposals',
          icon: MessageSquareText,
          badge: proposalBadgeCount,
          prefixes: ['/seeker/proposals'],
        },
        { href: '/seeker/saved', label: 'Saved', icon: Bookmark, prefixes: ['/seeker/saved'] },
        { href: '/account', label: 'Account', icon: UserCircle2, prefixes: ['/account', '/login'] },
      ]
    : [
        { href: '/', label: 'Search', icon: Search, prefixes: ['/', '/locations'] },
        { href: '/map', label: 'Map', icon: MapPin, prefixes: ['/map'] },
        {
          href: '/seeker/requirements/new',
          label: 'Post Brief',
          icon: ClipboardList,
          prefixes: ['/seeker/requirements'],
        },
        {
          href: '/properties',
          label: 'Homes',
          icon: Building2,
          prefixes: ['/properties'],
        },
        { href: '/login', label: 'Sign In', icon: UserCircle2, prefixes: ['/login', '/account', '/register'] },
      ];

  const mobileBrokerItems = [
    {
      href: '/broker/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      prefixes: ['/broker/dashboard'],
    },
    { href: '/broker/leads', label: 'Find Leads', icon: Compass, prefixes: ['/broker/leads'] },
    {
      href: '/broker/properties',
      label: 'Properties',
      icon: Building2,
      prefixes: ['/broker/properties'],
    },
    {
      href: '/broker/proposals',
      label: 'Proposals',
      icon: MessageSquareText,
      badge: proposalBadgeCount,
      prefixes: ['/broker/proposals'],
    },
    {
      href: '/account',
      label: 'Account',
      icon: UserCircle2,
      prefixes: ['/account', '/broker/onboarding'],
    },
  ];

  const mobileItems = isBroker ? mobileBrokerItems : mobileSeekerItems;

  return (
    <div className="min-h-screen bg-white text-[#0B1324] flex flex-col">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E6E9EF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 md:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Title */}
          <BrandMark href={homeHref} />

          {/* Zone 2: 4 Single-line Nav Links (Desktop & Tablet) */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
            {links.map((link) => {
              const active = isNavActive(link);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative py-1.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1A56FF] rounded ${
                    active ? 'text-[#1A56FF]' : 'text-[#5E687A] hover:text-[#0B1324]'
                  }`}
                >
                  <span>{link.label}</span>
                  {typeof link.badge === 'number' && link.badge > 0 && (
                    <span className="ml-1.5 text-xs font-semibold tabular-nums text-[#1A56FF]">
                      ({link.badge})
                    </span>
                  )}
                  {active && (
                    <span
                      className="absolute left-0 right-0 -bottom-[17px] md:-bottom-[21px] h-[2px] bg-[#1A56FF]"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: Account / Sign In + Single Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {!isBroker && pathname === '/' && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('housed:open-demo'))}
                className="md:hidden inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#E6E9EF] bg-white px-2.5 text-xs font-semibold text-[#1A56FF]"
                aria-label="Watch the Housed demo"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Demo</span>
              </button>
            )}
            <ThemeToggle />
            {user ? (
              <Link
                href="/account"
                className={`hidden md:inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                  pathname.startsWith('/account')
                    ? 'bg-[#EEF3FF] text-[#1A56FF]'
                    : 'text-[#5E687A] hover:text-[#0B1324] hover:bg-[#F7F8FA]'
                }`}
              >
                <UserCircle2 className="h-4 w-4" strokeWidth={1.75} />
                <span className="max-w-[130px] truncate">{user.name.split(' ')[0]}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className={`hidden md:inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                  pathname.startsWith('/login') || pathname.startsWith('/account')
                    ? 'bg-[#EEF3FF] text-[#1A56FF]'
                    : 'text-[#5E687A] hover:text-[#0B1324] hover:bg-[#F7F8FA]'
                }`}
              >
                <UserCircle2 className="h-4 w-4" strokeWidth={1.75} />
                <span>Sign In</span>
              </Link>
            )}

            <Link
              href={ctaHref}
              className={`${
                hideMobileCta ? 'hidden md:inline-flex' : 'inline-flex'
              } px-3.5 md:px-4 py-1.5 md:py-2 text-xs sm:text-sm font-semibold text-white bg-[#1A56FF] hover:bg-[#1244D8] rounded-xl shadow-sm transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A56FF]`}
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#E6E9EF] bg-white px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-[#5E687A] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Housed. Property information is provided by users.</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Legal and help links">
            <Link href="/terms" className="hover:text-[#1A56FF]">Terms of Use</Link>
            <Link href="/privacy" className="hover:text-[#1A56FF]">Privacy Policy</Link>
            <Link href="/grievance" className="hover:text-[#1A56FF]">Grievance Officer</Link>
            <Link href="/property-disclaimer" className="hover:text-[#1A56FF]">Property checks</Link>
          </nav>
        </div>
      </footer>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E6E9EF]"
        aria-label="Mobile bottom navigation"
      >
        <div className="grid grid-cols-5 h-[60px] max-w-lg mx-auto">
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/'
                ? pathname === '/' || (Boolean(user) && pathname.startsWith('/map'))
                : item.prefixes.some((p) => p !== '/' && pathname.startsWith(p));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center min-h-[44px] px-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#1A56FF] ${
                  active ? 'text-[#1A56FF]' : 'text-[#5E687A] hover:text-[#0B1324]'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.75} />
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#1A56FF] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="text-[10.5px] font-medium tracking-tight mt-1 whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
