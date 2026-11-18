'use client';

import { useState } from 'react';
import { CheckCircle2, ExternalLink, Plus, Upload, X } from 'lucide-react';
import type {
  FurnishingType,
  Property,
  PropertyCategory,
  Proposal,
  Requirement,
  User,
} from '@/types';
import type { CreatePropertyInput, CreateProposalInput } from '@/lib/validation/schemas';
import { PROPERTY_IMAGES } from '@/lib/constants/media';
import {
  LOCALITIES,
  computePropertyMatch,
  formatBudgetRange,
  formatINR,
  hasExistingProposal,
  rankPropertiesForRequirement,
} from '@/lib/matching';
import { uploadMediaFile } from '@/lib/storage/client-compress';
import { PropertyImage } from '@/components/PropertyImage';

interface SubmitProposalModalProps {
  broker: User;
  requirement: Requirement;
  inventory: Property[];
  existingProposals: Proposal[];
  onClose: () => void;
  onListNewProperty?: () => void;
  onCreateProperty: (payload: CreatePropertyInput) => Promise<Property>;
  onSubmitProposal: (payload: CreateProposalInput) => Promise<void>;
}

export function SubmitProposalModal({
  broker,
  requirement,
  inventory,
  existingProposals,
  onClose,
  onListNewProperty,
  onCreateProperty,
  onSubmitProposal,
}: SubmitProposalModalProps) {
  const activeInventory = inventory.filter((p) => p.availability === 'available');
  const ranked = rankPropertiesForRequirement(requirement, activeInventory);

  const firstEligible = ranked.find(
    ({ property }) => !hasExistingProposal(existingProposals, requirement.id, property.id)
  );

  const [mode, setMode] = useState<'existing' | 'new'>(
    ranked.length > 0 ? 'existing' : 'new'
  );
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    firstEligible?.property.id || ranked[0]?.property.id || ''
  );

  const initialEntry = ranked.find((r) => r.property.id === selectedPropertyId);
  const initialProp = initialEntry?.property;
  const [proposedPrice, setProposedPrice] = useState<number>(
    initialProp?.price || requirement.budgetMax
  );
  const [brokerageCharge, setBrokerageCharge] = useState<string>(
    initialProp?.brokerageFee ||
      (requirement.intent === 'rent' ? '1 Month Rent' : '1% of Sale Value')
  );
  const [whyMatches, setWhyMatches] = useState<string>(
    initialEntry?.match.reasons.slice(0, 3).join(' · ') ||
      `Matches ${requirement.bedrooms} BHK ${requirement.propertyType} criteria in ${requirement.localities[0]}`
  );
  const [message, setMessage] = useState<string>(
    `Hi ${requirement.seekerName.split(' ')[0]}, I have an available ${requirement.bedrooms} BHK ${requirement.propertyType.toLowerCase()} option in ${requirement.localities[0]} that fits your criteria. Happy to arrange a viewing.`
  );
  const [availabilityConfirmed, setAvailabilityConfirmed] = useState(true);

  // Quick inline new property fields
  const [newTitle, setNewTitle] = useState('');
  const [newLocality, setNewLocality] = useState(requirement.localities[0] || LOCALITIES[0]);
  const [newAddress, setNewAddress] = useState('');
  const [newType, setNewType] = useState<PropertyCategory>(requirement.propertyType);
  const [newBedrooms, setNewBedrooms] = useState<number>(requirement.bedrooms);
  const [newArea, setNewArea] = useState<number>(1200);
  const [newFurnishing, setNewFurnishing] = useState<FurnishingType>(
    requirement.furnishing === 'Any' ? 'Semi-furnished' : requirement.furnishing
  );
  const [newDescription, setNewDescription] = useState('');
  const [newImages, setNewImages] = useState<string[]>([PROPERTY_IMAGES.living]);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSelectExisting = (prop: Property) => {
    setSelectedPropertyId(prop.id);
    setProposedPrice(prop.price);
    setBrokerageCharge(prop.brokerageFee);
    const computed = computePropertyMatch(requirement, prop);
    if (computed.reasons.length > 0) {
      setWhyMatches(computed.reasons.slice(0, 3).join(' · '));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 3);
    setError('');
    for (const file of files) {
      try {
        const uploaded = await uploadMediaFile({ file, purpose: 'property' });
        setNewImages((prev) => [uploaded.url, ...prev].slice(0, 4));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to upload photo.');
      }
    }
  };

  const selectedAlreadyPitched =
    mode === 'existing' &&
    Boolean(selectedPropertyId) &&
    hasExistingProposal(existingProposals, requirement.id, selectedPropertyId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!proposedPrice || proposedPrice <= 0) {
      setError('Enter a valid price for this proposal.');
      return;
    }
    if (!brokerageCharge.trim()) {
      setError('Specify brokerage charges clearly.');
      return;
    }
    if (!availabilityConfirmed) {
      setError('Please confirm that this property is currently available for visits.');
      return;
    }
    if (selectedAlreadyPitched) {
      setError('You have already proposed this property for this customer requirement.');
      return;
    }

    setSubmitting(true);
    try {
      let targetPropertyId = selectedPropertyId;

      if (mode === 'new') {
        if (!newTitle.trim() || !newAddress.trim()) {
          setError('Property title and street address are required.');
          setSubmitting(false);
          return;
        }
        const createdProp = await onCreateProperty({
          title: newTitle.trim(),
          intent: requirement.intent,
          transactionType: requirement.intent === 'rent' ? 'For Rent' : 'For Sale',
          listingCategory:
            newType === 'Flat'
              ? 'Apartment / Flat'
              : newType === 'House'
              ? 'Independent House'
              : 'PG / Hostel',
          locality: newLocality,
          city: broker.city || 'Bengaluru',
          address: newAddress.trim(),
          price: proposedPrice,
          brokerageFee: brokerageCharge.trim(),
          propertyType: newType,
          bedrooms: newBedrooms,
          bathrooms: Math.max(1, newBedrooms),
          areaSqFt: newArea,
          floorInfo: '2nd Floor',
          furnishing: newFurnishing,
          availableFrom: requirement.moveInDate,
          amenities: requirement.amenities.length
            ? requirement.amenities
            : ['Covered Parking', 'Power Backup'],
          description:
            newDescription.trim() ||
            `Well-maintained ${newBedrooms} BHK ${newType.toLowerCase()} in ${newLocality}.`,
          images: newImages.length ? newImages : [PROPERTY_IMAGES.living],
          availability: 'available',
          mapX: 48,
          mapY: 52,
        });
        targetPropertyId = createdProp.id;
      }

      if (!targetPropertyId) {
        setError('Please select a property from your inventory or add a new one.');
        setSubmitting(false);
        return;
      }

      await onSubmitProposal({
        requirementId: requirement.id,
        propertyId: targetPropertyId,
        proposedPrice,
        brokerageCharge: brokerageCharge.trim(),
        message: message.trim(),
        whyMatches: whyMatches.trim(),
        availabilityConfirmed,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send proposal.');
      setSubmitting(false);
    }
  };

  const selectedProp = activeInventory.find((p) => p.id === selectedPropertyId);
  const liveMatch = selectedProp
    ? computePropertyMatch(requirement, { ...selectedProp, price: proposedPrice })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0B1324]/55 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Submit property proposal"
    >
      <div className="bg-white rounded-3xl border border-[#E6E9EF] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-[#E6E9EF] flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1324]">
              Send Property Proposal
            </h2>
            <p className="text-xs text-[#5E687A] tabular-nums">
              Req #{requirement.id.slice(-6).toUpperCase()} · {requirement.seekerName} ·{' '}
              {requirement.bedrooms} BHK {requirement.propertyType} in{' '}
              {requirement.localities.join(', ')} (
              {formatBudgetRange(requirement.budgetMin, requirement.budgetMax, requirement.intent)})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close proposal modal"
            className="h-9 w-9 rounded-xl hover:bg-[#F7F8FA] flex items-center justify-center text-[#5E687A]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          {/* Source Toggle */}
          <div className="grid grid-cols-2 p-1 bg-[#F7F8FA] border border-[#E6E9EF] rounded-xl">
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                mode === 'existing'
                  ? 'bg-white text-[#0B1324] shadow-xs'
                  : 'text-[#5E687A]'
              }`}
            >
              Active Inventory ({ranked.length})
            </button>
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1 ${
                mode === 'new' ? 'bg-white text-[#0B1324] shadow-xs' : 'text-[#5E687A]'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Quick-Add Property</span>
            </button>
          </div>

          {mode === 'existing' ? (
            <div className="space-y-2.5">
              {ranked.length === 0 ? (
                <div className="text-sm text-[#5E687A] bg-[#F7F8FA] rounded-xl p-4 space-y-2">
                  <p>No active properties in your inventory yet.</p>
                  {onListNewProperty && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onListNewProperty();
                      }}
                      className="text-xs font-semibold text-[#1A56FF] hover:text-[#1244D8] inline-flex items-center gap-1"
                    >
                      <span>Open full 9-step listing wizard</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                ranked.map(({ property, match }) => {
                  const alreadyPitched = hasExistingProposal(
                    existingProposals,
                    requirement.id,
                    property.id
                  );
                  const selected = selectedPropertyId === property.id;
                  return (
                    <button
                      key={property.id}
                      type="button"
                      disabled={alreadyPitched}
                      onClick={() => handleSelectExisting(property)}
                      className={`w-full text-left p-3 rounded-2xl border flex items-center gap-3.5 transition-all ${
                        alreadyPitched
                          ? 'bg-[#F7F8FA] border-[#E6E9EF] opacity-60 cursor-not-allowed'
                          : selected
                          ? 'bg-[#EEF3FF] border-[#1A56FF]'
                          : 'bg-white border-[#E6E9EF] hover:bg-[#F7F8FA]'
                      }`}
                    >
                      <PropertyImage
                        src={property.images[0]}
                        alt={property.title}
                        className="w-16 h-16 rounded-xl shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-[#0B1324] truncate">
                            {property.title}
                          </p>
                          <span className="text-xs font-bold text-[#1A56FF] tabular-nums shrink-0">
                            {alreadyPitched ? 'Already Pitched' : `${match.score}% Match`}
                          </span>
                        </div>
                        <p className="text-xs text-[#5E687A] tabular-nums">
                          {formatINR(property.price, property.intent)} · {property.locality} ·{' '}
                          {property.bedrooms} BHK · {property.furnishing}
                        </p>
                      </div>
                      {selected && !alreadyPitched && (
                        <CheckCircle2 className="h-5 w-5 text-[#1A56FF] shrink-0" />
                      )}
                    </button>
                  );
                })
              )}

              {liveMatch && (
                <div className="text-xs text-[#5E687A] bg-[#F7F8FA] rounded-xl p-3">
                  <span className="font-semibold text-[#0B1324]">
                    Score breakdown ({liveMatch.score}%):{' '}
                  </span>
                  {[...liveMatch.reasons, ...liveMatch.warnings].slice(0, 3).join(' · ')}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 bg-[#F7F8FA] rounded-2xl p-4 border border-[#E6E9EF]">
              {onListNewProperty && (
                <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E6E9EF]">
                  <span className="text-[#5E687A]">Need full specs, map pin & media gallery?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onListNewProperty();
                    }}
                    className="font-semibold text-[#1A56FF] hover:text-[#1244D8] inline-flex items-center gap-1"
                  >
                    <span>Use 9-Step Listing Wizard</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5E687A] mb-1">
                    Property Title
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="E.g. Sunlit 2 BHK in 4th Block"
                    className="w-full min-h-[42px] px-3 rounded-xl bg-white border border-[#E6E9EF] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E687A] mb-1">
                    Locality
                  </label>
                  <select
                    value={newLocality}
                    onChange={(e) => setNewLocality(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-xl bg-white border border-[#E6E9EF] text-sm"
                  >
                    {LOCALITIES.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5E687A] mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="E.g. 12th Main, Koramangala 4th Block"
                  className="w-full min-h-[42px] px-3 rounded-xl bg-white border border-[#E6E9EF] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5E687A] mb-1">
                    Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as PropertyCategory)}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-white border border-[#E6E9EF] text-xs font-medium"
                  >
                    <option value="Flat">Flat</option>
                    <option value="House">House</option>
                    <option value="Room">Room</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E687A] mb-1">
                    BHK
                  </label>
                  <select
                    value={newBedrooms}
                    onChange={(e) => setNewBedrooms(Number(e.target.value))}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-white border border-[#E6E9EF] text-xs font-medium"
                  >
                    {[1, 2, 3, 4].map((b) => (
                      <option key={b} value={b}>
                        {b} BHK
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E687A] mb-1">
                    Furnishing
                  </label>
                  <select
                    value={newFurnishing}
                    onChange={(e) => setNewFurnishing(e.target.value as FurnishingType)}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-white border border-[#E6E9EF] text-xs font-medium"
                  >
                    <option value="Furnished">Furnished</option>
                    <option value="Semi-furnished">Semi-furnished</option>
                    <option value="Unfurnished">Unfurnished</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E687A] mb-1">
                    Area (sq.ft)
                  </label>
                  <input
                    type="number"
                    value={newArea}
                    onChange={(e) => setNewArea(Number(e.target.value))}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-white border border-[#E6E9EF] text-xs font-medium tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5E687A] mb-1">
                  Property Description
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe natural light, floor, parking, and proximity..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E9EF] text-sm"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-[#5E687A] mb-1.5">
                  Photographs
                </span>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {newImages.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Upload preview ${i + 1}`}
                      className="w-16 h-12 object-cover rounded-lg border border-[#E6E9EF]"
                    />
                  ))}
                  <label className="px-3 py-2 rounded-xl bg-white border border-[#E6E9EF] text-xs font-semibold text-[#0B1324] hover:bg-[#ECEFF4] cursor-pointer inline-flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Proposal Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="proposal-price"
                className="block text-xs font-semibold text-[#5E687A] mb-1.5"
              >
                Quoted Price (INR {requirement.intent === 'rent' ? '/ month' : 'total'})
              </label>
              <input
                id="proposal-price"
                type="number"
                required
                value={proposedPrice}
                onChange={(e) => setProposedPrice(Number(e.target.value))}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm font-semibold text-[#0B1324] tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="proposal-brokerage"
                className="block text-xs font-semibold text-[#5E687A] mb-1.5"
              >
                Brokerage Charges
              </label>
              <input
                id="proposal-brokerage"
                type="text"
                required
                value={brokerageCharge}
                onChange={(e) => setBrokerageCharge(e.target.value)}
                placeholder="E.g. 1 Month Rent / 1% Sale Value"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm font-medium text-[#0B1324]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="proposal-why-matches"
              className="block text-xs font-semibold text-[#5E687A] mb-1.5"
            >
              Why This Property Matches
            </label>
            <textarea
              id="proposal-why-matches"
              rows={2}
              value={whyMatches}
              onChange={(e) => setWhyMatches(e.target.value)}
              placeholder="Explain exact location proximity, budget fit, move-in readiness..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
            />
          </div>

          <div>
            <label
              htmlFor="proposal-message"
              className="block text-xs font-semibold text-[#5E687A] mb-1.5"
            >
              Personal Pitch to Customer
            </label>
            <textarea
              id="proposal-message"
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
            />
          </div>

          <label className="flex items-start gap-2.5 text-xs text-[#0B1324] bg-[#F7F8FA] rounded-xl p-3 border border-[#E6E9EF] cursor-pointer">
            <input
              type="checkbox"
              checked={availabilityConfirmed}
              onChange={(e) => setAvailabilityConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-[#1A56FF]"
            />
            <span>
              I confirm this property is currently available for visits and the quoted price &
              brokerage terms are accurate.
            </span>
          </label>

          {error && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="pt-3 border-t border-[#E6E9EF] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] text-sm font-semibold text-[#0B1324]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedAlreadyPitched}
              className="min-h-[44px] px-6 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] disabled:opacity-60 text-white text-sm font-semibold"
            >
              {submitting ? 'Sending...' : 'Submit Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
