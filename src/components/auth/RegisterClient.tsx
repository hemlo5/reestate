'use client';

import Link from 'next/link';
import { GoogleSignInButton } from './GoogleSignInButton';

export function RegisterClient() {
  return <main className="mx-auto max-w-xl px-4 py-12 sm:py-16">
    <section className="rounded-3xl border border-[#E6E9EF] bg-white p-7 shadow-sm sm:p-9">
      <p className="text-xs font-semibold text-[#1A56FF]">Home Seeker Account</p>
      <h1 className="mt-2 text-3xl font-bold text-[#0B1324]">Create your Hemlo account</h1>
      <p className="mt-2 mb-6 text-sm text-[#5E687A]">Sign in securely with Google. You can add your phone and preferences to your profile afterward.</p>
      <GoogleSignInButton role="seeker" next="/seeker/requirements/new" />
      <p className="mt-6 border-t border-[#E6E9EF] pt-5 text-sm text-[#5E687A]">Registering as a broker? <Link className="font-semibold text-[#1A56FF]" href="/broker/onboarding">Continue to broker onboarding</Link></p>
    </section>
  </main>;
}
