'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from '@/components/providers/AppProviders';
import { GoogleSignInButton } from './GoogleSignInButton';

export function LoginClient() {
  const params = useSearchParams();
  const { user, logout } = useSession();
  const role = params.get('role') === 'broker' ? 'broker' : 'seeker';
  const next = params.get('next') || (role === 'broker' ? '/broker/dashboard' : '/');
  return <main className="mx-auto max-w-xl px-4 py-12 sm:py-16">
    <section className="rounded-3xl border border-[#E6E9EF] bg-white p-7 shadow-sm sm:p-9">
      <p className="text-xs font-semibold text-[#1A56FF]">{role === 'broker' ? 'Broker Portal' : 'Welcome to Hemlo'}</p>
      <h1 className="mt-2 text-3xl font-bold text-[#0B1324]">Sign in with Google</h1>
      <p className="mt-2 mb-6 text-sm text-[#5E687A]">Use your Google account to securely access Hemlo. We don’t store a separate Hemlo password.</p>
      {user ? <div className="space-y-4"><p className="text-sm">Signed in as <strong>{user.name}</strong>.</p><Link className="block text-center rounded-xl bg-[#1A56FF] p-3 text-sm font-semibold text-white" href={user.role === 'broker' ? '/broker/dashboard' : '/'}>Continue to Hemlo</Link><button onClick={() => void logout()} className="w-full text-sm text-[#5E687A] underline">Sign out</button></div> : <GoogleSignInButton role={role} next={next} />}
      <div className="mt-6 flex flex-wrap gap-4 border-t border-[#E6E9EF] pt-5 text-sm">
        <Link className="text-[#1A56FF]" href="/register">Create a seeker account</Link>
        <Link className="text-[#1A56FF]" href="/broker/onboarding">Join as a broker</Link>
      </div>
    </section>
  </main>;
}
