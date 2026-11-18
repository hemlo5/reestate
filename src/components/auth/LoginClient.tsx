'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, CheckCircle2, Lock, Mail, UserCircle2 } from 'lucide-react';
import type { User, UserRole } from '@/types';
import { useSession } from '@/components/providers/AppProviders';

function sanitizeNextPath(raw: string | null, role: UserRole): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) {
    return raw;
  }
  return role === 'broker' ? '/broker/dashboard' : '/';
}

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, demoUsers, login, switchDemoUser, logout } = useSession();

  const roleHint = searchParams.get('role');
  const nextParam = searchParams.get('next');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const loggedIn = await login(email.trim(), password);
      router.push(sanitizeNextPath(nextParam, loggedIn.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSwitch = async (demo: User) => {
    setError('');
    setSwitchingId(demo.id);
    try {
      const loggedIn = await switchDemoUser(demo.id);
      router.push(sanitizeNextPath(nextParam, loggedIn.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to switch demo session.');
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 pb-28 md:pb-14">
      {user && (
        <div className="mb-6 bg-[#EEF3FF] border border-[#1A56FF]/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-[#0B1324]">
            Signed in as <span className="font-bold">{user.name}</span> ({user.role === 'broker' ? 'Property Broker' : 'Home Seeker'}).
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={user.role === 'broker' ? '/broker/dashboard' : '/seeker/requirements'}
              className="px-3.5 py-2 rounded-xl bg-[#1A56FF] text-white text-xs font-semibold"
            >
              Go to Workspace
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#E6E9EF] text-xs font-semibold text-[#5E687A] hover:text-[#0B1324]"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Email & Password Form */}
        <section className="lg:col-span-6 bg-white rounded-3xl border border-[#E6E9EF] shadow-[0_12px_36px_-8px_rgba(11,19,36,0.08)] p-6 sm:p-8">
          <p className="text-xs font-semibold text-[#1A56FF]">
            {roleHint === 'broker'
              ? 'Broker Portal Sign-In'
              : roleHint === 'seeker'
              ? 'Home Seeker Sign-In'
              : 'Welcome back to Housed'}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#0B1324]">
            Sign in to your account
          </h1>
          <p className="mt-1.5 text-sm text-[#5E687A]">
            Access saved homes, requirement briefs, or manage matched leads and proposals.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-[#5E687A] inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Email Address
              </span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] focus:outline-none focus:bg-white focus:border-[#1A56FF]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-[#5E687A] inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Password
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] focus:outline-none focus:bg-white focus:border-[#1A56FF]"
              />
            </label>

            {error && (
              <p className="text-sm font-medium text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] px-5 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E6E9EF] space-y-3">
            <p className="text-xs text-[#5E687A]">New to Housed?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Link
                href="/register"
                className="min-h-[42px] px-3.5 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] border border-[#E6E9EF] text-xs font-semibold text-[#0B1324] flex items-center justify-center gap-1.5"
              >
                <UserCircle2 className="h-4 w-4 text-[#1A56FF]" />
                <span>Register as Seeker</span>
              </Link>
              <Link
                href="/broker/onboarding"
                className="min-h-[42px] px-3.5 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] border border-[#E6E9EF] text-xs font-semibold text-[#0B1324] flex items-center justify-center gap-1.5"
              >
                <Building2 className="h-4 w-4 text-[#1A56FF]" />
                <span>Join as a Broker</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Right: 1-Click Demo Quick Sign-In */}
        <section className="lg:col-span-6 bg-[#F7F8FA] rounded-3xl border border-[#E6E9EF] p-6 sm:p-8 space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#1A56FF]">Instant Exploration</p>
            <h2 className="mt-1 font-display text-xl font-bold text-[#0B1324]">
              1-Click Demo Accounts
            </h2>
            <p className="mt-1 text-xs text-[#5E687A]">
              Explore Housed immediately as a Bengaluru home seeker or verified broker. Demo credentials also work in the form (<code className="font-mono text-[#0B1324]">housed123</code>).
            </p>
          </div>

          <div className="space-y-3">
            {demoUsers.map((demo) => {
              const active = user?.id === demo.id;
              return (
                <button
                  key={demo.id}
                  type="button"
                  disabled={switchingId !== null}
                  onClick={() => handleDemoSwitch(demo)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                    active
                      ? 'bg-[#EEF3FF] border-[#1A56FF]'
                      : 'bg-white border-[#E6E9EF] hover:border-[#1A56FF]'
                  } disabled:opacity-60`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#1A56FF]">
                        {demo.role === 'seeker' ? 'Home Seeker' : 'Property Broker'}
                      </span>
                      {active && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-display text-sm font-bold text-[#0B1324]">
                      {demo.name}
                    </p>
                    <p className="text-xs text-[#5E687A] truncate">
                      {demo.brokerProfile?.agencyName || demo.email}
                    </p>
                    {demo.brokerProfile?.operatingLocalities && (
                      <p className="mt-0.5 text-[11px] text-[#5E687A] truncate">
                        {demo.brokerProfile.operatingLocalities.join(' · ')}
                      </p>
                    )}
                  </div>

                  <span className="text-xs font-semibold text-[#1A56FF] shrink-0">
                    {switchingId === demo.id ? 'Signing in...' : 'Continue →'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
