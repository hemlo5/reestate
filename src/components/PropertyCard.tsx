'use client';

import Link from 'next/link';
import { Bookmark, CheckCircle2, MapPin } from 'lucide-react';
import type { Property } from '@/types';
import { formatINR } from '@/lib/matching';
import { PropertyImage } from './PropertyImage';

interface PropertyCardProps {
  property: Property;
  isSaved?: boolean;
  onToggleSave?: (propertyId: string) => void;
  onViewDetails?: (property: Property) => void;
  highlight?: boolean;
  priority?: boolean;
  footerSlot?: React.ReactNode;
}

export function PropertyCard({
  property,
  isSaved = false,
  onToggleSave,
  onViewDetails,
  highlight = false,
  priority = false,
  footerSlot,
}: PropertyCardProps) {
  const detailsHref = `/properties/${property.id}`;

  return (
    <article
      className={`group bg-white rounded-2xl overflow-hidden transition-all duration-200 border ${
        highlight
          ? 'border-[#1A56FF] shadow-[0_12px_32px_-4px_rgba(26,86,255,0.14)]'
          : 'border-[#E6E9EF] shadow-[0_4px_20px_-2px_rgba(11,19,36,0.05)] hover:shadow-[0_12px_32px_-4px_rgba(11,19,36,0.09)]'
      }`}
    >
      <div className="relative aspect-[4/3] bg-[#F2F4F8] overflow-hidden">
        {onViewDetails ? (
          <button
            type="button"
            onClick={() => onViewDetails(property)}
            className="block w-full h-full text-left focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#1A56FF]"
            aria-label={`View ${property.title}`}
          >
            <PropertyImage
              src={property.images[0]}
              alt={property.title}
              priority={priority}
              className="w-full h-full transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </button>
        ) : (
          <Link
            href={detailsHref}
            className="block w-full h-full text-left focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#1A56FF]"
            aria-label={`View ${property.title}`}
          >
            <PropertyImage
              src={property.images[0]}
              alt={property.title}
              priority={priority}
              className="w-full h-full transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </Link>
        )}

        {onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(property.id)}
            aria-label={isSaved ? `Remove ${property.title} from saved` : `Save ${property.title}`}
            className={`absolute top-3 right-3 h-10 w-10 rounded-full flex items-center justify-center backdrop-blur-md transition-colors shadow-sm ${
              isSaved
                ? 'bg-[#1A56FF] text-white'
                : 'bg-white/90 text-[#0B1324] hover:bg-white'
            }`}
          >
            <Bookmark className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-lg font-bold text-[#0B1324] tabular-nums">
            {formatINR(property.price, property.intent)}
            {property.intent === 'rent' && (
              <span className="text-xs font-normal text-[#5E687A]">/mo</span>
            )}
          </p>
          <span className="text-xs font-medium text-[#5E687A] whitespace-nowrap">
            {property.intent === 'rent' ? 'For Rent' : 'For Sale'}
          </span>
        </div>

        {onViewDetails ? (
          <button
            type="button"
            onClick={() => onViewDetails(property)}
            className="mt-1.5 text-left block w-full focus-visible:outline-2 focus-visible:outline-[#1A56FF] rounded"
          >
            <h3 className="font-display text-base font-semibold text-[#0B1324] leading-snug line-clamp-1 group-hover:text-[#1A56FF] transition-colors">
              {property.title}
            </h3>
          </button>
        ) : (
          <Link
            href={detailsHref}
            className="mt-1.5 text-left block w-full focus-visible:outline-2 focus-visible:outline-[#1A56FF] rounded"
          >
            <h3 className="font-display text-base font-semibold text-[#0B1324] leading-snug line-clamp-1 group-hover:text-[#1A56FF] transition-colors">
              {property.title}
            </h3>
          </Link>
        )}

        <p className="mt-1 flex items-center gap-1.5 text-xs sm:text-sm text-[#5E687A] line-clamp-1">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#9AA5B5]" strokeWidth={1.75} />
          <span className="truncate">{property.address}</span>
        </p>

        {/* Clean unboxed metadata row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5E687A] tabular-nums">
          <span className="font-medium text-[#0B1324]">{property.bedrooms} BHK</span>
          <span aria-hidden="true">·</span>
          <span>{property.propertyType}</span>
          <span aria-hidden="true">·</span>
          <span>{property.furnishing}</span>
          <span aria-hidden="true">·</span>
          <span>{property.areaSqFt.toLocaleString('en-IN')} sq.ft</span>
        </div>

        <div className="mt-3.5 pt-3.5 border-t border-[#E6E9EF] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/brokers/${property.brokerId}`}
              className="text-xs font-medium text-[#0B1324] hover:text-[#1A56FF] flex items-center gap-1 truncate"
            >
              <span className="truncate">{property.brokerName}</span>
              {property.brokerVerified && (
                <CheckCircle2
                  className="h-3.5 w-3.5 text-[#1A56FF] shrink-0"
                  aria-label="Verified broker"
                />
              )}
              {!property.brokerVerified && (
                <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">Unverified</span>
              )}
            </Link>
            <p className="text-[11px] text-[#5E687A] truncate">
              Brokerage: {property.brokerageFee}
            </p>
            {property.brokerReraId && (
              <p className="mt-1 text-[10px] text-[#5E687A] truncate" title={`${property.brokerReraAuthority || 'State RERA'}: ${property.brokerReraId}`}>
                {property.brokerReraAuthority || 'State RERA'}: {property.brokerReraId}
              </p>
            )}
          </div>

          {onViewDetails ? (
            <button
              type="button"
              onClick={() => onViewDetails(property)}
              className="px-3.5 py-2 text-xs font-semibold text-[#1A56FF] bg-[#EEF3FF] hover:bg-[#DFEAFF] rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              View Details
            </button>
          ) : (
            <Link
              href={detailsHref}
              className="px-3.5 py-2 text-xs font-semibold text-[#1A56FF] bg-[#EEF3FF] hover:bg-[#DFEAFF] rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              View Details
            </Link>
          )}
        </div>

        {footerSlot && <div className="mt-3.5 pt-3.5 border-t border-[#E6E9EF]">{footerSlot}</div>}
      </div>
    </article>
  );
}
