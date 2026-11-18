'use client';

import {
  ArrowRight,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  Compass,
  FileText,
  Plus,
  ShieldAlert,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import type {
  AppNotification,
  Property,
  Proposal,
  Requirement,
  User,
  Visit,
  VisitStatus,
} from '@/types';
import {
  formatBudgetRange,
  formatINR,
  formatRelativeDate,
  getBrokerVerificationLabel,
  isBrokerVerified,
  rankPropertiesForRequirement,
} from '@/lib/matching';
import { PropertyImage } from '@/components/PropertyImage';

interface BrokerDashboardViewProps {
  broker: User;
  requirements: Requirement[];
  inventory: Property[];
  proposals: Proposal[];
  visits: Visit[];
  notifications: AppNotification[];
  onAddNewProperty: () => void;
  onFindLeads: () => void;
  onManageInventory: () => void;
  onViewProposals: () => void;
  onViewPublicProfile: () => void;
  onCompleteVerification: () => void;
  onSubmitProposalFor: (req: Requirement) => void;
  onUpdateVisitStatus: (visitId: string, status: VisitStatus) => Promise<void>;
  onMarkNotificationsRead: () => Promise<void>;
}

export function BrokerDashboardView({
  broker,
  requirements,
  inventory,
  proposals,
  visits,
  notifications,
  onAddNewProperty,
  onFindLeads,
  onManageInventory,
  onViewProposals,
  onViewPublicProfile,
  onCompleteVerification,
  onSubmitProposalFor,
  onUpdateVisitStatus,
  onMarkNotificationsRead,
}: BrokerDashboardViewProps) {
  const activeReqs = requirements.filter((r) => r.status === 'active');
  const serviceAreas = broker.brokerProfile?.operatingLocalities || [];
  const verified = isBrokerVerified(broker);
  const verificationLabel = getBrokerVerificationLabel(broker);

  const activeInventory = inventory.filter((p) => p.availability === 'available');
  const matchingReqs = activeReqs.filter((req) => {
    const inArea =
      serviceAreas.length === 0 ||
      req.localities.some((loc) =>
        serviceAreas.some((sa) => sa.toLowerCase() === loc.toLowerCase())
      );
    const ranked = rankPropertiesForRequirement(req, activeInventory);
    return inArea || (ranked[0] && ranked[0].match.score >= 70);
  });

  const brokerProposals = proposals.filter((p) => p.brokerId === broker.id);
  const brokerVisits = visits.filter((v) => v.brokerId === broker.id && v.status !== 'cancelled');
  const brokerNotifications = notifications.filter((n) => n.userId === broker.id);
  const unreadNotifs = brokerNotifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 md:pb-14 space-y-8">
      {/* Top Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-[#1A56FF]">
              {broker.brokerProfile?.agencyName || 'Independent Broker'}
            </span>
            <button
              type="button"
              onClick={verified ? onViewPublicProfile : onCompleteVerification}
              className={`inline-flex items-center gap-1 text-xs font-semibold ${
                verified ? 'text-emerald-700' : 'text-amber-700 hover:underline'
              }`}
            >
              {verified ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5" />
              )}
              <span>{verificationLabel}</span>
            </button>
          </div>

          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#0B1324]">
            Welcome back, {broker.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-[#5E687A]">
            Manage your properties and find your next customer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onViewPublicProfile}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-white hover:bg-[#F7F8FA] border border-[#E6E9EF] text-xs sm:text-sm font-semibold text-[#0B1324] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <UserCircle2 className="h-4 w-4 text-[#5E687A]" />
            <span>Public Profile</span>
          </button>

          <button
            type="button"
            onClick={onAddNewProperty}
            className="min-h-[42px] px-5 py-2 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>List a Property</span>
          </button>
        </div>
      </div>

      {/* Four Key Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Properties', value: inventory.length, onClick: onManageInventory },
          { label: 'Active Properties', value: activeInventory.length, onClick: onManageInventory },
          { label: 'Matching Requirements', value: matchingReqs.length, onClick: onFindLeads },
          { label: 'Proposals Sent', value: brokerProposals.length, onClick: onViewProposals },
        ].map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={stat.onClick}
            className="text-left bg-white hover:border-[#1A56FF]/50 rounded-2xl border border-[#E6E9EF] p-5 transition-colors"
          >
            <p className="text-xs font-medium text-[#5E687A]">{stat.label}</p>
            <p className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#0B1324] tabular-nums">
              {stat.value}
            </p>
          </button>
        ))}
      </div>

      {/* D. Quick Actions Bar */}
      <section aria-label="Quick actions" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={onAddNewProperty}
          className="min-h-[52px] px-3.5 sm:px-4 py-3 rounded-2xl bg-[#EEF3FF] hover:bg-[#DFEAFF] text-[#1A56FF] text-xs sm:text-sm font-semibold text-left flex items-center justify-between gap-2 transition-colors"
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <Plus className="h-4 w-4 shrink-0" />
            <span>Add New Property</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </button>

        <button
          type="button"
          onClick={onFindLeads}
          className="min-h-[52px] px-3.5 sm:px-4 py-3 rounded-2xl bg-white hover:bg-[#F7F8FA] border border-[#E6E9EF] text-[#0B1324] text-xs sm:text-sm font-semibold text-left flex items-center justify-between gap-2 transition-colors"
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <Compass className="h-4 w-4 text-[#1A56FF] shrink-0" />
            <span>Discover Leads</span>
          </span>
          <ArrowRight className="h-4 w-4 text-[#9AA5B5] shrink-0" />
        </button>

        <button
          type="button"
          onClick={onManageInventory}
          className="min-h-[52px] px-3.5 sm:px-4 py-3 rounded-2xl bg-white hover:bg-[#F7F8FA] border border-[#E6E9EF] text-[#0B1324] text-xs sm:text-sm font-semibold text-left flex items-center justify-between gap-2 transition-colors"
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 text-[#1A56FF] shrink-0" />
            <span>Manage Inventory</span>
          </span>
          <ArrowRight className="h-4 w-4 text-[#9AA5B5] shrink-0" />
        </button>

        <button
          type="button"
          onClick={onViewProposals}
          className="min-h-[52px] px-3.5 sm:px-4 py-3 rounded-2xl bg-white hover:bg-[#F7F8FA] border border-[#E6E9EF] text-[#0B1324] text-xs sm:text-sm font-semibold text-left flex items-center justify-between gap-2 transition-colors"
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-[#1A56FF] shrink-0" />
            <span>View Proposals</span>
          </span>
          <ArrowRight className="h-4 w-4 text-[#9AA5B5] shrink-0" />
        </button>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: A. Recent Customer Requirements + B. My Properties */}
        <div className="lg:col-span-7 space-y-8">
          {/* A. Recent Customer Requirements */}
          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-base sm:text-lg font-bold text-[#0B1324]">
                Recent Customer Requirements
              </h2>
              <button
                type="button"
                onClick={onFindLeads}
                className="text-xs font-semibold text-[#1A56FF] hover:text-[#1244D8] whitespace-nowrap shrink-0"
              >
                Find Leads →
              </button>
            </div>

            {matchingReqs.length === 0 ? (
              <div className="bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-6 text-sm text-[#5E687A]">
                No active customer requirements match your operating areas yet. Check all leads in Find Leads.
              </div>
            ) : (
              <div className="space-y-4">
                {matchingReqs.slice(0, 3).map((req) => {
                  const topMatch = rankPropertiesForRequirement(req, activeInventory)[0];
                  const alreadyPitched = brokerProposals.some(
                    (p) => p.requirementId === req.id
                  );

                  return (
                    <article
                      key={req.id}
                      className="bg-white rounded-2xl border border-[#E6E9EF] p-5 shadow-[0_4px_20px_-2px_rgba(11,19,36,0.04)]"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-medium text-[#5E687A] tabular-nums">
                            {req.id.toUpperCase()} · {req.intent === 'rent' ? 'Rent' : 'Buy'} ·{' '}
                            {formatRelativeDate(req.createdAt)}
                          </p>
                          <h3 className="mt-0.5 font-display text-base font-bold text-[#0B1324]">
                            {req.bedrooms === 4 ? '4+' : req.bedrooms} BHK {req.propertyType} ·{' '}
                            {req.localities.join(', ')}
                          </h3>
                        </div>
                        <span className="font-display text-sm font-bold text-[#1A56FF] tabular-nums">
                          {formatBudgetRange(req.budgetMin, req.budgetMax, req.intent)}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-[#5E687A]">
                        Furnishing: {req.furnishing} · Move-in {req.moveInDate}
                        {req.amenities.length > 0
                          ? ` · ${req.amenities.slice(0, 3).join(', ')}`
                          : ''}
                      </p>

                      <div className="mt-3.5 pt-3.5 border-t border-[#E6E9EF] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          {topMatch ? (
                            <>
                              <p className="text-xs font-semibold text-[#0B1324] truncate">
                                Best fit: {topMatch.property.title}
                              </p>
                              <p className="text-[11px] text-[#5E687A] tabular-nums">
                                {topMatch.match.score}% {topMatch.match.label} ·{' '}
                                {formatINR(topMatch.property.price, topMatch.property.intent)}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-[#5E687A]">
                              Matches your service area ({req.localities[0]})
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onSubmitProposalFor(req)}
                          className="px-3.5 py-2 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-xs font-semibold whitespace-nowrap shrink-0"
                        >
                          {alreadyPitched ? 'Pitch Another' : 'Send Property Proposal'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* B. My Properties */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#0B1324]">
                My Properties
              </h2>
              <button
                type="button"
                onClick={onManageInventory}
                className="text-xs font-semibold text-[#1A56FF] hover:text-[#1244D8]"
              >
                Manage Inventory →
              </button>
            </div>

            {inventory.length === 0 ? (
              <div className="bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-6 text-center">
                <p className="text-sm font-semibold text-[#0B1324]">No properties listed yet</p>
                <p className="mt-1 text-xs text-[#5E687A]">
                  List your first property to receive match scores against customer briefs.
                </p>
                <button
                  type="button"
                  onClick={onAddNewProperty}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#1A56FF] text-white text-xs font-semibold"
                >
                  + List a Property
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {inventory.slice(0, 4).map((prop) => (
                  <article
                    key={prop.id}
                    className="bg-white rounded-2xl border border-[#E6E9EF] overflow-hidden flex gap-3.5 p-3.5 items-center"
                  >
                    <PropertyImage
                      src={prop.images[0]}
                      alt={prop.title}
                      className="w-20 h-16 rounded-xl shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display text-sm font-bold text-[#0B1324] tabular-nums">
                          {formatINR(prop.price, prop.intent)}
                          {prop.intent === 'rent' ? '/mo' : ''}
                        </p>
                        <span
                          className={`text-[11px] font-semibold capitalize ${
                            prop.availability === 'available'
                              ? 'text-emerald-700'
                              : 'text-[#5E687A]'
                          }`}
                        >
                          {prop.availability === 'available' ? 'Active' : prop.availability}
                        </span>
                      </div>
                      <h3 className="text-xs font-semibold text-[#0B1324] truncate mt-0.5">
                        {prop.title}
                      </h3>
                      <p className="text-[11px] text-[#5E687A] truncate">
                        {prop.locality} · {prop.bedrooms} BHK
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: C. Recent Activity + Scheduled Visits */}
        <div className="lg:col-span-5 space-y-8">
          {/* C. Recent Activity */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-[#0B1324] inline-flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#1A56FF]" />
                <span>Recent Activity</span>
                {unreadNotifs > 0 && (
                  <span className="text-xs font-semibold text-[#1A56FF] tabular-nums">
                    ({unreadNotifs} new)
                  </span>
                )}
              </h2>
              {unreadNotifs > 0 && (
                <button
                  type="button"
                  onClick={onMarkNotificationsRead}
                  className="text-xs font-semibold text-[#5E687A] hover:text-[#1A56FF]"
                >
                  Mark read
                </button>
              )}
            </div>

            {brokerNotifications.length === 0 ? (
              <div className="bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-5 text-xs text-[#5E687A]">
                Activity updates appear here when seekers view proposals, express interest, or book visits.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E6E9EF] divide-y divide-[#E6E9EF]">
                {brokerNotifications.slice(0, 6).map((notif) => (
                  <div key={notif.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`text-xs ${
                          notif.read
                            ? 'font-medium text-[#0B1324]'
                            : 'font-bold text-[#0B1324]'
                        }`}
                      >
                        {notif.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[#5E687A] leading-relaxed">
                        {notif.body}
                      </p>
                    </div>
                    <span className="text-[11px] text-[#9AA5B5] whitespace-nowrap shrink-0 tabular-nums">
                      {formatRelativeDate(notif.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Scheduled Property Visits */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-bold text-[#0B1324]">
              Scheduled Property Visits
            </h2>
            {brokerVisits.length === 0 ? (
              <div className="bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-5 text-sm text-[#5E687A]">
                No customer visits booked yet.
              </div>
            ) : (
              <div className="space-y-3">
                {brokerVisits.map((visit) => {
                  const prop = inventory.find((p) => p.id === visit.propertyId);
                  return (
                    <div
                      key={visit.id}
                      className="bg-white rounded-2xl border border-[#E6E9EF] p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#1A56FF] inline-flex items-center gap-1.5 tabular-nums">
                          <Calendar className="h-3.5 w-3.5" />
                          {visit.date} · {visit.timeSlot}
                        </span>
                        <span className="capitalize font-semibold text-[#0B1324]">
                          {visit.status}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[#0B1324]">
                        {prop?.title || 'Property Tour'}
                      </p>
                      <p className="text-xs text-[#5E687A]">
                        Seeker: {visit.seekerName}
                        {visit.notes ? ` · "${visit.notes}"` : ''}
                      </p>
                      {visit.status === 'requested' && (
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => onUpdateVisitStatus(visit.id, 'confirmed')}
                            className="px-3 py-1.5 rounded-xl bg-[#1A56FF] text-white text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Confirm Tour</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateVisitStatus(visit.id, 'cancelled')}
                            className="px-3 py-1.5 rounded-xl border border-[#E6E9EF] text-xs font-semibold text-[#5E687A]"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
