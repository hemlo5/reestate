'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  FileText,
  MapPin,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserCircle2,
  XCircle,
} from 'lucide-react';
import type {
  BrokerSpecialization,
  PropertyCategory,
  User,
  VerificationStatus,
} from '@/types';
import type { RegisterInput, UpdateProfileInput } from '@/lib/validation/schemas';
import {
  BROKER_SPECIALIZATIONS,
  LOCALITIES,
  getBrokerVerificationLabel,
} from '@/lib/matching';
import { uploadMediaFile } from '@/lib/storage/client-compress';

interface BrokerOnboardingWizardProps {
  existingBroker?: User | null;
  onCancel: () => void;
  onCompleteNewBroker: (payload: RegisterInput) => Promise<void>;
  onUpdateExistingBroker?: (updates: UpdateProfileInput) => Promise<void>;
  onSwitchToLogin?: () => void;
}

const STEP_TITLES = [
  'Personal Info',
  'Agency Details',
  'Operating Areas',
  'Specialization',
  'Verification',
] as const;

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function validateLocalFile(file: File, allowedMimes: string[]) {
  if (!allowedMimes.includes(file.type.toLowerCase())) {
    throw new Error('Unsupported file type. Please upload JPG, PNG, WebP, or PDF.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('File exceeds 5MB size limit.');
  }
}

function mapSpecializationsToCategories(specs: BrokerSpecialization[]): PropertyCategory[] {
  const cats = new Set<PropertyCategory>();
  if (
    specs.includes('Apartments') ||
    specs.includes('Residential rentals') ||
    specs.includes('Residential sales') ||
    specs.includes('Commercial rentals') ||
    specs.includes('Commercial sales')
  ) {
    cats.add('Flat');
  }
  if (specs.includes('Independent houses') || specs.includes('Villas')) {
    cats.add('House');
  }
  if (specs.includes('PG and co-living')) {
    cats.add('Room');
  }
  if (cats.size === 0) cats.add('Flat');
  return Array.from(cats);
}

export function BrokerOnboardingWizard({
  existingBroker,
  onCancel,
  onCompleteNewBroker,
  onUpdateExistingBroker,
  onSwitchToLogin,
}: BrokerOnboardingWizardProps) {
  const isEditing = Boolean(existingBroker && existingBroker.role === 'broker');
  const bp = existingBroker?.brokerProfile;

  const [step, setStep] = useState(0);

  // Step 1 — Personal Information
  const [fullName, setFullName] = useState(existingBroker?.name || '');
  const [mobile, setMobile] = useState(existingBroker?.phone || '');
  const [email, setEmail] = useState(existingBroker?.email || '');
  const [city, setCity] = useState(existingBroker?.city || 'Bengaluru');
  const [avatarUrl, setAvatarUrl] = useState(
    bp?.avatarUrl || existingBroker?.avatarUrl || ''
  );
  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>(
    existingBroker?.authMethod || 'password'
  );
  const [password, setPassword] = useState('');

  // Step 2 — Agency Information
  const [isIndependent, setIsIndependent] = useState(Boolean(bp?.isIndependent));
  const [agencyName, setAgencyName] = useState(bp?.agencyName || '');
  const [agencyAddress, setAgencyAddress] = useState(bp?.agencyAddress || '');
  const [yearsExperience, setYearsExperience] = useState<number>(
    bp?.yearsExperience ?? 3
  );
  const [propertiesManagedCount, setPropertiesManagedCount] = useState<number>(
    bp?.propertiesManagedCount ?? 8
  );
  const [aboutBroker, setAboutBroker] = useState(bp?.bio || '');
  const [website, setWebsite] = useState(bp?.website || '');

  // Step 3 — Operating Locations
  const [operatingLocalities, setOperatingLocalities] = useState<string[]>(
    bp?.operatingLocalities?.length ? bp.operatingLocalities : ['Koramangala', 'Indiranagar']
  );
  const [customLocation, setCustomLocation] = useState('');

  // Step 4 — Property Specialization
  const [specializations, setSpecializations] = useState<BrokerSpecialization[]>(
    bp?.specializations?.length
      ? bp.specializations
      : ['Residential rentals', 'Apartments']
  );

  // Step 5 — Verification
  const [govtIdType, setGovtIdType] = useState(
    bp?.verificationDocs?.govtIdType || 'PAN Card'
  );
  const [govtIdNumber, setGovtIdNumber] = useState(
    bp?.verificationDocs?.govtIdNumber || ''
  );
  const [govtIdFileName, setGovtIdFileName] = useState(
    bp?.verificationDocs?.govtIdFileName || ''
  );
  const [govtIdFileKey, setGovtIdFileKey] = useState(
    bp?.verificationDocs?.govtIdFileKey || ''
  );
  const [agencyRegFileName, setAgencyRegFileName] = useState(
    bp?.verificationDocs?.agencyRegFileName || ''
  );
  const [reraId, setReraId] = useState(bp?.reraId || '');
  const [reraCertificateName, setReraCertificateName] = useState(
    bp?.verificationDocs?.reraCertificateName || ''
  );
  const [businessPhone, setBusinessPhone] = useState(
    bp?.verificationDocs?.businessPhone || existingBroker?.phone || ''
  );
  const [businessEmail, setBusinessEmail] = useState(
    bp?.verificationDocs?.businessEmail || existingBroker?.email || ''
  );

  const [error, setError] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentVerificationStatus: VerificationStatus =
    bp?.verificationStatus || (bp?.verified ? 'verified' : 'pending');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingMedia(true);
    try {
      validateLocalFile(file, ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
      const uploaded = await uploadMediaFile({ file, purpose: 'avatar' });
      setAvatarUrl(uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid photo upload');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleGovtIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingMedia(true);
    try {
      validateLocalFile(file, [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/pdf',
      ]);
      const uploaded = await uploadMediaFile({ file, purpose: 'verification' });
      setGovtIdFileName(uploaded.fileName);
      setGovtIdFileKey(uploaded.key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification document');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleDocNameUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (name: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingMedia(true);
    try {
      validateLocalFile(file, [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/pdf',
      ]);
      const uploaded = await uploadMediaFile({ file, purpose: 'verification' });
      setter(uploaded.fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid file');
    } finally {
      setUploadingMedia(false);
    }
  };

  const addCustomLocation = () => {
    const clean = customLocation.trim();
    if (!clean) return;
    if (!operatingLocalities.some((l) => l.toLowerCase() === clean.toLowerCase())) {
      setOperatingLocalities((prev) => [...prev, clean]);
    }
    setCustomLocation('');
  };

  const validateStep = (s: number): boolean => {
    setError('');
    if (s === 0) {
      if (!fullName.trim() || !mobile.trim() || !email.trim()) {
        setError('Full name, mobile number, and email address are required.');
        return false;
      }
      if (!isEditing && authMethod === 'password' && password.trim().length < 6) {
        setError('Please set a password of at least 6 characters (or choose Mobile OTP).');
        return false;
      }
    }
    if (s === 1) {
      if (!isIndependent && !agencyName.trim()) {
        setError('Enter your agency name or select "Independent Broker".');
        return false;
      }
    }
    if (s === 2) {
      if (operatingLocalities.length === 0) {
        setError('Select at least one operating locality.');
        return false;
      }
    }
    if (s === 3) {
      if (specializations.length === 0) {
        setError('Select at least one property specialization.');
        return false;
      }
    }
    if (s === 4) {
      if (!govtIdNumber.trim()) {
        setError('Government ID number is required for broker verification.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(4, prev + 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    setSubmitting(true);
    setError('');
    try {
      const profilePayload = {
        isIndependent,
        agencyName: isIndependent ? undefined : agencyName.trim(),
        agencyAddress: agencyAddress.trim() || undefined,
        phone: mobile.trim(),
        operatingLocalities,
        propertyCategories: mapSpecializationsToCategories(specializations),
        specializations,
        yearsExperience: Math.max(0, Number(yearsExperience) || 0),
        propertiesManagedCount: Math.max(0, Number(propertiesManagedCount) || 0),
        website: website.trim() || undefined,
        reraId: reraId.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
        bio: aboutBroker.trim() || undefined,
        verificationDocs: {
          govtIdType,
          govtIdNumber: govtIdNumber.trim(),
          govtIdFileName: govtIdFileName || undefined,
          govtIdFileKey: govtIdFileKey || undefined,
          agencyRegFileName: agencyRegFileName || undefined,
          reraCertificateName: reraCertificateName || undefined,
          businessEmail: (businessEmail || email).trim(),
          businessPhone: (businessPhone || mobile).trim(),
          submittedAt: new Date().toISOString(),
        },
      };

      if (isEditing && onUpdateExistingBroker) {
        await onUpdateExistingBroker({
          name: fullName.trim(),
          phone: mobile.trim(),
          city: city.trim() || 'Bengaluru',
          avatarUrl: avatarUrl || undefined,
          brokerProfile: profilePayload,
        });
      } else {
        await onCompleteNewBroker({
          name: fullName.trim(),
          email: email.trim(),
          phone: mobile.trim(),
          city: city.trim() || 'Bengaluru',
          role: 'broker',
          avatarUrl: avatarUrl || undefined,
          authMethod,
          password: authMethod === 'password' ? password : 'otp-verified-session',
          brokerProfile: profilePayload,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete broker onboarding.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#5E687A] hover:text-[#0B1324]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{isEditing ? 'Back to Dashboard' : 'Back to Marketplace'}</span>
        </button>

        {!isEditing && onSwitchToLogin && (
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-xs font-semibold text-[#1A56FF] hover:text-[#1244D8]"
          >
            Already registered as a broker? Sign in →
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-[#E6E9EF] shadow-[0_12px_36px_-8px_rgba(11,19,36,0.08)] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#1A56FF]">
              Broker Onboarding · Step {step + 1} of {STEP_TITLES.length}
            </p>
            <h1 className="mt-1 font-display text-xl sm:text-2xl font-bold text-[#0B1324]">
              {isEditing ? 'Update Broker Profile & Verification' : 'Join Housed as a Property Broker'}
            </h1>
          </div>

          {isEditing && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border ${
                currentVerificationStatus === 'verified'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : currentVerificationStatus === 'rejected'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {currentVerificationStatus === 'verified' ? (
                <ShieldCheck className="h-4 w-4" />
              ) : currentVerificationStatus === 'rejected' ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
              <span>{getBrokerVerificationLabel(existingBroker)}</span>
            </span>
          )}
        </div>

        {/* 5-step progress indicator */}
        <div className="mt-5 grid grid-cols-5 gap-2">
          {STEP_TITLES.map((title, idx) => (
            <button
              key={title}
              type="button"
              onClick={() => {
                if (idx <= step || isEditing) setStep(idx);
              }}
              className="text-left group"
            >
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  idx <= step ? 'bg-[#1A56FF]' : 'bg-[#E6E9EF]'
                }`}
              />
              <p
                className={`mt-1.5 text-[11px] font-semibold truncate ${
                  idx === step ? 'text-[#1A56FF]' : 'text-[#5E687A]'
                }`}
              >
                {idx + 1}. {title}
              </p>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-6">
          {/* STEP 1 — PERSONAL INFORMATION */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1324]">
                  Personal Information
                </h2>
                <p className="text-xs text-[#5E687A]">
                  Seekers see your verified name and portrait alongside your property proposals.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="h-20 w-20 rounded-2xl bg-[#F7F8FA] border border-[#E6E9EF] overflow-hidden flex items-center justify-center shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Broker profile preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserCircle2 className="h-9 w-9 text-[#9AA5B5]" strokeWidth={1.5} />
                  )}
                </div>
                <div>
                  <label className="min-h-[40px] px-4 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] border border-[#E6E9EF] text-xs font-semibold text-[#0B1324] inline-flex items-center gap-2 cursor-pointer">
                    <Upload className="h-3.5 w-3.5 text-[#1A56FF]" />
                    <span>Upload Profile Photograph</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="mt-1 text-[11px] text-[#5E687A]">
                    JPG, PNG, or WebP · Max 4MB
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="broker-full-name"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Full Name *
                  </label>
                  <input
                    id="broker-full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="E.g. Arjun Deshmukh"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="broker-mobile"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Mobile Number *
                  </label>
                  <input
                    id="broker-mobile"
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+91 98450 00112"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="broker-email"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Email Address *
                  </label>
                  <input
                    id="broker-email"
                    type="email"
                    required
                    disabled={isEditing}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="arjun@indiranagarrealty.in"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] disabled:opacity-70"
                  />
                </div>
                <div>
                  <label
                    htmlFor="broker-city"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Primary City
                  </label>
                  <input
                    id="broker-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  />
                </div>
              </div>

              {!isEditing && (
                <div className="pt-2 space-y-3">
                  <span className="block text-xs font-semibold text-[#5E687A]">
                    Authentication Method
                  </span>
                  <div className="grid grid-cols-2 gap-3 max-w-md">
                    {(['password', 'otp'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setAuthMethod(m)}
                        className={`min-h-[42px] px-3.5 rounded-xl border text-xs font-semibold ${
                          authMethod === m
                            ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                            : 'bg-white border-[#E6E9EF] text-[#5E687A]'
                        }`}
                      >
                        {m === 'password' ? 'Email & Password' : 'Mobile OTP Sign-In'}
                      </button>
                    ))}
                  </div>
                  {authMethod === 'password' ? (
                    <div className="max-w-md">
                      <label
                        htmlFor="broker-password"
                        className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                      >
                        Create Password (min 6 characters) *
                      </label>
                      <input
                        id="broker-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-[#5E687A]">
                      We will authenticate your broker session using your verified mobile number ({mobile || '+91'}).
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — AGENCY INFORMATION */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1324]">
                  Agency & Experience Details
                </h2>
                <p className="text-xs text-[#5E687A]">
                  Register on behalf of a real estate brokerage or operate independently.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setIsIndependent(false)}
                  className={`min-h-[44px] px-4 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-2 ${
                    !isIndependent
                      ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                      : 'bg-white border-[#E6E9EF] text-[#5E687A]'
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  <span>Real Estate Agency</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsIndependent(true);
                    setAgencyName('');
                  }}
                  className={`min-h-[44px] px-4 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-2 ${
                    isIndependent
                      ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                      : 'bg-white border-[#E6E9EF] text-[#5E687A]'
                  }`}
                >
                  <UserCircle2 className="h-4 w-4" />
                  <span>Independent Broker</span>
                </button>
              </div>

              {!isIndependent && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="broker-agency-name"
                      className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                    >
                      Agency Name *
                    </label>
                    <input
                      id="broker-agency-name"
                      type="text"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="E.g. Indiranagar Estates"
                      className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="broker-website"
                      className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                    >
                      Website (Optional)
                    </label>
                    <input
                      id="broker-website"
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://youragency.in"
                      className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="broker-agency-address"
                  className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                >
                  {isIndependent ? 'Office / Operating Address' : 'Agency Address'}
                </label>
                <input
                  id="broker-agency-address"
                  type="text"
                  value={agencyAddress}
                  onChange={(e) => setAgencyAddress(e.target.value)}
                  placeholder="E.g. 100 Feet Road, Indiranagar, Bengaluru 560038"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="broker-exp"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Years of Experience
                  </label>
                  <input
                    id="broker-exp"
                    type="number"
                    min={0}
                    max={50}
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] tabular-nums"
                  />
                </div>
                <div>
                  <label
                    htmlFor="broker-managed"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Properties Currently Managed
                  </label>
                  <input
                    id="broker-managed"
                    type="number"
                    min={0}
                    value={propertiesManagedCount}
                    onChange={(e) => setPropertiesManagedCount(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="broker-about"
                  className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                >
                  About the Broker
                </label>
                <textarea
                  id="broker-about"
                  rows={3}
                  value={aboutBroker}
                  onChange={(e) => setAboutBroker(e.target.value)}
                  placeholder="Describe your neighbourhood expertise, typical inventory, and client service philosophy..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                />
              </div>
            </div>
          )}

          {/* STEP 3 — OPERATING LOCATIONS */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1324]">
                  Operating Locations
                </h2>
                <p className="text-xs text-[#5E687A]">
                  Select all neighbourhoods where you actively manage inventory. Matching customer requirements in these areas appear first in your feed.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {Array.from(new Set([...LOCALITIES, ...operatingLocalities])).map((loc) => {
                  const selected = operatingLocalities.includes(loc);
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() =>
                        setOperatingLocalities((prev) =>
                          prev.includes(loc)
                            ? prev.filter((item) => item !== loc)
                            : [...prev, loc]
                        )
                      }
                      className={`min-h-[40px] px-3.5 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                        selected
                          ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                          : 'bg-white border-[#E6E9EF] text-[#5E687A] hover:text-[#0B1324]'
                      }`}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{loc}</span>
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <label
                  htmlFor="custom-locality-input"
                  className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                >
                  Add Another Neighbourhood or Micro-Market
                </label>
                <div className="flex gap-2 max-w-md">
                  <input
                    id="custom-locality-input"
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomLocation();
                      }
                    }}
                    placeholder="E.g. Malleswaram, JP Nagar, Powai"
                    className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  />
                  <button
                    type="button"
                    onClick={addCustomLocation}
                    className="min-h-[42px] px-4 rounded-xl bg-[#0B1324] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 — PROPERTY SPECIALIZATION */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1324]">
                  Property Specialization
                </h2>
                <p className="text-xs text-[#5E687A]">
                  Select the asset classes and transaction types you specialize in.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BROKER_SPECIALIZATIONS.map((spec) => {
                  const selected = specializations.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() =>
                        setSpecializations((prev) =>
                          prev.includes(spec)
                            ? prev.filter((item) => item !== spec)
                            : [...prev, spec]
                        )
                      }
                      className={`min-h-[50px] px-4 py-3 rounded-2xl border text-left flex items-center justify-between transition-colors ${
                        selected
                          ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                          : 'bg-[#F7F8FA] border-[#E6E9EF] text-[#0B1324] hover:bg-white'
                      }`}
                    >
                      <span className="text-sm font-semibold">{spec}</span>
                      {selected && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5 — VERIFICATION */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0B1324]">
                    Broker Verification & Compliance
                  </h2>
                  <p className="text-xs text-[#5E687A]">
                    Documents are reviewed before awarding the Verified Broker badge. New accounts start as Verification Pending.
                  </p>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold inline-flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>
                    Status: {isEditing ? getBrokerVerificationLabel(existingBroker) : 'Verification pending'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="govt-id-type"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Government ID Type
                  </label>
                  <select
                    id="govt-id-type"
                    value={govtIdType}
                    onChange={(e) => setGovtIdType(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  >
                    <option value="PAN Card">PAN Card</option>
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving Licence">Driving Licence</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="govt-id-number"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Government ID Number *
                  </label>
                  <input
                    id="govt-id-number"
                    type="text"
                    required
                    value={govtIdNumber}
                    onChange={(e) => setGovtIdNumber(e.target.value)}
                    placeholder="E.g. ABCDE1234F"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-4">
                  <span className="block text-xs font-semibold text-[#0B1324]">
                    Government ID Document
                  </span>
                  <p className="mt-0.5 text-[11px] text-[#5E687A]">
                    Upload PDF, JPG, or PNG (max 4MB)
                  </p>
                  <label className="mt-3 min-h-[38px] px-3.5 py-2 rounded-xl bg-white border border-[#E6E9EF] text-xs font-semibold text-[#0B1324] hover:bg-[#ECEFF4] inline-flex items-center gap-2 cursor-pointer">
                    <Upload className="h-3.5 w-3.5 text-[#1A56FF]" />
                    <span>{govtIdFileName ? 'Replace ID File' : 'Upload ID Proof'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleGovtIdUpload}
                      className="hidden"
                    />
                  </label>
                  {govtIdFileName && (
                    <p className="mt-2 text-xs font-medium text-[#1A56FF] inline-flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[210px]">{govtIdFileName}</span>
                    </p>
                  )}
                </div>

                <div className="bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-4">
                  <span className="block text-xs font-semibold text-[#0B1324]">
                    RERA / Agency Document (Optional)
                  </span>
                  <p className="mt-0.5 text-[11px] text-[#5E687A]">
                    RERA agent certificate or GST/Shop Act proof
                  </p>
                  <label className="mt-3 min-h-[38px] px-3.5 py-2 rounded-xl bg-white border border-[#E6E9EF] text-xs font-semibold text-[#0B1324] hover:bg-[#ECEFF4] inline-flex items-center gap-2 cursor-pointer">
                    <Upload className="h-3.5 w-3.5 text-[#1A56FF]" />
                    <span>
                      {reraCertificateName || agencyRegFileName
                        ? 'Replace Certificate'
                        : 'Upload Certificate'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) =>
                        handleDocNameUpload(e, (name) => {
                          setReraCertificateName(name);
                          setAgencyRegFileName(name);
                        })
                      }
                      className="hidden"
                    />
                  </label>
                  {(reraCertificateName || agencyRegFileName) && (
                    <p className="mt-2 text-xs font-medium text-[#1A56FF] inline-flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[210px]">
                        {reraCertificateName || agencyRegFileName}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="rera-number"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    RERA Registration No. (If applicable)
                  </label>
                  <input
                    id="rera-number"
                    type="text"
                    value={reraId}
                    onChange={(e) => setReraId(e.target.value)}
                    placeholder="PRM/KA/RERA/..."
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="biz-phone"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Business Contact Phone
                  </label>
                  <input
                    id="biz-phone"
                    type="tel"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    placeholder={mobile || '+91 98450 00112'}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] tabular-nums"
                  />
                </div>
                <div>
                  <label
                    htmlFor="biz-email"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Business Email
                  </label>
                  <input
                    id="biz-email"
                    type="email"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    placeholder={email || 'office@agency.in'}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="pt-4 border-t border-[#E6E9EF] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => (step === 0 ? onCancel() : setStep((s) => s - 1))}
              className="min-h-[44px] px-5 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] text-sm font-semibold text-[#0B1324]"
            >
              {step === 0 ? 'Cancel' : 'Back'}
            </button>

            {step < 4 ? (
              <button
                type="button"
                disabled={uploadingMedia}
                onClick={handleNext}
                className="min-h-[44px] px-6 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <span>{uploadingMedia ? 'Uploading...' : 'Continue'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || uploadingMedia}
                className="min-h-[44px] px-6 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {uploadingMedia
                    ? 'Uploading file...'
                    : submitting
                    ? 'Saving...'
                    : isEditing
                    ? 'Save & Submit Verification'
                    : 'Complete Registration'}
                </span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
