'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Globe,
  MapPin,
  MessageSquare,
  Phone,
  ShieldAlert,
  Star,
} from 'lucide-react';
import type { BrokerReview, Property, User } from '@/types';
import { getBrokerVerificationLabel, isBrokerVerified } from '@/lib/matching';
import { apiClient } from '@/lib/api/client';
import { useSession } from '@/components/providers/AppProviders';
import { PropertyCard } from '@/components/PropertyCard';
import { PropertyImage } from '@/components/PropertyImage';

interface PublicBrokerProfileClientProps {
  broker: User;
  brokerProperties: Property[];
  initialReviews: BrokerReview[];
  initialSavedIds: string[];
}

export function PublicBrokerProfileClient({
  broker,
  brokerProperties,
  initialReviews,
  initialSavedIds,
}: PublicBrokerProfileClientProps) {
  const router = useRouter();
  const { user } = useSession();

  const bp = broker.brokerProfile;
  const verified = isBrokerVerified(broker);
  const activeProps = brokerProperties.filter((p) => p.availability === 'available');

  const [reviews, setReviews] = useState<BrokerReview[]>(initialReviews);
  const [savedIds, setSavedIds] = useState<string[]>(initialSavedIds);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [locality, setLocality] = useState(bp?.operatingLocalities[0] || '');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showContactBox, setShowContactBox] = useState(false);
  const [inquiryBody, setInquiryBody] = useState('');
  const [inquirySent, setInquirySent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

  const avatar = bp?.avatarUrl || broker.avatarUrl;
  const initials = broker.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleToggleSave = async (propertyId: string) => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/brokers/${broker.id}`)}`);
      return;
    }
    const res = await apiClient.toggleSaved(propertyId);
    setSavedIds(res.savedIds);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/brokers/${broker.id}`)}`);
      return;
    }
    if (!comment.trim()) return;
    setError('');
    setBusy(true);
    try {
      const res = await apiClient.createReview({
        brokerId: broker.id,
        rating,
        comment: comment.trim(),
        locality: locality.trim() || undefined,
      });
      setReviews((prev) => [res.review, ...prev]);
      setComment('');
      setShowReviewForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to post review.');
    } finally {
      setBusy(false);
    }
  };

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/brokers/${broker.id}`)}`);
      return;
    }
    if (!inquiryBody.trim()) return;
    const targetPropId = activeProps[0]?.id || brokerProperties[0]?.id || 'general';
    setError('');
    setBusy(true);
    try {
      await apiClient.createMessage({
        propertyId: targetPropId,
        recipientId: broker.id,
        body: inquiryBody.trim(),
      });
      setInquiryBody('');
      setInquirySent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 md:pb-14 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] text-sm font-semibold text-[#0B1324] inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Hero Profile Card */}
      <section className="bg-white rounded-3xl border border-[#E6E9EF] shadow-[0_12px_36px_-8px_rgba(11,19,36,0.06)] p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-[#EEF3FF] border border-[#E6E9EF] overflow-hidden flex items-center justify-center shrink-0">
              {avatar ? (
                <PropertyImage
                  src={avatar}
                  alt={broker.name}
                  sizes="96px"
                  className="h-full w-full"
                />
              ) : (
                <span className="font-display text-2xl font-bold text-[#1A56FF]">
                  {initials}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1324]">
                  {broker.name}
                </h1>
                {verified && (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1A56FF]"
                    aria-label="Verified Broker"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verified Broker</span>
                  </span>
                )}
                {!verified && user?.id === broker.id && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                    <ShieldAlert className="h-4 w-4" />
                    <span>{getBrokerVerificationLabel(broker)}</span>
                  </span>
                )}
              </div>

              <p className="text-sm font-medium text-[#5E687A] flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-[#9AA5B5]" />
                <span>
                  {bp?.agencyName ? bp.agencyName : 'Independent Property Broker'}
                </span>
              </p>

              {bp?.reraId && (
                <p className="text-xs text-[#5E687A] tabular-nums">
                  RERA Reg: {bp.reraId}
                </p>
              )}

              <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5E687A] tabular-nums">
                <span className="inline-flex items-center gap-1 font-semibold text-[#0B1324]">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span>{avgRating}</span>
                  <span className="font-normal text-[#5E687A]">
                    ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                  </span>
                </span>
                <span aria-hidden="true">·</span>
                <span>{bp?.yearsExperience ?? 1} years experience</span>
                <span aria-hidden="true">·</span>
                <span>{activeProps.length} active properties</span>
                <span aria-hidden="true">·</span>
                <span>{bp?.closedDealsCount ?? 0} closed deals</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href={`tel:${bp?.phone || broker.phone}`}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] border border-[#E6E9EF] text-sm font-semibold text-[#0B1324] inline-flex items-center gap-2"
            >
              <Phone className="h-4 w-4 text-[#1A56FF]" />
              <span>Call Broker</span>
            </a>

            {user?.id !== broker.id && (
              <button
                type="button"
                onClick={() => setShowContactBox((v) => !v)}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Contact</span>
              </button>
            )}
          </div>
        </div>

        {showContactBox && (
          <div className="mt-6 pt-5 border-t border-[#E6E9EF] max-w-xl space-y-3">
            {!user ? (
              <div className="bg-[#F7F8FA] rounded-xl p-4 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-[#5E687A]">
                  Sign in to send a direct inquiry to {broker.name}.
                </span>
                <Link
                  href={`/login?next=${encodeURIComponent(`/brokers/${broker.id}`)}`}
                  className="px-4 py-2 rounded-xl bg-[#1A56FF] text-white text-xs font-semibold whitespace-nowrap"
                >
                  Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSendInquiry} className="space-y-3">
                <label
                  htmlFor="broker-inquiry-input"
                  className="block text-xs font-semibold text-[#5E687A]"
                >
                  Send a Direct Inquiry to {broker.name}
                </label>
                <div className="flex gap-2">
                  <input
                    id="broker-inquiry-input"
                    type="text"
                    required
                    value={inquiryBody}
                    onChange={(e) => setInquiryBody(e.target.value)}
                    placeholder="Ask about availability, localities, or brokerage terms..."
                    className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="min-h-[42px] px-5 rounded-xl bg-[#1A56FF] text-white text-xs font-semibold"
                  >
                    {busy ? 'Sending...' : 'Send'}
                  </button>
                </div>
                {inquirySent && (
                  <p className="text-xs font-semibold text-emerald-700">
                    Message delivered to {broker.name}.
                  </p>
                )}
              </form>
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 text-xs font-medium text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 pt-6 border-t border-[#E6E9EF] grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-2">
            <h2 className="font-display text-sm font-bold text-[#0B1324]">About</h2>
            <p className="text-sm text-[#5E687A] leading-relaxed">
              {bp?.bio ||
                `${broker.name} helps home seekers discover verified residential and investment properties across ${bp?.operatingLocalities.join(', ') || broker.city}.`}
            </p>
            {bp?.website && (
              <a
                href={bp.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A56FF] hover:underline pt-1"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>{bp.website}</span>
              </a>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="font-display text-sm font-bold text-[#0B1324]">
                Operating Localities
              </h2>
              <p className="mt-1.5 text-xs text-[#5E687A] flex items-start gap-1.5 leading-relaxed">
                <MapPin className="h-3.5 w-3.5 text-[#1A56FF] shrink-0 mt-0.5" />
                <span>{bp?.operatingLocalities.join(' · ') || broker.city}</span>
              </p>
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-[#0B1324]">
                Property Specialization
              </h2>
              <p className="mt-1.5 text-xs text-[#5E687A] leading-relaxed">
                {bp?.specializations?.join(' · ') ||
                  bp?.propertyCategories.join(' · ') ||
                  'Residential Flats & Houses'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Active Properties Portfolio */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold text-[#0B1324]">
            Active Properties ({activeProps.length})
          </h2>
        </div>
        {activeProps.length === 0 ? (
          <div className="bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-6 text-sm text-[#5E687A]">
            No active public listings from this broker at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProps.map((prop) => (
              <PropertyCard
                key={prop.id}
                property={prop}
                isSaved={savedIds.includes(prop.id)}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        )}
      </section>

      {/* Customer Reviews */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0B1324]">
              Customer Reviews & Ratings
            </h2>
            <p className="text-xs text-[#5E687A] tabular-nums">
              {avgRating} average from {reviews.length} verified reviews
            </p>
          </div>
          {user?.id !== broker.id && (
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  router.push(`/login?next=${encodeURIComponent(`/brokers/${broker.id}`)}`);
                  return;
                }
                setShowReviewForm((v) => !v);
              }}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#EEF3FF] hover:bg-[#DFEAFF] text-[#1A56FF] text-xs font-semibold"
            >
              {showReviewForm ? 'Cancel Review' : 'Write a Review'}
            </button>
          )}
        </div>

        {showReviewForm && (
          <form
            onSubmit={handleSubmitReview}
            className="bg-white rounded-2xl border border-[#E6E9EF] p-5 space-y-4 max-w-2xl"
          >
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="block text-xs font-semibold text-[#5E687A] mb-1">
                  Rating
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      aria-label={`${star} stars`}
                      className="p-1"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          star <= rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-[#DCE2EC]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-[180px]">
                <label
                  htmlFor="review-locality"
                  className="block text-xs font-semibold text-[#5E687A] mb-1"
                >
                  Neighbourhood (Optional)
                </label>
                <input
                  id="review-locality"
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full min-h-[38px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-xs text-[#0B1324]"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="review-comment"
                className="block text-xs font-semibold text-[#5E687A] mb-1"
              >
                Your Experience
              </label>
              <textarea
                id="review-comment"
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share how responsive, accurate, and transparent the broker was..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="min-h-[42px] px-5 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-xs font-semibold"
            >
              {busy ? 'Posting...' : 'Post Review'}
            </button>
          </form>
        )}

        {reviews.length === 0 ? (
          <div className="bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-6 text-sm text-[#5E687A]">
            No customer reviews yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <article
                key={rev.id}
                className="bg-white rounded-2xl border border-[#E6E9EF] p-5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-sm font-bold text-[#0B1324]">
                    {rev.authorName}
                  </p>
                  <span className="inline-flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </span>
                </div>
                <p className="text-sm text-[#5E687A] leading-relaxed">{rev.comment}</p>
                {rev.locality && (
                  <p className="text-[11px] text-[#9AA5B5]">{rev.locality}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
