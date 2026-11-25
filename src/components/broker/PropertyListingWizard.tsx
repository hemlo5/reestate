'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  MapPin,
  Plus,
  Star,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import type {
  DetailedPropertyCategory,
  FurnishingType,
  Property,
  PropertyAvailability,
  TransactionType,
  User,
} from '@/types';
import type { CreatePropertyInput } from '@/lib/validation/schemas';
import { PROPERTY_IMAGES } from '@/lib/constants/media';
import {
  DETAILED_PROPERTY_CATEGORIES,
  LISTING_AMENITIES,
  LOCALITIES,
  TRANSACTION_TYPES,
  formatINR,
  mapDetailedCategoryToBase,
  mapTransactionToIntent,
} from '@/lib/matching';
import { uploadMediaFile } from '@/lib/storage/client-compress';
import { PropertyImage } from '@/components/PropertyImage';

interface PropertyListingWizardProps {
  broker: User;
  editingProperty?: Property | null;
  onCancel: () => void;
  onSaveProperty: (
    payload: CreatePropertyInput,
    existingId?: string
  ) => Promise<Property>;
  onGoToInventory: () => void;
  onGoToLeads: () => void;
}

const STEP_LABELS = [
  'Category',
  'Transaction',
  'Location',
  'Specs',
  'Pricing',
  'Amenities',
  'Photos',
  'Description',
  'Review',
] as const;

const PRESET_GALLERY = [
  { label: 'Living Room', src: PROPERTY_IMAGES.living },
  { label: 'Kitchen', src: PROPERTY_IMAGES.kitchen },
  { label: 'Bedroom', src: PROPERTY_IMAGES.bedroom },
  { label: 'Penthouse Terrace', src: PROPERTY_IMAGES.penthouse },
  { label: 'Villa Exterior', src: PROPERTY_IMAGES.villa },
  { label: 'Studio Room', src: PROPERTY_IMAGES.studio },
];

const LOCALITY_COORDS: Record<string, { x: number; y: number }> = {
  Koramangala: { x: 46, y: 56 },
  Indiranagar: { x: 64, y: 38 },
  'HSR Layout': { x: 55, y: 66 },
  Whitefield: { x: 84, y: 42 },
  Jayanagar: { x: 28, y: 65 },
  Sadashivanagar: { x: 32, y: 24 },
  'Bandra West': { x: 18, y: 46 },
  Marathahalli: { x: 76, y: 48 },
  'Electronic City': { x: 58, y: 84 },
  Hebbal: { x: 45, y: 18 },
  Bellandur: { x: 68, y: 62 },
};

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function PropertyListingWizard({
  broker,
  editingProperty,
  onCancel,
  onSaveProperty,
  onGoToInventory,
  onGoToLeads,
}: PropertyListingWizardProps) {
  const isEditing = Boolean(editingProperty);
  const [step, setStep] = useState(0);
  const [publishedProp, setPublishedProp] = useState<Property | null>(null);

  // Step 1 & 2
  const [listingCategory, setListingCategory] = useState<DetailedPropertyCategory>(
    editingProperty?.listingCategory || 'Apartment / Flat'
  );
  const [transactionType, setTransactionType] = useState<TransactionType>(
    editingProperty?.transactionType ||
      (editingProperty?.intent === 'buy' ? 'For Sale' : 'For Rent')
  );

  // Step 3 — Location
  const [address, setAddress] = useState(editingProperty?.address || '');
  const [locality, setLocality] = useState(editingProperty?.locality || 'Koramangala');
  const [city, setCity] = useState(editingProperty?.city || broker.city || 'Bengaluru');
  const [pincode, setPincode] = useState(editingProperty?.pincode || '560034');
  const [landmark, setLandmark] = useState(editingProperty?.landmark || '');
  const [mapX, setMapX] = useState(editingProperty?.mapX ?? 46);
  const [mapY, setMapY] = useState(editingProperty?.mapY ?? 56);

  // Step 4 — Specifications
  const isCommercial =
    listingCategory === 'Commercial Space' ||
    listingCategory === 'Office Space' ||
    listingCategory === 'Shop';
  const [bedrooms, setBedrooms] = useState<number>(editingProperty?.bedrooms ?? 2);
  const [bathrooms, setBathrooms] = useState<number>(editingProperty?.bathrooms ?? 2);
  const [carpetAreaSqFt, setCarpetAreaSqFt] = useState<number>(
    editingProperty?.carpetAreaSqFt ?? editingProperty?.areaSqFt ?? 1080
  );
  const [builtUpAreaSqFt, setBuiltUpAreaSqFt] = useState<number>(
    editingProperty?.builtUpAreaSqFt ?? editingProperty?.areaSqFt ?? 1240
  );
  const [floorNumber, setFloorNumber] = useState<number>(
    editingProperty?.floorNumber ?? 2
  );
  const [totalFloors, setTotalFloors] = useState<number>(
    editingProperty?.totalFloors ?? 4
  );
  const [furnishing, setFurnishing] = useState<FurnishingType>(
    editingProperty?.furnishing || 'Semi-furnished'
  );
  const [parking, setParking] = useState(editingProperty?.parking || '1 Covered Car');
  const [balconies, setBalconies] = useState<number>(editingProperty?.balconies ?? 1);
  const [propertyAge, setPropertyAge] = useState(
    editingProperty?.propertyAge || '1–3 years'
  );
  const [availableFrom, setAvailableFrom] = useState(
    editingProperty?.availableFrom || 'Immediate'
  );

  // Step 5 — Pricing
  const intent = mapTransactionToIntent(transactionType);
  const [price, setPrice] = useState<number>(
    editingProperty?.price ?? (intent === 'buy' ? 14500000 : 28000)
  );
  const [securityDeposit, setSecurityDeposit] = useState<number>(
    editingProperty?.securityDeposit ?? 125000
  );
  const [maintenanceCharges, setMaintenanceCharges] = useState<number>(
    editingProperty?.maintenanceCharges ?? 2500
  );
  const [pricePerSqFt, setPricePerSqFt] = useState<number>(
    editingProperty?.pricePerSqFt ?? 0
  );
  const [brokerageType, setBrokerageType] = useState<'fixed' | 'percentage'>(
    editingProperty?.brokerageType || (intent === 'buy' ? 'percentage' : 'fixed')
  );
  const [brokerageAmount, setBrokerageAmount] = useState<number>(
    editingProperty?.brokerageAmount ?? (intent === 'buy' ? 1 : 28000)
  );

  // Step 6 — Amenities
  const [amenities, setAmenities] = useState<string[]>(
    editingProperty?.amenities?.length
      ? editingProperty.amenities
      : ['Parking', 'Power backup', 'Security']
  );
  const [customAmenity, setCustomAmenity] = useState('');

  // Step 7 — Photographs & Media
  const [images, setImages] = useState<string[]>(
    editingProperty?.images?.length
      ? editingProperty.images
      : [PROPERTY_IMAGES.living, PROPERTY_IMAGES.kitchen]
  );
  const [videoTourUrl, setVideoTourUrl] = useState(editingProperty?.videoTourUrl || '');
  const [dragActive, setDragActive] = useState(false);

  // Step 8 — Description
  const [title, setTitle] = useState(editingProperty?.title || '');
  const [description, setDescription] = useState(editingProperty?.description || '');
  const [additionalInfo, setAdditionalInfo] = useState(
    editingProperty?.additionalInfo || ''
  );
  const [sellingPoints, setSellingPoints] = useState<string[]>(
    editingProperty?.sellingPoints || []
  );
  const [newSellingPoint, setNewSellingPoint] = useState('');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleTransactionChange = (tx: TransactionType) => {
    setTransactionType(tx);
    if (!isEditing) {
      const nextIntent = mapTransactionToIntent(tx);
      if (nextIntent === 'buy') {
        setPrice(14500000);
        setBrokerageType('percentage');
        setBrokerageAmount(1);
      } else {
        setPrice(tx === 'PG / Shared Accommodation' ? 16000 : 28000);
        setBrokerageType('fixed');
        setBrokerageAmount(tx === 'PG / Shared Accommodation' ? 8000 : 28000);
      }
    }
  };

  const handleLocalitySelect = (loc: string) => {
    setLocality(loc);
    const coords = LOCALITY_COORDS[loc];
    if (coords && !isEditing) {
      setMapX(coords.x);
      setMapY(coords.y);
    }
  };

  const processImageFiles = async (files: FileList | null) => {
    if (!files) return;
    setError('');
    const list = Array.from(files).slice(0, 6);
    for (const file of list) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
        setError('Only JPG, PNG, or WebP property photos are accepted.');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Each photo must be under 5MB.');
        continue;
      }
      try {
        const uploaded = await uploadMediaFile({ file, purpose: 'property' });
        setImages((prev) => [...prev, uploaded.url].slice(0, 10));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to upload photo.');
      }
    }
  };

  const setAsCover = (idx: number) => {
    if (idx === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [chosen] = copy.splice(idx, 1);
      return [chosen, ...copy];
    });
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const formattedBrokerageFee =
    brokerageType === 'percentage'
      ? `${brokerageAmount}% of ${intent === 'buy' ? 'Sale Value' : 'Annual Rent'}`
      : brokerageAmount === 0
      ? 'Zero Brokerage'
      : `₹${brokerageAmount.toLocaleString('en-IN')} Fixed`;

  const validateStep = (s: number): boolean => {
    setError('');
    if (s === 2) {
      if (!address.trim() || !locality.trim() || !city.trim()) {
        setError('Address, locality, and city are required.');
        return false;
      }
    }
    if (s === 3) {
      if (!builtUpAreaSqFt || builtUpAreaSqFt <= 0) {
        setError('Enter valid property area in sq.ft.');
        return false;
      }
    }
    if (s === 4) {
      if (!price || price <= 0) {
        setError('Enter a valid asking price or monthly rent.');
        return false;
      }
    }
    if (s === 6) {
      if (images.length === 0) {
        setError('Please upload or select at least 1 property photograph.');
        return false;
      }
    }
    if (s === 7) {
      if (!title.trim()) {
        setError('Provide a clear property title.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(STEP_LABELS.length - 1, prev + 1));
  };

  const handleSubmit = async (availability: PropertyAvailability) => {
    setError('');
    if (!title.trim() || !address.trim() || !price) {
      setError('Title, address, and price are required before saving.');
      return;
    }
    setSaving(true);
    try {
      const effectiveArea = builtUpAreaSqFt || carpetAreaSqFt || 1100;
      const computedPerSqFt =
        intent === 'buy'
          ? pricePerSqFt > 0
            ? pricePerSqFt
            : Math.round(price / Math.max(effectiveArea, 1))
          : undefined;

      const depositSummary =
        intent === 'rent'
          ? `₹${securityDeposit.toLocaleString('en-IN')} deposit${
              maintenanceCharges > 0
                ? ` · ₹${maintenanceCharges.toLocaleString('en-IN')}/mo maint.`
                : ''
            }`
          : maintenanceCharges > 0
          ? `₹${maintenanceCharges.toLocaleString('en-IN')}/mo maint.`
          : undefined;

      const payload: CreatePropertyInput = {
        title: title.trim(),
        intent,
        transactionType,
        listingCategory,
        locality: locality.trim(),
        city: city.trim(),
        pincode: pincode.trim() || undefined,
        landmark: landmark.trim() || undefined,
        address: address.trim(),
        price,
        securityDeposit: intent === 'rent' ? securityDeposit : undefined,
        maintenanceCharges: maintenanceCharges || undefined,
        pricePerSqFt: computedPerSqFt,
        brokerageAmount,
        brokerageType,
        depositOrMaintenance: depositSummary,
        brokerageFee: formattedBrokerageFee,
        propertyType: mapDetailedCategoryToBase(listingCategory),
        bedrooms: isCommercial ? 1 : bedrooms,
        bathrooms,
        areaSqFt: effectiveArea,
        carpetAreaSqFt,
        builtUpAreaSqFt: effectiveArea,
        floorInfo:
          totalFloors > 0
            ? `${floorNumber === 0 ? 'Ground' : `${floorNumber}`} of ${totalFloors} floors`
            : 'Ground Floor',
        floorNumber,
        totalFloors,
        furnishing,
        parking,
        balconies: isCommercial ? 0 : balconies,
        propertyAge,
        availableFrom: availableFrom.trim() || 'Immediate',
        amenities,
        description:
          description.trim() ||
          `${listingCategory} in ${locality} (${effectiveArea} sq.ft).`,
        additionalInfo: additionalInfo.trim() || undefined,
        sellingPoints: sellingPoints.length ? sellingPoints : undefined,
        videoTourUrl: videoTourUrl.trim() || undefined,
        images: images.length ? images : [PROPERTY_IMAGES.living],
        availability,
        mapX,
        mapY,
      };

      const saved = await onSaveProperty(payload, editingProperty?.id);
      setPublishedProp(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save property listing.');
    } finally {
      setSaving(false);
    }
  };

  if (publishedProp) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 pb-24">
        <div className="bg-white rounded-3xl border border-[#E6E9EF] shadow-[0_12px_36px_-8px_rgba(11,19,36,0.08)] p-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-[#EEF3FF] text-[#1A56FF] flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-[#0B1324]">
            {publishedProp.availability === 'draft'
              ? 'Property Saved as Draft'
              : isEditing
              ? 'Property Listing Updated'
              : 'Property Published to Hemlo'}
          </h1>
          <p className="mt-2 text-sm text-[#5E687A] max-w-md mx-auto">
            <span className="font-semibold text-[#0B1324]">{publishedProp.title}</span> in{' '}
            {publishedProp.locality} is now in your inventory
            {publishedProp.availability === 'available'
              ? ' and actively scored against incoming customer requirements.'
              : '.'}
          </p>

          <div className="mt-6 bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] p-4 flex items-center gap-4 text-left max-w-md mx-auto">
            <PropertyImage
              src={publishedProp.images[0]}
              alt={publishedProp.title}
              className="w-20 h-16 rounded-xl shrink-0"
            />
            <div className="min-w-0">
              <p className="font-display text-base font-bold text-[#0B1324] tabular-nums">
                {formatINR(publishedProp.price, publishedProp.intent)}
                {publishedProp.intent === 'rent' ? '/mo' : ''}
              </p>
              <p className="text-xs font-semibold text-[#0B1324] truncate">
                {publishedProp.title}
              </p>
              <p className="text-[11px] text-[#5E687A] truncate">
                {publishedProp.listingCategory} · {publishedProp.locality}
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={onGoToInventory}
              className="min-h-[44px] px-6 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold"
            >
              View My Properties
            </button>
            <button
              type="button"
              onClick={onGoToLeads}
              className="min-h-[44px] px-5 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] border border-[#E6E9EF] text-sm font-semibold text-[#0B1324]"
            >
              Discover Matching Leads
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-28 md:pb-14">
      <div className="flex items-center justify-between gap-4 mb-5">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#5E687A] hover:text-[#0B1324]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Inventory</span>
        </button>
        <span className="text-xs font-semibold text-[#5E687A] tabular-nums">
          Step {step + 1} of {STEP_LABELS.length}
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-[#E6E9EF] shadow-[0_12px_36px_-8px_rgba(11,19,36,0.08)] p-5 sm:p-8">
        <div>
          <p className="text-xs font-semibold text-[#1A56FF]">
            {isEditing ? 'Edit Property Listing' : '+ List a Property'}
          </p>
          <h1 className="mt-0.5 font-display text-xl sm:text-2xl font-bold text-[#0B1324]">
            {STEP_LABELS[step]}
          </h1>
        </div>

        {/* 9-Step Progress Strip */}
        <div className="mt-4 grid grid-cols-9 gap-1.5">
          {STEP_LABELS.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (idx <= step || isEditing) setStep(idx);
              }}
              aria-label={`Step ${idx + 1}: ${label}`}
              className="text-left"
            >
              <div
                className={`h-1.5 rounded-full ${
                  idx <= step ? 'bg-[#1A56FF]' : 'bg-[#E6E9EF]'
                }`}
              />
              <span
                className={`hidden sm:block mt-1 text-[10px] font-semibold truncate ${
                  idx <= step ? 'text-[#1A56FF]' : 'text-[#5E687A]'
                }`}
              >
                {label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-7 space-y-6">
          {/* STEP 1 — PROPERTY CATEGORY */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0B1324]">
                What type of property are you listing?
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DETAILED_PROPERTY_CATEGORIES.map((cat) => {
                  const active = listingCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setListingCategory(cat)}
                      className={`min-h-[60px] p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 ${
                        active
                          ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                          : 'bg-[#F7F8FA] border-[#E6E9EF] text-[#0B1324] hover:bg-white'
                      }`}
                    >
                      <span className="text-xs sm:text-sm font-semibold">{cat}</span>
                      {active && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2 — TRANSACTION TYPE */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0B1324]">
                Select Transaction Type
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TRANSACTION_TYPES.map((tx) => {
                  const active = transactionType === tx;
                  return (
                    <button
                      key={tx}
                      type="button"
                      onClick={() => handleTransactionChange(tx)}
                      className={`min-h-[64px] p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        active
                          ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                          : 'bg-[#F7F8FA] border-[#E6E9EF] text-[#0B1324] hover:bg-white'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold">{tx}</p>
                        <p className="text-xs text-[#5E687A] mt-0.5">
                          {tx === 'For Sale'
                            ? 'Matched to home buyers'
                            : 'Matched to rental & lease seekers'}
                        </p>
                      </div>
                      {active && <CheckCircle2 className="h-5 w-5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3 — LOCATION */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-display text-lg font-bold text-[#0B1324]">
                Property Address & Map Pin
              </h2>

              <div>
                <label
                  htmlFor="prop-address"
                  className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                >
                  Property Street Address *
                </label>
                <input
                  id="prop-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="E.g. 14th Main, HAL 2nd Stage, Indiranagar"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="prop-locality"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Locality *
                  </label>
                  <select
                    id="prop-locality"
                    value={LOCALITIES.includes(locality as (typeof LOCALITIES)[number]) ? locality : '__custom'}
                    onChange={(e) => {
                      if (e.target.value !== '__custom') handleLocalitySelect(e.target.value);
                    }}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  >
                    {LOCALITIES.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="prop-city"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    City *
                  </label>
                  <input
                    id="prop-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="prop-pincode"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    PIN Code
                  </label>
                  <input
                    id="prop-pincode"
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="560034"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="prop-landmark"
                  className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                >
                  Nearby Landmark
                </label>
                <input
                  id="prop-landmark"
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="E.g. 400m from Indiranagar Metro Station"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                />
              </div>

              {/* Interactive Map Pin Canvas */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[#5E687A]">
                    Pin Property on Neighbourhood Map (Click to adjust)
                  </span>
                  <span className="text-[11px] text-[#1A56FF] font-semibold tabular-nums">
                    Pin: ({mapX}%, {mapY}%)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                    setMapX(Math.max(8, Math.min(92, x)));
                    setMapY(Math.max(10, Math.min(90, y)));
                  }}
                  aria-label="Pin property location on neighbourhood map"
                  className="relative w-full h-48 rounded-2xl bg-[#EEF2F7] border border-[#DCE2EC] overflow-hidden cursor-crosshair block text-left"
                >
                  {/* Subtle neighbourhood grid */}
                  <div
                    className="absolute inset-0 opacity-45"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, #CBD5E1 1px, transparent 1px), linear-gradient(to bottom, #CBD5E1 1px, transparent 1px)',
                      backgroundSize: '32px 32px',
                    }}
                  />
                  {Object.entries(LOCALITY_COORDS).slice(0, 6).map(([name, c]) => (
                    <span
                      key={name}
                      style={{ left: `${c.x}%`, top: `${c.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#5E687A] pointer-events-none"
                    >
                      {name}
                    </span>
                  ))}
                  <span
                    style={{ left: `${mapX}%`, top: `${mapY}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full bg-[#1A56FF] text-white text-xs font-bold shadow-md inline-flex items-center gap-1"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{locality}</span>
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 — PROPERTY SPECIFICATIONS */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1324]">
                  Property Specifications
                </h2>
                <p className="text-xs text-[#5E687A]">
                  Showing relevant configuration fields for {listingCategory}.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {!isCommercial && (
                  <div>
                    <label
                      htmlFor="spec-bhk"
                      className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                    >
                      {listingCategory === 'PG / Hostel' ? 'Sharing / Beds (BHK eq.)' : 'Bedrooms (BHK)'}
                    </label>
                    <select
                      id="spec-bhk"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(Number(e.target.value))}
                      className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                    >
                      {[1, 2, 3, 4, 5].map((b) => (
                        <option key={b} value={b}>
                          {b} BHK
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="spec-bath"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    {isCommercial ? 'Washrooms' : 'Bathrooms'}
                  </label>
                  <select
                    id="spec-bath"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  >
                    {[1, 2, 3, 4, 5].map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="spec-furnishing"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Furnishing Status
                  </label>
                  <select
                    id="spec-furnishing"
                    value={furnishing}
                    onChange={(e) => setFurnishing(e.target.value as FurnishingType)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  >
                    <option value="Furnished">Furnished</option>
                    <option value="Semi-furnished">Semi-furnished</option>
                    <option value="Unfurnished">Unfurnished</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="spec-carpet"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Carpet Area (sq.ft)
                  </label>
                  <input
                    id="spec-carpet"
                    type="number"
                    min={100}
                    value={carpetAreaSqFt}
                    onChange={(e) => setCarpetAreaSqFt(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] tabular-nums"
                  />
                </div>

                <div>
                  <label
                    htmlFor="spec-builtup"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Built-up Area (sq.ft) *
                  </label>
                  <input
                    id="spec-builtup"
                    type="number"
                    min={100}
                    value={builtUpAreaSqFt}
                    onChange={(e) => setBuiltUpAreaSqFt(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] tabular-nums"
                  />
                </div>

                <div>
                  <label
                    htmlFor="spec-floor"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Floor Number
                  </label>
                  <input
                    id="spec-floor"
                    type="number"
                    min={0}
                    value={floorNumber}
                    onChange={(e) => setFloorNumber(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] tabular-nums"
                  />
                </div>

                <div>
                  <label
                    htmlFor="spec-total-floors"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Total Floors
                  </label>
                  <input
                    id="spec-total-floors"
                    type="number"
                    min={1}
                    value={totalFloors}
                    onChange={(e) => setTotalFloors(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] tabular-nums"
                  />
                </div>

                <div>
                  <label
                    htmlFor="spec-parking"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Parking Availability
                  </label>
                  <select
                    id="spec-parking"
                    value={parking}
                    onChange={(e) => setParking(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  >
                    <option value="1 Covered Car">1 Covered Car</option>
                    <option value="2 Covered Cars">2 Covered Cars</option>
                    <option value="Open / Street Parking">Open / Street Parking</option>
                    <option value="Two-Wheeler Only">Two-Wheeler Only</option>
                    <option value="No Parking">No Parking</option>
                  </select>
                </div>

                {!isCommercial && (
                  <div>
                    <label
                      htmlFor="spec-balconies"
                      className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                    >
                      Balconies
                    </label>
                    <select
                      id="spec-balconies"
                      value={balconies}
                      onChange={(e) => setBalconies(Number(e.target.value))}
                      className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                    >
                      {[0, 1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>
                          {n === 0 ? 'None' : `${n}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="spec-age"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Property Age
                  </label>
                  <select
                    id="spec-age"
                    value={propertyAge}
                    onChange={(e) => setPropertyAge(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  >
                    <option value="New (< 1 year)">New (&lt; 1 year)</option>
                    <option value="1–3 years">1–3 years</option>
                    <option value="3–5 years">3–5 years</option>
                    <option value="5–10 years">5–10 years</option>
                    <option value="10+ years">10+ years</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="spec-avail"
                    className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                  >
                    Available From
                  </label>
                  <input
                    id="spec-avail"
                    type="text"
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                    placeholder="Immediate / 1 Dec 2026"
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5 — PRICING */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1324]">
                  {intent === 'rent' ? 'Rental Pricing & Deposit' : 'Sale Pricing'}
                </h2>
                <p className="text-xs text-[#5E687A]">
                  Property pricing and broker charges are presented separately for full customer transparency.
                </p>
              </div>

              {intent === 'rent' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="price-rent"
                      className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                    >
                      Monthly Rent (INR) *
                    </label>
                    <input
                      id="price-rent"
                      type="number"
                      min={1000}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm font-bold text-[#0B1324] tabular-nums"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="price-deposit"
                      className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                    >
                      Security Deposit (INR)
                    </label>
                    <input
                      id="price-deposit"
                      type="number"
                      min={0}
                      value={securityDeposit}
                      onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                      className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] tabular-nums"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="price-maint"
                      className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                    >
                      Maintenance Charges / mo
                    </label>
                    <input
                      id="price-maint"
                      type="number"
                      min={0}
                      value={maintenanceCharges}
                      onChange={(e) => setMaintenanceCharges(Number(e.target.value))}
                      className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] tabular-nums"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="price-sale"
                      className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                    >
                      Total Asking Price (INR) *
                    </label>
                    <input
                      id="price-sale"
                      type="number"
                      min={100000}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm font-bold text-[#0B1324] tabular-nums"
                    />
                    <p className="mt-1 text-[11px] text-[#1A56FF] font-semibold tabular-nums">
                      Display: {formatINR(price, 'buy')}
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="price-sqft"
                      className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                    >
                      Price per sq.ft (Optional)
                    </label>
                    <input
                      id="price-sqft"
                      type="number"
                      min={0}
                      value={
                        pricePerSqFt ||
                        Math.round(price / Math.max(builtUpAreaSqFt || 1, 1))
                      }
                      onChange={(e) => setPricePerSqFt(Number(e.target.value))}
                      className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324] tabular-nums"
                    />
                  </div>
                </div>
              )}

              {/* Brokerage Section — Distinct from Property Price */}
              <div className="pt-5 border-t border-[#E6E9EF] space-y-4">
                <div>
                  <h3 className="font-display text-sm font-bold text-[#0B1324]">
                    Brokerage Charges (Separate from Property Price)
                  </h3>
                  <p className="text-xs text-[#5E687A]">
                    Displayed clearly on proposals so customers know your transparent fee upfront.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-semibold text-[#5E687A] mb-1.5">
                      Brokerage Type
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {(['fixed', 'percentage'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setBrokerageType(t);
                            if (t === 'percentage' && brokerageAmount > 10) {
                              setBrokerageAmount(1);
                            } else if (t === 'fixed' && brokerageAmount <= 10) {
                              setBrokerageAmount(intent === 'rent' ? price : 100000);
                            }
                          }}
                          className={`min-h-[42px] rounded-xl border text-xs font-semibold capitalize ${
                            brokerageType === t
                              ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                              : 'bg-white border-[#E6E9EF] text-[#5E687A]'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="brokerage-amt"
                      className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                    >
                      {brokerageType === 'percentage'
                        ? 'Brokerage Percentage (%)'
                        : 'Brokerage Amount (INR)'}
                    </label>
                    <input
                      id="brokerage-amt"
                      type="number"
                      min={0}
                      step={brokerageType === 'percentage' ? '0.25' : '500'}
                      value={brokerageAmount}
                      onChange={(e) => setBrokerageAmount(Number(e.target.value))}
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm font-semibold text-[#0B1324] tabular-nums"
                    />
                    <p className="mt-1 text-[11px] text-[#5E687A]">
                      Preview: <span className="font-semibold text-[#0B1324]">{formattedBrokerageFee}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6 — AMENITIES */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1324]">
                  Building & Property Amenities
                </h2>
                <p className="text-xs text-[#5E687A]">
                  Amenities boost match quality against customer requirement checklists.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {Array.from(new Set([...LISTING_AMENITIES, ...amenities])).map((am) => {
                  const selected = amenities.includes(am);
                  return (
                    <button
                      key={am}
                      type="button"
                      onClick={() =>
                        setAmenities((prev) =>
                          prev.includes(am) ? prev.filter((x) => x !== am) : [...prev, am]
                        )
                      }
                      className={`min-h-[40px] px-3.5 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                        selected
                          ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                          : 'bg-white border-[#E6E9EF] text-[#5E687A] hover:text-[#0B1324]'
                      }`}
                    >
                      <span>{am}</span>
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 max-w-md pt-2">
                <input
                  type="text"
                  value={customAmenity}
                  onChange={(e) => setCustomAmenity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const clean = customAmenity.trim();
                      if (clean && !amenities.includes(clean)) {
                        setAmenities((prev) => [...prev, clean]);
                      }
                      setCustomAmenity('');
                    }
                  }}
                  placeholder="Add other amenity (e.g. EV Charging)"
                  aria-label="Custom amenity"
                  className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const clean = customAmenity.trim();
                    if (clean && !amenities.includes(clean)) {
                      setAmenities((prev) => [...prev, clean]);
                    }
                    setCustomAmenity('');
                  }}
                  className="min-h-[42px] px-4 rounded-xl bg-[#0B1324] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 7 — PHOTOGRAPHS AND MEDIA */}
          {step === 6 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1324]">
                  Photographs & Media
                </h2>
                <p className="text-xs text-[#5E687A]">
                  Drag and drop photographs, upload multiple files, and choose the Cover photograph displayed first.
                </p>
              </div>

              {/* Drag and Drop Upload Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  processImageFiles(e.dataTransfer.files);
                }}
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                  dragActive
                    ? 'border-[#1A56FF] bg-[#EEF3FF]'
                    : 'border-[#DCE2EC] bg-[#F7F8FA]'
                }`}
              >
                <Upload className="h-6 w-6 text-[#1A56FF] mx-auto" />
                <p className="mt-2 text-sm font-semibold text-[#0B1324]">
                  Drag & drop property photographs here
                </p>
                <p className="mt-0.5 text-xs text-[#5E687A]">
                  Supports multiple JPG, PNG, or WebP files (up to 4MB each)
                </p>
                <label className="mt-3 min-h-[40px] px-4 py-2 rounded-xl bg-white border border-[#E6E9EF] text-xs font-semibold text-[#0B1324] hover:bg-[#ECEFF4] inline-flex items-center gap-2 cursor-pointer shadow-xs">
                  <span>Browse Photos</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(e) => processImageFiles(e.target.files)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Uploaded / Selected Gallery Previews */}
              {images.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#5E687A] mb-2">
                    Selected Gallery ({images.length}) · First photo is the Cover image
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((src, idx) => (
                      <div
                        key={`${idx}-${src.slice(0, 24)}`}
                        className={`relative rounded-2xl overflow-hidden border bg-[#F2F4F8] ${
                          idx === 0 ? 'border-[#1A56FF] ring-2 ring-[#1A56FF]/20' : 'border-[#E6E9EF]'
                        }`}
                      >
                        <div className="aspect-[4/3]">
                          <PropertyImage
                            src={src}
                            alt={`Listing photo ${idx + 1}`}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="p-2 bg-white flex items-center justify-between gap-2 border-t border-[#E6E9EF]">
                          {idx === 0 ? (
                            <span className="text-[11px] font-bold text-[#1A56FF] inline-flex items-center gap-1">
                              <Star className="h-3 w-3 fill-current" />
                              <span>Cover</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAsCover(idx)}
                              className="text-[11px] font-semibold text-[#5E687A] hover:text-[#1A56FF]"
                            >
                              Set Cover
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            aria-label={`Remove photo ${idx + 1}`}
                            className="text-[#5E687A] hover:text-red-600 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick-add Sample Photography */}
              <div className="pt-2 border-t border-[#E6E9EF]">
                <span className="block text-xs font-semibold text-[#5E687A] mb-2">
                  Quick-add Architectural Sample Photos
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_GALLERY.map((preset) => {
                    const exists = images.includes(preset.src);
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          setImages((prev) =>
                            exists ? prev.filter((x) => x !== preset.src) : [...prev, preset.src]
                          )
                        }
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 ${
                          exists
                            ? 'bg-[#EEF3FF] border-[#1A56FF] text-[#1A56FF]'
                            : 'bg-white border-[#E6E9EF] text-[#5E687A]'
                        }`}
                      >
                        <span>{preset.label}</span>
                        {exists && <Check className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="prop-video-url"
                  className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                >
                  Optional Video Tour Link
                </label>
                <div className="relative">
                  <Video className="h-4 w-4 text-[#9AA5B5] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="prop-video-url"
                    type="url"
                    value={videoTourUrl}
                    onChange={(e) => setVideoTourUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full min-h-[44px] pl-10 pr-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 8 — PROPERTY DESCRIPTION */}
          {step === 7 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1324]">
                  Title, Narrative & Selling Points
                </h2>
              </div>

              <div>
                <label
                  htmlFor="prop-title"
                  className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                >
                  Property Title *
                </label>
                <input
                  id="prop-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`E.g. Sunlit ${bedrooms} BHK ${listingCategory} near ${locality} Park`}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                />
              </div>

              <div>
                <label
                  htmlFor="prop-description"
                  className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                >
                  Detailed Description
                </label>
                <textarea
                  id="prop-description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe natural light, neighbourhood quietness, interior finishes, metro proximity, and lease/title terms..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                />
              </div>

              <div>
                <label
                  htmlFor="prop-additional"
                  className="block text-xs font-semibold text-[#5E687A] mb-1.5"
                >
                  Additional Information (Society rules, Khata / OC details, lease preference)
                </label>
                <textarea
                  id="prop-additional"
                  rows={2}
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="E.g. Families or working professionals preferred; A-Khata clear title."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-[#5E687A] mb-1.5">
                  Special Selling Points
                </span>
                <div className="flex gap-2 mb-2.5">
                  <input
                    type="text"
                    value={newSellingPoint}
                    onChange={(e) => setNewSellingPoint(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newSellingPoint.trim()) {
                          setSellingPoints((prev) => [...prev, newSellingPoint.trim()]);
                          setNewSellingPoint('');
                        }
                      }
                    }}
                    placeholder="E.g. East-facing main door · 5 min walk to Metro"
                    aria-label="Add selling point"
                    className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E6E9EF] text-sm text-[#0B1324]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSellingPoint.trim()) {
                        setSellingPoints((prev) => [...prev, newSellingPoint.trim()]);
                        setNewSellingPoint('');
                      }
                    }}
                    className="min-h-[42px] px-4 rounded-xl bg-[#0B1324] text-white text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
                {sellingPoints.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {sellingPoints.map((pt, idx) => (
                      <span
                        key={`${pt}-${idx}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EEF3FF] text-[#1A56FF] text-xs font-semibold"
                      >
                        <span>{pt}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSellingPoints((prev) => prev.filter((_, i) => i !== idx))
                          }
                          aria-label={`Remove selling point ${pt}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 9 — REVIEW AND PUBLISH */}
          {step === 8 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1324]">
                  Review Listing Before Publishing
                </h2>
                <p className="text-xs text-[#5E687A]">
                  Verify all property details, photography, and brokerage terms. You can edit any section or save as a draft.
                </p>
              </div>

              <div className="bg-[#F7F8FA] rounded-2xl border border-[#E6E9EF] overflow-hidden grid grid-cols-1 md:grid-cols-12">
                <div className="md:col-span-5 aspect-[4/3] md:aspect-auto bg-[#ECEFF4]">
                  <PropertyImage
                    src={images[0]}
                    alt={title || 'Property preview'}
                    className="w-full h-full"
                  />
                </div>
                <div className="md:col-span-7 p-5 space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-display text-xl font-bold text-[#0B1324] tabular-nums">
                      {formatINR(price, intent)}
                      {intent === 'rent' ? '/mo' : ''}
                    </p>
                    <span className="text-xs font-semibold text-[#1A56FF]">
                      {transactionType}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-[#0B1324]">
                    {title}
                  </h3>
                  <p className="text-xs text-[#5E687A]">
                    {address}, {locality}, {city} {pincode}
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E6E9EF] text-xs">
                    <p className="text-[#5E687A]">
                      Category: <strong className="text-[#0B1324]">{listingCategory}</strong>
                    </p>
                    <p className="text-[#5E687A] tabular-nums">
                      Size: <strong className="text-[#0B1324]">{builtUpAreaSqFt} sq.ft</strong>
                    </p>
                    {!isCommercial && (
                      <p className="text-[#5E687A] tabular-nums">
                        Config: <strong className="text-[#0B1324]">{bedrooms} BHK · {bathrooms} Bath</strong>
                      </p>
                    )}
                    <p className="text-[#5E687A]">
                      Furnishing: <strong className="text-[#0B1324]">{furnishing}</strong>
                    </p>
                    <p className="text-[#5E687A]">
                      Brokerage: <strong className="text-[#0B1324]">{formattedBrokerageFee}</strong>
                    </p>
                    <p className="text-[#5E687A]">
                      Photos: <strong className="text-[#0B1324]">{images.length} uploaded</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {STEP_LABELS.slice(0, 8).map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setStep(idx)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#E6E9EF] text-xs font-semibold text-[#5E687A] hover:text-[#1A56FF]"
                  >
                    Edit {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="pt-4 border-t border-[#E6E9EF] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => (step === 0 ? onCancel() : setStep((s) => s - 1))}
              className="min-h-[44px] px-5 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] text-sm font-semibold text-[#0B1324]"
            >
              {step === 0 ? 'Cancel' : 'Back'}
            </button>

            {step < STEP_LABELS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="min-h-[44px] px-6 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmit('draft')}
                  className="min-h-[44px] px-5 rounded-xl bg-[#F7F8FA] hover:bg-[#ECEFF4] border border-[#E6E9EF] text-sm font-semibold text-[#0B1324]"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmit('available')}
                  className="min-h-[44px] px-6 rounded-xl bg-[#1A56FF] hover:bg-[#1244D8] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {saving
                      ? 'Publishing...'
                      : isEditing
                      ? 'Save & Publish'
                      : 'Publish Property'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
