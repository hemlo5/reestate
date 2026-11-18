'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Lock, Mail, MapPin, Phone, UserCircle2 } from 'lucide-react';
import { useSession } from '@/components/providers/AppProviders';

export function RegisterClient() {
  const router = useRouter();
  const { register } = useSession();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2 || !email.trim() || phone.trim().length < 6 || password.length < 6) {
      setError('Please enter your full name, valid email, phone number, and a password (min 6 characters).');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: 'seeker',
        city: city.trim() || 'Bengaluru',
        authMethod: 'password',
        password,
      });
      router.push('/seeker/requirements/new');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-14 pb-28 md:pb-14">
      <div className="bg-white rounded-3xl border border-[#E6E9EF] shadow-[0_12px_36px_-8px_rgba(11,19,36,0.08)] p-6 sm:p-8">
        <p className="text-xs font-semibold text-[#1A56FF]">Home Seeker Account</p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#0B1324]">
          Create your Housed account
        </h1>
        <p className="mt-1.5 text-sm text-[#5E687A]">
          Post your home requirements once and compare matched property proposals from verified local brokers.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-[#5E687A] inline-flex items-center gap-1.5">
              <UserCircle2 className="h-3.5 w-3.5" />
              Full Name *
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Karthik Subramanian"
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] focus:outline-none focus:bg-white focus:border-[#1A56FF]"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-[#5E687A] inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Email Address *
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="karthik@example.com"
                className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] focus:outline-none focus:bg-white focus:border-[#1A56FF]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-[#5E687A] inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Mobile Number *
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98450 12345"
                className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] tabular-nums focus:outline-none focus:bg-white focus:border-[#1A56FF]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-[#5E687A] inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                City
              </span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] focus:outline-none focus:bg-white focus:border-[#1A56FF]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-[#5E687A] inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Password (min 6 chars) *
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] focus:outline-none focus:bg-white focus:border-[#1A56FF]"
              />
            </label>
          </div>

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
            {submitting ? 'Creating Account...' : 'Create Seeker Account'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#E6E9EF] flex flex-wrap items-center justify-between gap-3 text-xs">
          <Link href="/login" className="font-semibold text-[#1A56FF] hover:text-[#1244D8]">
            Already have an account? Sign in →
          </Link>
          <Link
            href="/broker/onboarding"
            className="inline-flex items-center gap-1.5 font-semibold text-[#0B1324] hover:text-[#1A56FF]"
          >
            <Building2 className="h-3.5 w-3.5 text-[#1A56FF]" />
            <span>Registering as a Property Broker?</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
