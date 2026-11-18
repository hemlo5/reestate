'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Building2 } from 'lucide-react';

interface PropertyImageProps {
  src?: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export function PropertyImage({
  src,
  alt,
  className = '',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  priority = false,
}: PropertyImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !src || failedSrc === src;

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#F2F4F8] text-[#5E687A] ${className}`}
        role="img"
        aria-label={alt}
      >
        <Building2 className="h-7 w-7 text-[#9AA5B5] mb-1.5" strokeWidth={1.5} />
        <span className="text-xs font-medium text-[#5E687A] px-3 text-center line-clamp-1">
          {alt}
        </span>
      </div>
    );
  }

  const isLocalApiOrData =
    src.startsWith('/api/') || src.startsWith('data:') || src.startsWith('blob:');

  return (
    <div className={`relative overflow-hidden bg-[#F2F4F8] ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        preload={priority}
        loading={priority ? 'eager' : undefined}
        unoptimized={isLocalApiOrData}
        onError={() => setFailedSrc(src)}
        className="object-cover"
      />
    </div>
  );
}
