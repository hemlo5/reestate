'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/auth/supabase-browser';

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const finish = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session?.access_token) throw new Error('Google sign-in did not return a session. Please try again.');
        const response = await fetch('/api/auth/google-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: data.session.access_token, role: params.get('role') }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to finish sign-in.');
        const next = params.get('next');
        const fallback = result.user.role === 'broker' ? '/broker/dashboard' : '/';
        router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : fallback);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Unable to finish Google sign-in.');
      }
    };
    void finish();
    return () => { alive = false; };
  }, [params, router]);

  return <main className="mx-auto max-w-xl px-5 py-24 text-center">
    <h1 className="text-2xl font-bold">{error ? 'Sign-in failed' : 'Signing you in…'}</h1>
    {error && <><p className="mt-3 text-sm text-red-600">{error}</p><a className="mt-5 inline-block text-blue-700 underline" href="/login">Return to sign in</a></>}
  </main>;
}
