'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Inbox,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { PROPERTY_IMAGES } from '@/lib/constants/media';
import { PropertyImage } from './PropertyImage';

interface FirstTimeDemoModalProps {
  open: boolean;
  onClose: () => void;
  onStartPosting: () => void;
}

const STEPS = [
  {
    id: 0,
    title: '1. Post brief',
    caption: 'Share your locality, budget, BHK, and move-in date once.',
    durationMs: 3600,
  },
  {
    id: 1,
    title: '2. Match home',
    caption: 'Verified local brokers match their existing inventory to your criteria.',
    durationMs: 3400,
  },
  {
    id: 2,
    title: '3. Inbox pitch',
    caption:
      'Receive tailored property proposals with transparent brokerage directly in your inbox.',
    durationMs: 4200,
  },
] as const;

export function FirstTimeDemoModal({
  open,
  onClose,
  onStartPosting,
}: FirstTimeDemoModalProps) {
  const [step, setStep] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(true);
  const [cycle, setCycle] = useState<number>(0);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setPlaying(true);
    setCycle((c) => c + 1);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !playing) return;
    const currentDuration = STEPS[step]?.durationMs ?? 3600;
    const timer = window.setTimeout(() => {
      setStep((prev) => (prev + 1) % STEPS.length);
    }, currentDuration);
    return () => window.clearTimeout(timer);
  }, [open, playing, step, cycle]);

  if (!open) return null;

  const currentStep = STEPS[step];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0B1324]/55 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="How Hemlo works demo"
    >
      <div className="bg-white rounded-3xl border border-[#E6E9EF] shadow-[0_24px_64px_-12px_rgba(11,19,36,0.28)] max-w-2xl w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-[#E6E9EF] flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#1A56FF]">
              How Hemlo Works · Quick Demo
            </p>
            <h2 className="mt-0.5 font-display text-lg sm:text-xl font-bold text-[#0B1324]">
              Post once. Let matched homes arrive in your inbox.
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close demo"
            className="h-9 w-9 rounded-xl hover:bg-[#F7F8FA] flex items-center justify-center text-[#5E687A] shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Interactive Step Selector */}
        <div className="px-5 sm:px-7 pt-4">
          <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Demo steps">
            {STEPS.map((item) => {
              const active = step === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setStep(item.id);
                    setCycle((c) => c + 1);
                  }}
                  className={`relative text-left px-2.5 sm:px-3 py-2.5 rounded-xl border transition-colors ${
                    active
                      ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                      : 'bg-[#F7F8FA] border-[#E6E9EF] text-[#5E687A] hover:text-[#0B1324]'
                  }`}
                >
                  <span className="block text-[11px] sm:text-xs font-semibold whitespace-nowrap truncate">
                    {item.title}
                  </span>
                  <span className="mt-1.5 block h-1 w-full bg-[#DCE4F2] rounded-full overflow-hidden">
                    {active && (
                      <span
                        key={`${step}-${cycle}-${playing}`}
                        style={{
                          transformOrigin: 'left center',
                          animation: playing
                            ? `demo-progress ${item.durationMs}ms linear forwards`
                            : 'none',
                          transform: playing ? undefined : 'scaleX(0.5)',
                        }}
                        className="block h-full w-full bg-[#1A56FF] rounded-full"
                      />
                    )}
                    {!active && step > item.id && (
                      <span className="block h-full w-full bg-[#1A56FF]/40 rounded-full" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Animated Stage */}
        <div className="px-5 sm:px-7 py-5">
          <div className="relative bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-4 sm:p-6 min-h-[290px] sm:min-h-[300px] flex flex-col justify-between overflow-hidden">
            {step === 0 && (
              <div key={`stage-0-${cycle}`} className="space-y-4 animate-demo-stage">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#5E687A]">
                    Home Seeker · Requirement Form
                  </span>
                  <span className="font-semibold text-[#1A56FF]">Takes 60 seconds</span>
                </div>

                <div className="bg-white rounded-2xl border border-[#E6E9EF] p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0B1324]">
                      <MapPin className="h-4 w-4 text-[#1A56FF]" />
                      Koramangala, Bengaluru
                    </span>
                    <span className="text-xs font-semibold text-[#5E687A]">Rent</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div
                      style={{ animationDelay: '150ms' }}
                      className="animate-demo-chip rounded-xl bg-[#EEF3FF] border border-[#1A56FF] px-3 py-2 font-semibold text-[#1A56FF]"
                    >
                      2 BHK Flat
                    </div>
                    <div
                      style={{ animationDelay: '450ms' }}
                      className="animate-demo-chip rounded-xl bg-[#EEF3FF] border border-[#1A56FF] px-3 py-2 font-semibold text-[#1A56FF] tabular-nums"
                    >
                      ₹20k – ₹30k
                    </div>
                    <div
                      style={{ animationDelay: '750ms' }}
                      className="animate-demo-chip rounded-xl bg-[#EEF3FF] border border-[#1A56FF] px-3 py-2 font-semibold text-[#1A56FF] truncate"
                    >
                      Semi-furnished
                    </div>
                  </div>

                  <div
                    style={{ animationDelay: '1100ms' }}
                    className="animate-demo-chip pt-1 flex items-center justify-between gap-3"
                  >
                    <span className="text-xs text-[#5E687A]">
                      Move-in Dec 1 · Covered Parking
                    </span>
                    <span className="px-3.5 sm:px-4 py-2 rounded-xl bg-[#1A56FF] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0">
                      <span>Publish Brief</span>
                      <Send className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div key={`stage-1-${cycle}`} className="space-y-4 animate-demo-stage">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#5E687A]">
                    Broker Lead Feed · Koramangala Specialists
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-[#1A56FF]">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Matching Engine</span>
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-[#E6E9EF] p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#0B1324] flex items-center gap-1">
                        <span>Vikram Mehta</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#1A56FF]" />
                      </p>
                      <p className="text-[11px] text-[#5E687A]">Mehta & Co. Residential</p>
                    </div>
                    <span
                      style={{ animationDelay: '300ms' }}
                      className="animate-demo-chip text-xs font-bold text-emerald-700 tabular-nums whitespace-nowrap shrink-0"
                    >
                      100% Strong Match
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#E6E9EF] flex items-center gap-3">
                    <PropertyImage
                      src={PROPERTY_IMAGES.living}
                      alt="Matched Koramangala 2 BHK"
                      sizes="80px"
                      className="w-20 h-16 rounded-xl shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#0B1324] truncate">
                        Oakwood Corner 2 BHK near 4th Block Park
                      </p>
                      <p className="text-xs text-[#5E687A] tabular-nums">
                        ₹25,000/mo · Koramangala · Semi-furnished
                      </p>
                    </div>
                  </div>

                  <div
                    style={{ animationDelay: '700ms' }}
                    className="animate-demo-chip flex items-center justify-between gap-2 pt-1"
                  >
                    <span className="text-xs text-[#5E687A]">
                      Pitching directly to seeker’s inbox…
                    </span>
                    <span className="px-3.5 py-1.5 rounded-xl bg-[#1A56FF] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
                      <Send className="h-3 w-3" />
                      <span>Proposal Sent</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div key={`stage-2-${cycle}`} className="space-y-4 animate-demo-stage">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#0B1324]">
                    <Inbox className="h-4 w-4 text-[#1A56FF]" />
                    <span>Your Proposals Inbox</span>
                  </span>
                  <span
                    style={{ animationDelay: '200ms' }}
                    className="animate-demo-chip font-bold text-[#1A56FF] tabular-nums whitespace-nowrap shrink-0"
                  >
                    1 New Pitch Received
                  </span>
                </div>

                <div
                  style={{ animationDelay: '250ms' }}
                  className="animate-demo-chip bg-white rounded-2xl border border-[#1A56FF]/40 p-4 shadow-md space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <PropertyImage
                      src={PROPERTY_IMAGES.living}
                      alt="Oakwood Corner 2 BHK"
                      sizes="96px"
                      className="w-20 sm:w-24 h-16 sm:h-18 rounded-xl shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-display text-sm sm:text-base font-bold text-[#0B1324] tabular-nums whitespace-nowrap">
                          ₹25,000/mo
                        </p>
                        <span className="text-xs font-bold text-[#1A56FF] tabular-nums whitespace-nowrap shrink-0">
                          100% Match
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#0B1324] truncate">
                        Oakwood Corner 2 BHK near 4th Block Park
                      </p>
                      <p className="text-[11px] text-[#5E687A] mt-0.5">
                        Broker: Vikram Mehta · Brokerage: 1 Month Rent
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-[#0B1324] bg-[#F7F8FA] rounded-xl p-2.5">
                    “Hi! This 4th Block corner flat fits your ₹20k–₹30k budget and Dec 1 move-in.”
                  </p>

                  <div className="flex items-center justify-end gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-[#F7F8FA] text-xs font-semibold text-[#0B1324]">
                      Schedule Visit
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-[#1A56FF] text-white text-xs font-semibold">
                      Contact Broker
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Caption & Playback Bar */}
            <div className="mt-4 pt-3 border-t border-[#E6E9EF] flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-[#5E687A]">{currentStep.caption}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? 'Pause demo animation' : 'Play demo animation'}
                  className="h-8 w-8 rounded-lg bg-white border border-[#E6E9EF] text-[#0B1324] hover:bg-[#ECEFF4] flex items-center justify-center"
                >
                  {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep(0);
                    setPlaying(true);
                    setCycle((c) => c + 1);
                  }}
                  aria-label="Replay demo animation"
                  className="h-8 w-8 rounded-lg bg-white border border-[#E6E9EF] text-[#0B1324] hover:bg-[#ECEFF4] flex items-center justify-center"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-5 sm:px-7 py-4 border-t border-[#E6E9EF] flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold text-[#5E687A] hover:text-[#0B1324] hover:bg-[#F7F8FA]"
          >
            Skip demo
          </button>

          <button
            type="button"
            onClick={onStartPosting}
            className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Post your requirements</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
