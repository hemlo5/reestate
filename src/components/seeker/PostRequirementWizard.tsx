'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type {
  FurnishingPreference,
  ListingIntent,
  PropertyCategory,
  SearchFilters,
  User,
} from '@/types';
import type { CreateRequirementInput } from '@/lib/validation/schemas';
import { COMMON_AMENITIES, LOCALITIES, formatBudgetRange } from '@/lib/matching';

interface PostRequirementWizardProps {
  user: User;
  initialPrefill?: Partial<SearchFilters>;
  onCancel: () => void;
  onSubmit: (payload: CreateRequirementInput) => Promise<void>;
}

export function PostRequirementWizard({
  user,
  initialPrefill,
  onCancel,
  onSubmit,
}: PostRequirementWizardProps) {
  const initialIntent: ListingIntent = initialPrefill?.intent || 'rent';
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [intent, setIntent] = useState<ListingIntent>(initialIntent);
  const [localities, setLocalities] = useState<string[]>(
    initialPrefill?.locality && initialPrefill.locality !== 'All'
      ? [initialPrefill.locality]
      : ['Koramangala']
  );
  const [budgetMin, setBudgetMin] = useState<number>(
    initialIntent === 'rent' ? 20000 : 10000000
  );
  const [budgetMax, setBudgetMax] = useState<number>(
    initialPrefill?.budgetMax || (initialIntent === 'rent' ? 30000 : 18000000)
  );
  const [propertyType, setPropertyType] = useState<PropertyCategory>(
    initialPrefill?.propertyType && initialPrefill.propertyType !== 'All'
      ? initialPrefill.propertyType
      : 'Flat'
  );
  const [bedrooms, setBedrooms] = useState<number>(
    typeof initialPrefill?.bedrooms === 'number' ? initialPrefill.bedrooms : 2
  );
  const [furnishing, setFurnishing] = useState<FurnishingPreference>(
    initialPrefill?.furnishing || 'Semi-furnished'
  );
  const [moveInDate, setMoveInDate] = useState<string>('2026-12-01');
  const [amenities, setAmenities] = useState<string[]>([
    'Covered Parking',
    'Power Backup',
  ]);
  const [notes, setNotes] = useState<string>('');
  const [seekerName, setSeekerName] = useState<string>(user.name);
  const [seekerPhone, setSeekerPhone] = useState<string>(user.phone);
  const [seekerEmail, setSeekerEmail] = useState<string>(user.email);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleIntentSwitch = (nextIntent: ListingIntent) => {
    setIntent(nextIntent);
    if (nextIntent === 'rent') {
      setBudgetMin(20000);
      setBudgetMax(35000);
    } else {
      setBudgetMin(10000000);
      setBudgetMax(18000000);
    }
  };

  const toggleLocality = (loc: string) => {
    setLocalities((prev) =>
      prev.includes(loc) ? prev.filter((item) => item !== loc) : [...prev, loc]
    );
  };

  const toggleAmenity = (am: string) => {
    setAmenities((prev) =>
      prev.includes(am) ? prev.filter((item) => item !== am) : [...prev, am]
    );
  };

  const validateStep = (targetStep: number): boolean => {
    setError('');
    if (targetStep === 1 && localities.length === 0) {
      setError('Select at least one preferred locality.');
      return false;
    }
    if (targetStep === 2) {
      if (!Number.isFinite(budgetMin) || !Number.isFinite(budgetMax) || budgetMax <= 0) {
        setError('Enter valid minimum and maximum budget amounts.');
        return false;
      }
      if (budgetMin > budgetMax) {
        setError('Minimum budget cannot exceed maximum budget.');
        return false;
      }
    }
    if (targetStep === 3 && !moveInDate) {
      setError('Select a preferred move-in date.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4);
  };

  const handlePublish = async () => {
    setError('');
    if (!seekerName.trim() || !seekerPhone.trim() || !seekerEmail.trim()) {
      setError('Name, phone number, and email are required so matched brokers can reach you.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        seekerName: seekerName.trim(),
        seekerPhone: seekerPhone.trim(),
        seekerEmail: seekerEmail.trim(),
        intent,
        localities,
        budgetMin,
        budgetMax,
        propertyType,
        bedrooms,
        furnishing,
        moveInDate,
        amenities,
        notes: notes.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish requirement.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-12">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5E687A] hover:text-[#0B1324] mb-5"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to search</span>
      </button>

      <div className="bg-white rounded-3xl border border-[#E6E9EF] shadow-[0_12px_32px_-4px_rgba(11,19,36,0.08)] p-5 sm:p-8">
        {/* Progress Header */}
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-[#E6E9EF]">
          <div>
            <p className="text-xs font-semibold text-[#1A56FF] tabular-nums">
              Step {step} of 4
            </p>
            <h1 className="mt-1 font-display text-xl sm:text-2xl font-bold text-[#0B1324]">
              {step === 1 && 'Where and how do you want to live?'}
              {step === 2 && 'Budget & property configuration'}
              {step === 3 && 'Furnishing, timeline & amenities'}
              {step === 4 && 'Contact details & final review'}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
            {[1, 2, 3, 4].map((dot) => (
              <span
                key={dot}
                className={`h-2 rounded-full transition-all ${
                  dot === step
                    ? 'w-6 bg-[#1A56FF]'
                    : dot < step
                    ? 'w-2 bg-[#1A56FF]/50'
                    : 'w-2 bg-[#E6E9EF]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Rent/Buy & Preferred Localities */}
        {step === 1 && (
          <div className="mt-6 space-y-6">
            <div>
              <span className="block text-xs font-semibold text-[#5E687A] mb-2">
                1. Are you looking to rent or purchase?
              </span>
              <div className="grid grid-cols-2 gap-3">
                {(['rent', 'buy'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleIntentSwitch(opt)}
                    className={`min-h-[52px] px-4 py-3 rounded-2xl border text-sm font-semibold transition-all ${
                      intent === opt
                        ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                        : 'bg-[#F7F8FA] border-[#E6E9EF] text-[#0B1324] hover:border-[#C5CCD8]'
                    }`}
                  >
                    {opt === 'rent' ? 'Rent a Home' : 'Buy a Property'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#5E687A] mb-2">
                2. Preferred localities (select one or more)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {LOCALITIES.map((loc) => {
                  const selected = localities.includes(loc);
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => toggleLocality(loc)}
                      className={`min-h-[46px] px-3.5 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-between gap-2 transition-colors ${
                        selected
                          ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                          : 'bg-white border-[#E6E9EF] text-[#0B1324] hover:bg-[#F7F8FA]'
                      }`}
                    >
                      <span className="truncate">{loc}</span>
                      {selected && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Budget, Property Type & BHK */}
        {step === 2 && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="req-budget-min"
                  className="block text-xs font-semibold text-[#5E687A] mb-2"
                >
                  Minimum Budget (INR {intent === 'rent' ? '/ month' : 'total'})
                </label>
                <input
                  id="req-budget-min"
                  type="number"
                  min={1000}
                  step={intent === 'rent' ? 1000 : 500000}
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(Number(e.target.value))}
                  className="w-full min-h-[48px] px-4 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm font-semibold text-[#0B1324] tabular-nums focus:outline-none focus:border-[#1A56FF] focus:bg-white"
                />
              </div>
              <div>
                <label
                  htmlFor="req-budget-max"
                  className="block text-xs font-semibold text-[#5E687A] mb-2"
                >
                  Maximum Budget (INR {intent === 'rent' ? '/ month' : 'total'})
                </label>
                <input
                  id="req-budget-max"
                  type="number"
                  min={1000}
                  step={intent === 'rent' ? 1000 : 500000}
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(Number(e.target.value))}
                  className="w-full min-h-[48px] px-4 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm font-semibold text-[#0B1324] tabular-nums focus:outline-none focus:border-[#1A56FF] focus:bg-white"
                />
              </div>
            </div>

            <p className="text-xs font-medium text-[#5E687A] tabular-nums">
              Formatted range:{' '}
              <span className="font-semibold text-[#0B1324]">
                {formatBudgetRange(budgetMin, budgetMax, intent)}
              </span>
            </p>

            <div>
              <span className="block text-xs font-semibold text-[#5E687A] mb-2">
                Property Type
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {(['Flat', 'House', 'Room'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPropertyType(type)}
                    className={`min-h-[46px] px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                      propertyType === type
                        ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                        : 'bg-white border-[#E6E9EF] text-[#0B1324] hover:bg-[#F7F8FA]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#5E687A] mb-2">
                Bedrooms (BHK)
              </span>
              <div className="grid grid-cols-4 gap-2.5">
                {[1, 2, 3, 4].map((bhk) => (
                  <button
                    key={bhk}
                    type="button"
                    onClick={() => setBedrooms(bhk)}
                    className={`min-h-[46px] px-3 py-2.5 rounded-xl border text-sm font-semibold tabular-nums transition-colors ${
                      bedrooms === bhk
                        ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                        : 'bg-white border-[#E6E9EF] text-[#0B1324] hover:bg-[#F7F8FA]'
                    }`}
                  >
                    {bhk === 4 ? '4+ BHK' : `${bhk} BHK`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Furnishing, Move-in Date & Amenities */}
        {step === 3 && (
          <div className="mt-6 space-y-6">
            <div>
              <span className="block text-xs font-semibold text-[#5E687A] mb-2">
                Furnishing Preference
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(['Furnished', 'Semi-furnished', 'Unfurnished', 'Any'] as const).map(
                  (f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFurnishing(f)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-colors ${
                        furnishing === f
                          ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                          : 'bg-white border-[#E6E9EF] text-[#0B1324] hover:bg-[#F7F8FA]'
                      }`}
                    >
                      {f}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="req-movein"
                className="block text-xs font-semibold text-[#5E687A] mb-2"
              >
                Preferred Move-in / Possession Date
              </label>
              <input
                id="req-movein"
                type="date"
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                className="w-full sm:w-64 min-h-[46px] px-4 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm font-medium text-[#0B1324] focus:outline-none focus:border-[#1A56FF] focus:bg-white"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#5E687A] mb-2">
                Required Amenities
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COMMON_AMENITIES.map((am) => {
                  const active = amenities.includes(am);
                  return (
                    <button
                      key={am}
                      type="button"
                      onClick={() => toggleAmenity(am)}
                      className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 transition-colors ${
                        active
                          ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                          : 'bg-white border-[#E6E9EF] text-[#5E687A] hover:text-[#0B1324]'
                      }`}
                    >
                      <span className="truncate">{am}</span>
                      {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Notes, Contact Info & Review */}
        {step === 4 && (
          <div className="mt-6 space-y-6">
            <div>
              <label
                htmlFor="req-notes"
                className="block text-xs font-semibold text-[#5E687A] mb-2"
              >
                Additional Preferences (Optional)
              </label>
              <textarea
                id="req-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g. quiet street, east-facing entrance, pet-friendly building, walkable to metro..."
                className="w-full px-4 py-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] placeholder:text-[#9AA5B5] focus:outline-none focus:border-[#1A56FF] focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label
                  htmlFor="req-name"
                  className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id="req-name"
                  type="text"
                  value={seekerName}
                  onChange={(e) => setSeekerName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] focus:outline-none focus:border-[#1A56FF] focus:bg-white"
                />
              </div>
              <div>
                <label
                  htmlFor="req-phone"
                  className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                >
                  Phone Number
                </label>
                <input
                  id="req-phone"
                  type="tel"
                  value={seekerPhone}
                  onChange={(e) => setSeekerPhone(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] focus:outline-none focus:border-[#1A56FF] focus:bg-white"
                />
              </div>
              <div>
                <label
                  htmlFor="req-email"
                  className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                >
                  Email
                </label>
                <input
                  id="req-email"
                  type="email"
                  value={seekerEmail}
                  onChange={(e) => setSeekerEmail(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] focus:outline-none focus:border-[#1A56FF] focus:bg-white"
                />
              </div>
            </div>

            {/* Clean Summary Review */}
            <div className="bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-5">
              <p className="text-xs font-semibold text-[#5E687A]">Requirement Summary</p>
              <dl className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-[#5E687A]">Looking to</dt>
                  <dd className="font-semibold text-[#0B1324] capitalize">{intent}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#5E687A]">Localities</dt>
                  <dd className="font-semibold text-[#0B1324]">{localities.join(', ')}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#5E687A]">Budget</dt>
                  <dd className="font-semibold text-[#0B1324] tabular-nums">
                    {formatBudgetRange(budgetMin, budgetMax, intent)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#5E687A]">Configuration</dt>
                  <dd className="font-semibold text-[#0B1324]">
                    {bedrooms === 4 ? '4+' : bedrooms} BHK {propertyType}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#5E687A]">Furnishing</dt>
                  <dd className="font-semibold text-[#0B1324]">{furnishing}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#5E687A]">Move-in</dt>
                  <dd className="font-semibold text-[#0B1324] tabular-nums">{moveInDate}</dd>
                </div>
              </dl>
              {amenities.length > 0 && (
                <p className="mt-3 pt-3 border-t border-[#E6E9EF] text-xs text-[#5E687A]">
                  Amenities: <span className="text-[#0B1324]">{amenities.join(' · ')}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        )}

        {/* Footer Controls */}
        <div className="mt-8 pt-6 border-t border-[#E6E9EF] flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] text-sm font-semibold text-[#0B1324]"
            >
              Previous
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] text-sm font-semibold text-[#0B1324]"
            >
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold inline-flex items-center gap-2"
            >
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handlePublish}
              className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2"
            >
              <span>{submitting ? 'Publishing...' : 'Publish Requirement'}</span>
              <Check className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
