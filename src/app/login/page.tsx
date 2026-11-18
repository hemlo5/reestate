import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginClient } from '@/components/auth/LoginClient';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Housed as a Home Seeker or Property Broker.',
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
          <div className="h-80 rounded-3xl bg-[#F7F8FA] animate-pulse" />
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
