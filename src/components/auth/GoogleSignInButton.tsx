'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import type { UserRole } from '@/types';

export function GoogleSignInButton({ role = 'seeker', next }: { role?: UserRole; next?: string }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signIn = async () => {
    setBusy(true); setError('');
    try {
      const callback = new URL('/auth/callback', window.location.origin);
      callback.searchParams.set('role', role);
      if (next?.startsWith('/') && !next.startsWith('//')) callback.searchParams.set('next', next);
      const { error: authError } = await getSupabaseBrowserClient().auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: callback.toString(), queryParams: { access_type: 'offline', prompt: 'select_account' } },
      });
      if (authError) throw authError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Google sign-in.');
      setBusy(false);
    }
  };
  return <div>
    <button type="button" onClick={signIn} disabled={busy} className="w-full min-h-[48px] rounded-xl border border-[#E6E9EF] bg-white px-5 text-sm font-semibold text-[#0B1324] hover:bg-[#F7F8FA] disabled:opacity-60">
      {busy ? 'Redirecting to Google…' : 'Continue with Google'}
    </button>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
  </div>;
}
