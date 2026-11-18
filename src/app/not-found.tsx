import Link from 'next/link';
import { ArrowLeft, Building2, MapPin } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center pb-28">
      <div className="bg-[#F7F8FA] rounded-3xl border border-[#E6E9EF] p-8 sm:p-10">
        <div className="h-14 w-14 rounded-2xl bg-white border border-[#E6E9EF] flex items-center justify-center mx-auto">
          <Building2 className="h-7 w-7 text-[#1A56FF]" strokeWidth={1.6} />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-[#0B1324]">
          Listing or page not found
        </h1>
        <p className="mt-2 text-sm text-[#5E687A] max-w-md mx-auto">
          The property, broker profile, or neighbourhood page you requested may have been rented, sold, or moved.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home Search</span>
          </Link>
          <Link
            href="/map"
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white hover:bg-[#ECEFF4] border border-[#E6E9EF] text-sm font-semibold text-[#0B1324] inline-flex items-center gap-2"
          >
            <MapPin className="h-4 w-4 text-[#1A56FF]" />
            <span>Explore on Map</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
