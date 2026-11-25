'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  CheckCircle2,
  MapPin,
  MessageSquare,
  Phone,
  Send,
} from 'lucide-react';
import type { Message, Property, Visit } from '@/types';
import { formatINR } from '@/lib/matching';
import { apiClient } from '@/lib/api/client';
import { useSession } from '@/components/providers/AppProviders';
import { PropertyImage } from '@/components/PropertyImage';
import { ReportListingLink } from '@/components/ReportListingLink';

interface PropertyDetailsClientProps {
  property: Property;
  initialSaved: boolean;
  initialMessages: Message[];
  initialVisits: Visit[];
  initialContactOpen?: boolean;
}

const TIME_SLOTS = ['10:00 AM', '11:30 AM', '2:00 PM', '4:30 PM', '6:00 PM'];

export function PropertyDetailsClient({
  property,
  initialSaved,
  initialMessages,
  initialVisits,
  initialContactOpen = false,
}: PropertyDetailsClientProps) {
  const router = useRouter();
  const { user, demoUsers, switchDemoUser } = useSession();

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [visits, setVisits] = useState<Visit[]>(initialVisits);

  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showMessagePanel, setShowMessagePanel] = useState(initialContactOpen);
  const [visitDate, setVisitDate] = useState('2026-11-22');
  const [visitSlot, setVisitSlot] = useState('11:30 AM');
  const [visitNotes, setVisitNotes] = useState('');
  const [visitConfirmation, setVisitConfirmation] = useState('');
  const [messageText, setMessageText] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setIsSaved(initialSaved);
    setMessages(initialMessages);
    setVisits(initialVisits);
  }, [initialSaved, initialMessages, initialVisits]);

  const handleToggleSave = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/properties/${property.id}`)}`);
      return;
    }
    try {
      const res = await apiClient.toggleSaved(property.id);
      setIsSaved(res.savedIds.includes(property.id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to save property.');
    }
  };

  const handleBookVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitDate || !visitSlot) return;
    setActionError('');
    setBusy(true);
    try {
      const res = await apiClient.createVisit({
        propertyId: property.id,
        date: visitDate,
        timeSlot: visitSlot,
        notes: visitNotes.trim() || undefined,
      });
      setVisits((prev) => [res.visit, ...prev]);
      setVisitConfirmation(`Visit requested for ${visitDate} at ${visitSlot}`);
      setShowVisitForm(false);
      setVisitNotes('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to schedule visit.');
    } finally {
      setBusy(false);
    }
  };

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setActionError('');
    setBusy(true);
    try {
      const res = await apiClient.createMessage({
        propertyId: property.id,
        recipientId: property.brokerId,
        body: messageText.trim(),
      });
      setMessages((prev) => [...prev, res.message]);
      setMessageText('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setBusy(false);
    }
  };

  const handleQuickDemoSeeker = async () => {
    const demoSeeker = demoUsers.find((u) => u.role === 'seeker');
    if (!demoSeeker) {
      router.push(`/login?next=${encodeURIComponent(`/properties/${property.id}`)}`);
      return;
    }
    setBusy(true);
    try {
      await switchDemoUser(demoSeeker.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-28 md:pb-12">
      {/* Top Action Row */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] text-sm font-semibold text-[#0B1324] inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={handleToggleSave}
          className={`min-h-[42px] px-4 py-2 rounded-xl border text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
            isSaved
              ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
              : 'bg-white border-[#E6E9EF] text-[#0B1324] hover:bg-[#F7F8FA]'
          }`}
        >
          <Bookmark className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} />
          <span>{isSaved ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          {/* Hero Gallery */}
          <div className="space-y-3">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-[#F2F4F8] border border-[#E6E9EF]">
              <PropertyImage
                src={property.images[activeImageIdx] || property.images[0]}
                alt={property.title}
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="w-full h-full"
              />
            </div>
            {property.images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {property.images.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    aria-label={`View photo ${idx + 1} of ${property.title}`}
                    className={`relative w-24 aspect-[4/3] rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      activeImageIdx === idx
                        ? 'border-[#1A56FF]'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    <PropertyImage
                      src={img}
                      alt={`${property.title} view ${idx + 1}`}
                      sizes="96px"
                      className="w-full h-full"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Primary Price, Title & Location */}
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="font-display text-2xl sm:text-3xl font-bold text-[#0B1324] tabular-nums">
                {formatINR(property.price, property.intent)}
                {property.intent === 'rent' && (
                  <span className="text-base font-normal text-[#5E687A]"> / month</span>
                )}
              </p>
              <span className="text-xs font-semibold text-[#1A56FF]">
                {property.intent === 'rent' ? 'Available for Rent' : 'Available for Sale'} ·{' '}
                {property.availableFrom}
              </span>
            </div>

            <h1 className="mt-2 font-display text-xl sm:text-2xl font-bold text-[#0B1324] text-balance">
              {property.title}
            </h1>

            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[#5E687A]">
              <MapPin className="h-4 w-4 text-[#1A56FF] shrink-0" />
              <span>{property.address}</span>
            </p>

            {property.depositOrMaintenance && (
              <p className="mt-2 text-xs text-[#5E687A] tabular-nums">
                {property.depositOrMaintenance}
              </p>
            )}
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#E6E9EF]">
            {[
              { label: 'Configuration', value: `${property.bedrooms} BHK · ${property.bathrooms} Bath` },
              { label: 'Carpet Area', value: `${property.areaSqFt.toLocaleString('en-IN')} sq.ft` },
              { label: 'Furnishing', value: property.furnishing },
              { label: 'Floor', value: property.floorInfo },
            ].map((spec) => (
              <div key={spec.label} className="bg-[#F7F8FA] rounded-2xl p-3.5">
                <p className="text-[11px] font-medium text-[#5E687A]">{spec.label}</p>
                <p className="mt-1 text-sm font-semibold text-[#0B1324] tabular-nums">
                  {spec.value}
                </p>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="pt-4 border-t border-[#E6E9EF]">
            <h2 className="font-display text-base font-bold text-[#0B1324]">
              About this property
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#5E687A] leading-relaxed">
              {property.description}
            </p>
            {property.additionalInfo && (
              <p className="mt-2 text-xs text-[#5E687A]">{property.additionalInfo}</p>
            )}
          </div>

          {/* Amenities */}
          <div className="pt-4 border-t border-[#E6E9EF]">
            <h2 className="font-display text-base font-bold text-[#0B1324]">
              Amenities & Highlights
            </h2>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-sm text-[#0B1324]">
              {property.amenities.map((am) => (
                <div key={am} className="flex items-center gap-2 py-1">
                  <CheckCircle2 className="h-4 w-4 text-[#1A56FF] shrink-0" />
                  <span>{am}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-[#E6E9EF] bg-[#F7F8FA] p-4 text-sm leading-6 text-[#5E687A]">
            <p className="font-semibold text-[#0B1324]">Please verify before you transact</p>
            <p>Hemlo does not verify title, ownership, approvals, or listing accuracy. Buyers, tenants, and brokers must do their own checks with the relevant authorities and qualified professionals.</p>
            <Link href="/property-disclaimer" className="mt-2 inline-block text-xs font-semibold text-[#1A56FF]">Read the property-check disclaimer</Link>
          </aside>
        </div>

        {/* Right Sticky Action & Broker Column */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
          <div className="bg-white rounded-3xl border border-[#E6E9EF] shadow-[0_12px_32px_-4px_rgba(11,19,36,0.08)] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#E6E9EF]">
              <div>
                <p className="text-xs font-medium text-[#5E687A]">Represented by Broker</p>
                <p className="mt-1 font-display text-lg font-bold text-[#0B1324] flex items-center gap-1.5">
                  <span>{property.brokerName}</span>
                  {property.brokerVerified && (
                    <CheckCircle2 className="h-4 w-4 text-[#1A56FF]" />
                  )}
                  {!property.brokerVerified && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Unverified broker</span>
                  )}
                </p>
                {property.brokerAgency && (
                  <p className="text-xs text-[#5E687A]">{property.brokerAgency}</p>
                )}
                {property.brokerReraId && (
                  <p className="mt-1 text-xs font-semibold text-[#5E687A] tabular-nums">
                    {property.brokerReraAuthority || 'State RERA'}: {property.brokerReraId}
                  </p>
                )}
                <Link
                  href={`/brokers/${property.brokerId}`}
                  className="inline-block mt-1.5 text-xs font-semibold text-[#1A56FF] hover:text-[#1244D8]"
                >
                  View Broker Profile & Reviews →
                </Link>
              </div>
              <a
                href={`tel:${property.brokerPhone}`}
                className="h-10 px-3 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] text-xs font-semibold text-[#0B1324] inline-flex items-center gap-1.5 shrink-0"
              >
                <Phone className="h-3.5 w-3.5 text-[#1A56FF]" />
                <span>Call</span>
              </a>
            </div>

            <div className="mt-4">
              <ReportListingLink listingId={property.id} />
            </div>

            <div className="py-4 border-b border-[#E6E9EF] flex items-center justify-between text-sm">
              <span className="text-[#5E687A]">Brokerage Charges</span>
              <span className="font-semibold text-[#0B1324] tabular-nums">
                {property.brokerageFee}
              </span>
            </div>

            {/* Primary Action Buttons */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowMessagePanel((v) => !v);
                  setShowVisitForm(false);
                }}
                className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Contact Broker</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowVisitForm((v) => !v);
                  setShowMessagePanel(false);
                }}
                className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#F7F8FA] hover:bg-[#ECEFF4] border border-[#E6E9EF] text-[#0B1324] text-sm font-semibold inline-flex items-center justify-center gap-2"
              >
                <Calendar className="h-4 w-4 text-[#1A56FF]" />
                <span>Schedule Visit</span>
              </button>
            </div>

            {actionError && (
              <p className="mt-3 text-xs font-medium text-red-600" role="alert">
                {actionError}
              </p>
            )}

            {visitConfirmation && (
              <p className="mt-4 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl px-3.5 py-2.5">
                {visitConfirmation}
              </p>
            )}

            {visits.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#E6E9EF] space-y-2">
                <p className="text-xs font-semibold text-[#5E687A]">Your Scheduled Visits</p>
                {visits.map((v) => (
                  <div
                    key={v.id}
                    className="text-xs bg-[#F7F8FA] rounded-xl p-3 flex items-center justify-between"
                  >
                    <span className="font-semibold text-[#0B1324] tabular-nums">
                      {v.date} · {v.timeSlot}
                    </span>
                    <span className="capitalize font-semibold text-[#1A56FF]">{v.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Auth prompt if guest opens Contact or Schedule Visit */}
            {(showVisitForm || showMessagePanel) && !user && (
              <div className="mt-5 pt-5 border-t border-[#E6E9EF] bg-[#F7F8FA] rounded-2xl p-4 space-y-3">
                <p className="text-xs font-semibold text-[#0B1324]">
                  Sign in to message {property.brokerName} or schedule a visit
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleQuickDemoSeeker}
                    className="min-h-[38px] px-4 rounded-xl bg-[#1A56FF] text-white text-xs font-semibold"
                  >
                    {busy ? 'Signing in...' : 'Continue as Demo Seeker'}
                  </button>
                  <Link
                    href={`/login?next=${encodeURIComponent(`/properties/${property.id}`)}`}
                    className="min-h-[38px] px-4 rounded-xl bg-white border border-[#E6E9EF] text-xs font-semibold text-[#0B1324] inline-flex items-center"
                  >
                    Sign in with Email
                  </Link>
                </div>
              </div>
            )}

            {/* Schedule Visit Form */}
            {showVisitForm && user && (
              <form
                onSubmit={handleBookVisit}
                className="mt-5 pt-5 border-t border-[#E6E9EF] space-y-4"
              >
                <h3 className="font-display text-sm font-bold text-[#0B1324]">
                  Book a Property Tour
                </h3>
                <div>
                  <label
                    htmlFor="visit-date"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Select Date
                  </label>
                  <input
                    id="visit-date"
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-[#5E687A] mb-1.5">
                    Time Slot
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setVisitSlot(slot)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                          visitSlot === slot
                            ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                            : 'bg-white border-[#E6E9EF] text-[#5E687A]'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="visit-notes"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Note for Broker (Optional)
                  </label>
                  <input
                    id="visit-notes"
                    type="text"
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    placeholder="E.g. Need parking spot inspection"
                    className="w-full min-h-[42px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full min-h-[44px] rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold"
                >
                  {busy ? 'Confirming...' : 'Confirm Visit Request'}
                </button>
              </form>
            )}

            {/* Direct Broker Messaging Thread */}
            {showMessagePanel && user && (
              <div className="mt-5 pt-5 border-t border-[#E6E9EF] space-y-3">
                <h3 className="font-display text-sm font-bold text-[#0B1324]">
                  Direct Conversation with {property.brokerName}
                </h3>

                <div className="max-h-52 overflow-y-auto space-y-2.5 bg-[#F7F8FA] rounded-2xl p-3">
                  {messages.length === 0 ? (
                    <p className="text-xs text-[#5E687A] text-center py-4">
                      Start a conversation to ask about lease terms, society rules, or availability.
                    </p>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.senderId === user.id;
                      return (
                        <div
                          key={msg.id}
                          className={`rounded-xl px-3 py-2 text-xs max-w-[88%] ${
                            isMine
                              ? 'ml-auto bg-[#1A56FF] text-white'
                              : 'bg-white border border-[#E6E9EF] text-[#0B1324]'
                          }`}
                        >
                          <p className="font-semibold opacity-80 mb-0.5">{msg.senderName}</p>
                          <p className="leading-relaxed">{msg.body}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleMessageSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Write a message to the broker..."
                    aria-label="Message to broker"
                    className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] focus:outline-none focus:border-[#1A56FF] focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={busy || !messageText.trim()}
                    aria-label="Send message"
                    className="min-h-[42px] px-4 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] disabled:opacity-50 text-white flex items-center justify-center"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
