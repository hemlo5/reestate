'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import { getBrokerVerificationLabel, isBrokerVerified } from '@/lib/matching';
import { useSession } from '@/components/providers/AppProviders';
import { AuthGateCard } from '@/components/AuthGateCard';
import { PropertyImage } from '@/components/PropertyImage';

export function AccountClient() {
  const router = useRouter();
  const { user, demoUsers, switchDemoUser, updateProfile, logout } = useSession();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || 'Bengaluru');
  const [agencyName, setAgencyName] = useState(user?.brokerProfile?.agencyName || '');
  const [bio, setBio] = useState(user?.brokerProfile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [error, setError] = useState('');
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
      setCity(user.city);
      setAgencyName(user.brokerProfile?.agencyName || '');
      setBio(user.brokerProfile?.bio || '');
    }
  }, [user]);

  if (!user) {
    return (
      <AuthGateCard
        title="Manage your Housed account"
        description="Sign in with Google to manage your Housed profile."
      />
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        ...(user.role === 'broker'
          ? {
              brokerProfile: {
                agencyName: agencyName.trim(),
                bio: bio.trim(),
              },
            }
          : {}),
      });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchDemo = async (demoId: string, role: 'seeker' | 'broker') => {
    setSwitchingId(demoId);
    try {
      await switchDemoUser(demoId);
      router.push(role === 'broker' ? '/broker/dashboard' : '/');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 md:pb-14 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1324]">
            Account & Role Switcher
          </h1>
          <p className="mt-1 text-sm text-[#5E687A]">
            Switch between Home Seeker and Property Broker accounts or manage your profile details.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="min-h-[42px] px-4 rounded-xl bg-white hover:bg-[#F7F8FA] border border-[#E6E9EF] text-xs font-semibold text-[#5E687A] hover:text-red-600 inline-flex items-center gap-1.5"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Role Switcher Cards */}
      <section className="bg-[#F7F8FA] rounded-3xl border border-[#E6E9EF] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-[#0B1324]">
              Demo Accounts & Workspace Switcher
            </h2>
            <p className="text-xs text-[#5E687A]">
              Explore both sides of the reverse marketplace with one click.
            </p>
          </div>
          <Link
            href="/broker/onboarding"
            className="text-xs font-semibold text-[#1A56FF] hover:text-[#1244D8] inline-flex items-center gap-1"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>
              {user.role === 'broker' ? 'Edit Broker Onboarding →' : 'Register New Broker →'}
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {demoUsers.map((u) => {
            const active = u.id === user.id;
            return (
              <button
                key={u.id}
                type="button"
                disabled={switchingId !== null}
                onClick={() => handleSwitchDemo(u.id, u.role)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  active
                    ? 'bg-[#EEF3FF] border-[#1A56FF] shadow-sm'
                    : 'bg-white border-[#E6E9EF] hover:border-[#1A56FF]/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#1A56FF]">
                      {u.role === 'seeker' ? 'Home Seeker' : 'Property Broker'}
                    </span>
                    {active && <CheckCircle2 className="h-3.5 w-3.5 text-[#1A56FF]" />}
                  </div>
                  <p className="mt-1 font-display text-sm font-bold text-[#0B1324]">{u.name}</p>
                  <p className="text-xs text-[#5E687A] truncate">
                    {u.brokerProfile?.agencyName || u.email}
                  </p>
                </div>
                <p className="text-[11px] text-[#5E687A] line-clamp-1">
                  {switchingId === u.id
                    ? 'Switching...'
                    : u.brokerProfile
                    ? u.brokerProfile.operatingLocalities.slice(0, 2).join(', ')
                    : 'Posts home requirements'}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Profile Editor */}
      <section className="bg-white rounded-3xl border border-[#E6E9EF] p-6 sm:p-8 shadow-[0_4px_20px_-2px_rgba(11,19,36,0.04)] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {user.avatarUrl || user.brokerProfile?.avatarUrl ? (
              <PropertyImage
                src={user.avatarUrl || user.brokerProfile?.avatarUrl}
                alt={user.name}
                className="h-14 w-14 rounded-2xl shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-[#EEF3FF] text-[#1A56FF] flex items-center justify-center">
                <UserCircle2 className="h-7 w-7" />
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-bold text-[#0B1324]">{user.name}</h2>
                <span className="text-xs font-semibold text-[#1A56FF] capitalize">
                  {user.role === 'broker' ? 'Property Broker' : 'Home Seeker'}
                </span>
                {user.role === 'broker' && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      isBrokerVerified(user) ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {isBrokerVerified(user) ? (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    ) : (
                      <ShieldAlert className="h-3.5 w-3.5" />
                    )}
                    {getBrokerVerificationLabel(user)}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#5E687A]">{user.email}</p>
            </div>
          </div>

          {user.role === 'broker' && (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/brokers/${user.id}`}
                className="min-h-[40px] px-3.5 rounded-xl border border-[#E6E9EF] text-xs font-semibold text-[#0B1324] hover:bg-[#F7F8FA] inline-flex items-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>View Public Profile</span>
              </Link>
              <Link
                href="/broker/onboarding"
                className="min-h-[40px] px-3.5 rounded-xl bg-[#EEF3FF] text-xs font-semibold text-[#1A56FF] inline-flex items-center"
              >
                Update Agency & KYC →
              </Link>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-[#5E687A]">Full Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-[#5E687A]">Phone Number</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] tabular-nums"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-[#5E687A]">City</span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
              />
            </label>
          </div>

          {user.role === 'broker' && (
            <div className="space-y-4 pt-2 border-t border-[#E6E9EF]">
              <Link href="/broker/verification" className="text-sm font-semibold text-[#1A56FF] hover:underline">Submit broker verification</Link>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-[#5E687A]">Agency Name</span>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-[#5E687A]">Broker Bio</span>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                />
              </label>
            </div>
          )}

          {error && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] px-5 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            {savedToast && (
              <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Saved
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
