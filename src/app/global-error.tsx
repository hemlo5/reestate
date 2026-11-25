'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-[#0B1324] flex items-center justify-center p-6 font-sans antialiased">
        <div className="max-w-md w-full rounded-3xl border border-[#E6E9EF] bg-[#F7F8FA] p-8 text-center">
          <h1 className="text-xl font-bold text-[#0B1324]">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-[#5E687A]">
            {error?.message || 'An unexpected error occurred while rendering Hemlo.'}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
