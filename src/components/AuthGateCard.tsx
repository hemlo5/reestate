'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, CheckCircle2, Lock, UserCircle2 } from 'lucide-react';
import type { UserRole } from '@/types';
import { useSession } from './providers/AppProviders';

interface AuthGateCardProps {
  requiredRole?: UserRole;
  title?: string;
  description?: string;
}

export function AuthGateCard({
  requiredRole,
  title,
  description,
}: AuthGateCardProps) {
  const { user, demoUsers, switchDemoUser } = useSession();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const filteredDemos = requiredRole
    ? demoUsers.filter((d) => d.role === requiredRole)
    : demoUsers;

  const roleLabel =
    requiredRole === 'broker'
      ? 'Property Broker'
      : requiredRole === 'seeker'
      ? 'Home Seeker'
      : 'Housed';

  const handleDemoSwitch = async (id: string) => {
    setError('');
    setBusyId(id);
    try {
      await switchDemoUser(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to switch demo session.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 pb-28">
      <div className="bg-white rounded-3xl border border-[#E6E9EF] shadow-[0_12px_36px_-8px_rgba(11,19,36,0.08)] p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#EEF3FF] text-[#1A56FF] flex items-center justify-center shrink-0">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#1A56FF]">
              {user ? `Signed in as ${user.name}` : 'Sign in required'}
            </p>
            <h1 className="mt-1 font-display text-xl sm:text-2xl font-bold text-[#0B1324]">
              {title ||
                (user && requiredRole
                  ? `Switch to a ${roleLabel} account`
                  : `Sign in to access your ${roleLabel} workspace`)}
            </h1>
            <p className="mt-1.5 text-sm text-[#5E687A]">
              {description ||
                'Sign in with your email and password or select a seeded demo account below to explore this workflow immediately.'}
            </p>
          </div>
        </div>

        {filteredDemos.length > 0 && (
          <div className="bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-4 sm:p-5 space-y-3">
            <p className="text-xs font-semibold text-[#0B1324]">
              Quick Demo Sign-In ({requiredRole === 'broker' ? 'Verified Brokers' : requiredRole === 'seeker' ? 'Home Seekers' : 'Demo Accounts'})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredDemos.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => handleDemoSwitch(demo.id)}
                  className="p-3.5 rounded-2xl bg-white border border-[#E6E9EF] hover:border-[#1A56FF] text-left transition-all flex items-center justify-between gap-3 disabled:opacity-60"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#1A56FF]">
                      {demo.role === 'seeker' ? 'Home Seeker' : 'Property Broker'}
                    </p>
                    <p className="mt-0.5 font-display text-sm font-bold text-[#0B1324] truncate">
                      {demo.name}
                    </p>
                    <p className="text-[11px] text-[#5E687A] truncate">
                      {demo.brokerProfile?.agencyName || demo.email}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#1A56FF] shrink-0">
                    {busyId === demo.id ? 'Signing in...' : 'Continue →'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="pt-2 border-t border-[#E6E9EF] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={requiredRole ? `/login?role=${requiredRole}` : '/login'}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold inline-flex items-center gap-2"
            >
              <UserCircle2 className="h-4 w-4" />
              <span>Sign in with Email</span>
            </Link>
            {requiredRole === 'broker' ? (
              <Link
                href="/broker/onboarding"
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] border border-[#E6E9EF] text-sm font-semibold text-[#0B1324] inline-flex items-center gap-2"
              >
                <Building2 className="h-4 w-4 text-[#1A56FF]" />
                <span>Join as a Broker</span>
              </Link>
            ) : (
              <Link
                href="/register"
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] border border-[#E6E9EF] text-sm font-semibold text-[#0B1324] inline-flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 text-[#1A56FF]" />
                <span>Create Account</span>
              </Link>
            )}
          </div>

          <Link
            href="/"
            className="text-xs font-semibold text-[#5E687A] hover:text-[#0B1324] inline-flex items-center gap-1"
          >
            <span>Back to Search</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
