'use client';

import { useRef, useState } from 'react';
import { LocateFixed, Minus, Plus } from 'lucide-react';
import type { Property } from '@/types';
import { formatCompactMarkerPrice, formatINR } from '@/lib/matching';
import { PropertyImage } from './PropertyImage';

interface InteractiveMapProps {
  properties: Property[];
  selectedPropertyId: string | null;
  onSelectProperty: (property: Property) => void;
  onViewDetails: (property: Property) => void;
  onShowList?: () => void;
  showListButton?: boolean;
}

const NEIGHBORHOOD_LABELS = [
  { name: 'Sadashivanagar', x: 26, y: 20 },
  { name: 'Indiranagar', x: 66, y: 34 },
  { name: 'Whitefield', x: 85, y: 40 },
  { name: 'Koramangala', x: 45, y: 57 },
  { name: 'Jayanagar', x: 26, y: 66 },
  { name: 'HSR Layout', x: 56, y: 78 },
];

export function InteractiveMap({
  properties,
  selectedPropertyId,
  onSelectProperty,
  onViewDetails,
  onShowList,
  showListButton = false,
}: InteractiveMapProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  const selectedProperty =
    properties.find((p) => p.id === selectedPropertyId) || properties[0] || null;

  const handleZoomIn = () => setZoom((z) => Math.min(2.2, Number((z + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.85, Number((z - 0.25).toFixed(2))));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      className="relative w-full h-full min-h-[460px] bg-[#EEF1F5] rounded-2xl overflow-hidden border border-[#E6E9EF] select-none"
      data-testid="interactive-map"
    >
      {/* Interactive Pan/Zoom Canvas */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing relative"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          dragRef.current = {
            active: true,
            startX: e.clientX,
            startY: e.clientY,
            origX: pan.x,
            origY: pan.y,
          };
        }}
        onPointerMove={(e) => {
          if (!dragRef.current.active) return;
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          setPan({
            x: Math.max(-180, Math.min(180, dragRef.current.origX + dx)),
            y: Math.max(-140, Math.min(140, dragRef.current.origY + dy)),
          });
        }}
        onPointerUp={() => {
          dragRef.current.active = false;
        }}
        onPointerLeave={() => {
          dragRef.current.active = false;
        }}
      >
        <div
          className="absolute inset-0 transition-transform duration-150 ease-out origin-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* Minimalist Cartographic SVG Layer */}
          <svg
            viewBox="0 0 1000 700"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full"
            aria-hidden="true"
          >
            <rect width="1000" height="700" fill="#F2F4F8" />

            {/* Urban Parks & Green Belts */}
            <path d="M 330 220 Q 410 195 450 260 Q 430 330 350 320 Z" fill="#DDECE0" />
            <ellipse cx="640" cy="495" rx="58" ry="34" fill="#DDECE0" />
            <ellipse cx="220" cy="430" rx="46" ry="30" fill="#DDECE0" />

            {/* Lakes */}
            <path d="M 520 515 Q 575 495 595 535 Q 560 570 510 550 Z" fill="#DCE9FA" />
            <ellipse cx="770" cy="245" rx="44" ry="26" fill="#DCE9FA" />

            {/* Secondary Street Grid */}
            <g stroke="#E2E6EE" strokeWidth="4" fill="none">
              <path d="M 0 140 L 1000 175" />
              <path d="M 0 280 L 1000 250" />
              <path d="M 0 410 L 1000 390" />
              <path d="M 0 540 L 1000 520" />
              <path d="M 180 0 L 210 700" />
              <path d="M 360 0 L 340 700" />
              <path d="M 530 0 L 555 700" />
              <path d="M 710 0 L 690 700" />
              <path d="M 860 0 L 880 700" />
            </g>

            {/* Primary Arterial Roads */}
            <g stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" fill="none">
              <path d="M 40 120 Q 340 240 520 380 T 940 580" />
              <path d="M 90 520 Q 340 440 560 320 T 950 180" />
              <path d="M 430 40 Q 450 310 470 670" />
              <path d="M 120 350 L 920 350" />
            </g>

            {/* Inner Ring Road */}
            <ellipse
              cx="480"
              cy="360"
              rx="255"
              ry="175"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="12"
            />
            <ellipse
              cx="480"
              cy="360"
              rx="255"
              ry="175"
              fill="none"
              stroke="#E5E9F0"
              strokeWidth="1.5"
              strokeDasharray="6 6"
            />
          </svg>

          {/* Neighborhood Labels */}
          {NEIGHBORHOOD_LABELS.map((loc) => (
            <span
              key={loc.name}
              style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-[11px] font-semibold tracking-wide text-[#707B8E] pointer-events-none whitespace-nowrap"
            >
              {loc.name}
            </span>
          ))}

          {/* Property Price Markers */}
          {properties.map((property) => {
            const isSelected = selectedProperty?.id === property.id;
            return (
              <button
                key={property.id}
                type="button"
                onClick={() => onSelectProperty(property)}
                style={{ left: `${property.mapX}%`, top: `${property.mapY}%` }}
                aria-label={`${property.title} priced at ${formatINR(property.price, property.intent)}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full text-xs font-bold tabular-nums transition-all duration-150 whitespace-nowrap shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A56FF] ${
                  isSelected
                    ? 'z-20 bg-[#0B1324] text-white scale-110 ring-4 ring-[#1A56FF]/25'
                    : 'z-10 bg-[#1A56FF] text-white hover:bg-[#1244D8] hover:scale-105'
                }`}
              >
                {formatCompactMarkerPrice(property.price, property.intent)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Top-Right Map Zoom Controls */}
      <div className="absolute top-3.5 right-3.5 z-20 flex flex-col bg-white border border-[#E6E9EF] rounded-xl shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom in map"
          className="h-10 w-10 flex items-center justify-center text-[#0B1324] hover:bg-[#F7F8FA] transition-colors border-b border-[#E6E9EF]"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out map"
          className="h-10 w-10 flex items-center justify-center text-[#0B1324] hover:bg-[#F7F8FA] transition-colors border-b border-[#E6E9EF]"
        >
          <Minus className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={handleReset}
          aria-label="Reset map position"
          className="h-10 w-10 flex items-center justify-center text-[#5E687A] hover:text-[#0B1324] hover:bg-[#F7F8FA] transition-colors"
        >
          <LocateFixed className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Bottom Floating Selected Property Card + Show List Button (mobile/tablet only) */}
      <div className="absolute bottom-3.5 left-3.5 right-3.5 z-20 flex flex-col gap-2.5 pointer-events-none">
        {showListButton && onShowList && (
          <div className="lg:hidden flex justify-center pointer-events-auto">
            <button
              type="button"
              onClick={onShowList}
              className="px-5 py-2.5 rounded-full bg-[#0B1324] text-white text-xs font-semibold shadow-lg hover:bg-[#1C273F] transition-colors"
            >
              Show List ({properties.length})
            </button>
          </div>
        )}

        {selectedProperty && (
          <div className="pointer-events-auto bg-white rounded-2xl border border-[#E6E9EF] shadow-[0_12px_32px_-4px_rgba(11,19,36,0.14)] p-3 flex items-center gap-3.5 max-w-md mx-auto w-full">
            <PropertyImage
              src={selectedProperty.images[0]}
              alt={selectedProperty.title}
              sizes="80px"
              className="w-20 h-20 rounded-xl shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-display text-sm font-bold text-[#0B1324] tabular-nums">
                  {formatINR(selectedProperty.price, selectedProperty.intent)}
                  {selectedProperty.intent === 'rent' && (
                    <span className="text-[11px] font-normal text-[#5E687A]">/mo</span>
                  )}
                </p>
                <span className="text-[11px] font-medium text-[#5E687A] shrink-0">
                  {selectedProperty.locality}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#0B1324] truncate mt-0.5">
                {selectedProperty.title}
              </p>
              <p className="text-[11px] text-[#5E687A] mt-0.5">
                {selectedProperty.bedrooms} BHK · {selectedProperty.furnishing}
              </p>
              <button
                type="button"
                onClick={() => onViewDetails(selectedProperty)}
                className="mt-1.5 text-xs font-semibold text-[#1A56FF] hover:text-[#1244D8]"
              >
                View Property →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
