'use client';

import Link from 'next/link';
import { Flag } from 'lucide-react';

export function ReportListingLink({ listingId }: { listingId?: string }) {
  const query = listingId ? `?listingId=${encodeURIComponent(listingId)}` : '';
  return (
    <Link
      href={`/grievance${query}`}
      className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[#E6E9EF] bg-white px-3.5 py-2 text-sm font-semibold text-[#5E687A] hover:bg-[#F7F8FA] hover:text-[#0B1324]"
    >
      <Flag className="h-4 w-4" /> Report this listing
    </Link>
  );
}
