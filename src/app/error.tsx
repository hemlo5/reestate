'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Housed route error:', error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center pb-28">
      <div className="rounded-3xl border border-[#E6E9EF] bg-[#F7F8FA] p-8 sm:p-10">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0B1324]">
          Unable to load this page right now
        </h1>
        <p className="mt-2 text-sm text-[#5E687A] max-w-md mx-auto">
          Please retry or return to the home search while we reconnect.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white hover:bg-[#ECEFF4] border border-[#E6E9EF] text-sm font-semibold text-[#0B1324]"
          >
            Back to Home Search
          </Link>
        </div>
      </div>
    </div>
  );
}
