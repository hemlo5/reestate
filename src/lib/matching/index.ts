import type {
  BrokerSpecialization,
  DetailedPropertyCategory,
  ListingIntent,
  MatchResult,
  Property,
  PropertyCategory,
  Proposal,
  ProposalLifecycleStatus,
  Requirement,
  SearchFilters,
  TransactionType,
  User,
} from '@/types';

export const LOCALITIES = [
  'Koramangala',
  'Indiranagar',
  'HSR Layout',
  'Whitefield',
  'Jayanagar',
  'Sadashivanagar',
  'Bandra West',
  'Marathahalli',
  'Electronic City',
  'Hebbal',
  'Bellandur',
] as const;

export const LOCALITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Koramangala: { lat: 12.9352, lng: 77.6245 },
  Indiranagar: { lat: 12.9784, lng: 77.6408 },
  'HSR Layout': { lat: 12.9116, lng: 77.6474 },
  Whitefield: { lat: 12.9698, lng: 77.7499 },
  Jayanagar: { lat: 12.9308, lng: 77.5838 },
  Sadashivanagar: { lat: 13.0068, lng: 77.5813 },
  'Bandra West': { lat: 19.0596, lng: 72.8295 },
  Marathahalli: { lat: 12.9591, lng: 77.6974 },
  'Electronic City': { lat: 12.8452, lng: 77.6602 },
  Hebbal: { lat: 13.0358, lng: 77.597 },
  Bellandur: { lat: 12.9279, lng: 77.6762 },
};

export const BROKER_SPECIALIZATIONS: BrokerSpecialization[] = [
  'Residential rentals',
  'Residential sales',
  'Commercial rentals',
  'Commercial sales',
  'PG and co-living',
  'Independent houses',
  'Apartments',
  'Villas',
];

export const DETAILED_PROPERTY_CATEGORIES: DetailedPropertyCategory[] = [
  'Apartment / Flat',
  'Independent House',
  'Villa',
  'PG / Hostel',
  'Commercial Space',
  'Office Space',
  'Shop',
  'Other',
];

export const TRANSACTION_TYPES: TransactionType[] = [
  'For Rent',
  'For Sale',
  'PG / Shared Accommodation',
  'Lease',
];

export const COMMON_AMENITIES = [
  'Covered Parking',
  'Power Backup',
  '24x7 Security',
  'Elevator',
  'Balcony',
  'Gym / Fitness',
  'Modular Kitchen',
  'Pet Friendly',
  'High-Speed Fiber',
  'Water Purifier',
] as const;

export const LISTING_AMENITIES = [
  'Swimming pool',
  'Gym',
  'Lift',
  'Power backup',
  'Security',
  'CCTV',
  'Clubhouse',
  'Garden',
  'Parking',
  'Water supply',
  'Air conditioning',
  'Wi-Fi',
] as const;

const NEARBY_LOCALITIES: Record<string, string[]> = {
  Koramangala: ['HSR Layout', 'Indiranagar', 'Jayanagar', 'Bellandur'],
  Indiranagar: ['Koramangala', 'Whitefield', 'Marathahalli'],
  'HSR Layout': ['Koramangala', 'Jayanagar', 'Bellandur', 'Electronic City'],
  Whitefield: ['Indiranagar', 'Marathahalli', 'Bellandur'],
  Marathahalli: ['Whitefield', 'Bellandur', 'Indiranagar'],
  'Electronic City': ['HSR Layout', 'Bellandur'],
  Jayanagar: ['Koramangala', 'HSR Layout', 'Sadashivanagar'],
  Sadashivanagar: ['Jayanagar', 'Hebbal', 'Indiranagar'],
  Hebbal: ['Sadashivanagar'],
  Bellandur: ['HSR Layout', 'Koramangala', 'Marathahalli', 'Whitefield'],
  'Bandra West': [],
};

export function mapDetailedCategoryToBase(category: DetailedPropertyCategory): PropertyCategory {
  if (category === 'Independent House' || category === 'Villa') return 'House';
  if (category === 'PG / Hostel') return 'Room';
  return 'Flat';
}

export function mapTransactionToIntent(tx: TransactionType): ListingIntent {
  return tx === 'For Sale' ? 'buy' : 'rent';
}

export function isBrokerVerified(user?: Pick<User, 'brokerProfile'> | null): boolean {
  if (!user?.brokerProfile) return false;
  if (user.brokerProfile.verificationStatus) {
    return user.brokerProfile.verificationStatus === 'verified';
  }
  return Boolean(user.brokerProfile.verified);
}

export function getBrokerVerificationLabel(
  user?: Pick<User, 'brokerProfile'> | null
): 'Verified' | 'Verification pending' | 'Verification rejected' | 'Unverified' {
  const status = user?.brokerProfile?.verificationStatus;
  if (status === 'verified' || (!status && user?.brokerProfile?.verified)) {
    return 'Verified';
  }
  if (status === 'rejected') {
    return 'Verification rejected';
  }
  const docs = user?.brokerProfile?.verificationDocs;
  return docs?.submittedAt || docs?.govtIdNumber || user?.brokerProfile?.reraId
    ? 'Verification pending'
    : 'Unverified';
}

export function formatProposalLifecycle(proposal: Proposal): ProposalLifecycleStatus {
  if (proposal.statusDetail) return proposal.statusDetail;
  if (proposal.status === 'accepted') return 'Interested';
  if (proposal.status === 'shortlisted') return 'Interested';
  if (proposal.status === 'declined') return 'Rejected';
  if (proposal.viewedAt) return 'Viewed';
  return 'Sent';
}

export function hasExistingProposal(
  proposals: Proposal[],
  requirementId: string,
  propertyId: string
): boolean {
  return proposals.some(
    (p) => p.requirementId === requirementId && p.propertyId === propertyId
  );
}

export function formatINR(amount: number, intent?: ListingIntent): string {
  if (!Number.isFinite(amount) || amount <= 0) return '₹0';
  if (intent === 'buy' || amount >= 1000000) {
    if (amount >= 10000000) {
      const crores = amount / 10000000;
      return `₹${crores % 1 === 0 ? crores.toFixed(0) : crores.toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      const lakhs = amount / 100000;
      return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)} L`;
    }
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatCompactMarkerPrice(amount: number, intent: ListingIntent): string {
  if (intent === 'buy' || amount >= 1000000) {
    if (amount >= 10000000) {
      const cr = amount / 10000000;
      return `₹${cr.toFixed(cr >= 10 ? 1 : 2).replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1')}Cr`;
    }
    const l = amount / 100000;
    return `₹${Math.round(l)}L`;
  }
  if (amount >= 1000) {
    const k = amount / 1000;
    return `₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `₹${amount}`;
}

export function formatBudgetRange(min: number, max: number, intent: ListingIntent): string {
  const suffix = intent === 'rent' ? '/mo' : '';
  return `${formatINR(min, intent)} – ${formatINR(max, intent)}${suffix}`;
}

export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function normalizeAmenityToken(a: string): string {
  const lower = a.trim().toLowerCase();
  if (lower.includes('parking')) return 'parking';
  if (lower.includes('power')) return 'power backup';
  if (lower.includes('lift') || lower.includes('elevator')) return 'elevator';
  if (lower.includes('security') || lower.includes('cctv')) return 'security';
  if (lower.includes('gym')) return 'gym';
  if (lower.includes('wi-fi') || lower.includes('fiber')) return 'wifi';
  return lower;
}

export function computePropertyMatch(
  requirement: Requirement,
  property: Property
): MatchResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (property.availability !== 'available') {
    return {
      score: 0,
      label: 'Low Match',
      reasons: [],
      warnings: [`Property is currently marked as ${property.availability}`],
      breakdown: {
        locationScore: 0,
        budgetScore: 0,
        bhkScore: 0,
        typeScore: 0,
        furnishingScore: 0,
      },
    };
  }

  if (requirement.intent !== property.intent) {
    return {
      score: 10,
      label: 'Low Match',
      reasons: [],
      warnings: [
        `Listing is for ${property.intent === 'rent' ? 'Rent' : 'Sale'}, while customer wants to ${requirement.intent === 'rent' ? 'Rent' : 'Buy'}`,
      ],
      breakdown: {
        locationScore: 0,
        budgetScore: 0,
        bhkScore: 0,
        typeScore: 0,
        furnishingScore: 0,
      },
    };
  }

  let locationScore = 0;
  const preferredLocalities = requirement.localities.map((l) => l.trim().toLowerCase());
  const propLocLower = property.locality.trim().toLowerCase();

  if (preferredLocalities.includes(propLocLower) || preferredLocalities.includes('all')) {
    locationScore = 30;
    reasons.push(`Located in ${property.locality} (exact area match)`);
  } else {
    const isNearby = requirement.localities.some((loc) =>
      (NEARBY_LOCALITIES[loc] || []).some(
        (adj) => adj.toLowerCase() === propLocLower
      )
    );
    if (isNearby) {
      locationScore = 16;
      warnings.push(`${property.locality} is adjacent to ${requirement.localities.join(', ')}`);
    } else {
      locationScore = 0;
      warnings.push(`Outside preferred localities (${requirement.localities.join(', ')})`);
    }
  }

  let budgetScore = 0;
  const minB = Math.min(requirement.budgetMin, requirement.budgetMax);
  const maxB = Math.max(requirement.budgetMin, requirement.budgetMax);

  if (property.price >= minB && property.price <= maxB) {
    budgetScore = 30;
    reasons.push(
      `${formatINR(property.price, property.intent)} fits within ${formatBudgetRange(minB, maxB, requirement.intent)}`
    );
  } else if (property.price < minB) {
    const underRatio = (minB - property.price) / Math.max(minB, 1);
    budgetScore = underRatio <= 0.2 ? 26 : 20;
    reasons.push(`${formatINR(property.price, property.intent)} is below maximum budget`);
  } else {
    const overRatio = (property.price - maxB) / Math.max(maxB, 1);
    if (overRatio <= 0.1) {
      budgetScore = 18;
      warnings.push(`Slightly above budget (+${Math.round(overRatio * 100)}%)`);
    } else if (overRatio <= 0.25) {
      budgetScore = 8;
      warnings.push(`Exceeds max budget by ${formatINR(property.price - maxB, property.intent)}`);
    } else {
      budgetScore = 0;
      warnings.push(`Significantly above ${formatINR(maxB, property.intent)} max budget`);
    }
  }

  let bhkScore = 0;
  const reqBhk = requirement.bedrooms;
  const propBhk = property.bedrooms;
  if (reqBhk >= 4 ? propBhk >= 4 : propBhk === reqBhk) {
    bhkScore = 20;
    reasons.push(`${propBhk} BHK matches configuration`);
  } else if (Math.abs(propBhk - reqBhk) === 1) {
    bhkScore = 8;
    warnings.push(`${propBhk} BHK differs from requested ${reqBhk} BHK`);
  } else {
    bhkScore = 0;
    warnings.push(`${propBhk} BHK does not match ${reqBhk} BHK requirement`);
  }

  let typeScore = 0;
  if (requirement.propertyType === property.propertyType) {
    typeScore = 10;
    reasons.push(`${property.propertyType} matches property type`);
  } else {
    typeScore = 2;
    warnings.push(`Listed as ${property.propertyType} instead of ${requirement.propertyType}`);
  }

  let furnishingScore = 0;
  if (requirement.furnishing === 'Any' || requirement.furnishing === property.furnishing) {
    furnishingScore = 10;
    if (requirement.furnishing !== 'Any') {
      reasons.push(`${property.furnishing} matches furnishing preference`);
    }
  } else if (
    (requirement.furnishing === 'Semi-furnished' && property.furnishing === 'Furnished') ||
    (requirement.furnishing === 'Furnished' && property.furnishing === 'Semi-furnished')
  ) {
    furnishingScore = 6;
    warnings.push(`${property.furnishing} (requested ${requirement.furnishing})`);
  } else {
    furnishingScore = 2;
    warnings.push(`${property.furnishing} (requested ${requirement.furnishing})`);
  }

  if (requirement.amenities.length > 0) {
    const propTokens = new Set(property.amenities.map(normalizeAmenityToken));
    const matchedAmenities = requirement.amenities.filter((reqAm) =>
      propTokens.has(normalizeAmenityToken(reqAm))
    );
    if (matchedAmenities.length > 0) {
      reasons.push(
        `Includes ${matchedAmenities.length}/${requirement.amenities.length} requested amenities (${matchedAmenities.slice(0, 2).join(', ')})`
      );
    }
  }

  const totalScore = Math.max(
    0,
    Math.min(100, locationScore + budgetScore + bhkScore + typeScore + furnishingScore)
  );

  let label: MatchResult['label'] = 'Low Match';
  if (totalScore >= 85) label = 'Strong Match';
  else if (totalScore >= 65) label = 'Good Match';
  else if (totalScore >= 45) label = 'Partial Match';

  return {
    score: totalScore,
    label,
    reasons,
    warnings,
    breakdown: {
      locationScore,
      budgetScore,
      bhkScore,
      typeScore,
      furnishingScore,
    },
  };
}

export function rankPropertiesForRequirement(
  requirement: Requirement,
  properties: Property[]
): Array<{ property: Property; match: MatchResult }> {
  return properties
    .filter((p) => p.availability === 'available')
    .map((property) => ({
      property,
      match: computePropertyMatch(requirement, property),
    }))
    .sort((a, b) => b.match.score - a.match.score);
}

export function countMatchingRequirementsForProperty(
  property: Property,
  requirements: Requirement[]
): number {
  if (property.availability !== 'available') return 0;
  return requirements.filter(
    (req) => req.status === 'active' && computePropertyMatch(req, property).score >= 65
  ).length;
}

export function filterProperties(
  properties: Property[],
  filters: SearchFilters
): Property[] {
  return properties.filter((p) => {
    if (p.availability !== 'available') return false;
    if (p.intent !== filters.intent) return false;
    if (
      filters.locality &&
      filters.locality !== 'All' &&
      p.locality.toLowerCase() !== filters.locality.toLowerCase()
    ) {
      return false;
    }
    if (filters.propertyType !== 'All' && p.propertyType !== filters.propertyType) {
      return false;
    }
    if (filters.bedrooms !== 'All') {
      if (filters.bedrooms >= 4) {
        if (p.bedrooms < 4) return false;
      } else if (p.bedrooms !== filters.bedrooms) {
        return false;
      }
    }
    if (filters.budgetMax && filters.budgetMax > 0 && p.price > filters.budgetMax) {
      return false;
    }
    if (filters.furnishing !== 'Any' && p.furnishing !== filters.furnishing) {
      return false;
    }
    if (filters.query.trim()) {
      const q = filters.query.trim().toLowerCase();
      const hay = `${p.title} ${p.locality} ${p.address} ${p.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function slugifyLocality(locality: string): string {
  return locality.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function findLocalityBySlug(slug: string): string | null {
  const normalized = slug.trim().toLowerCase();
  return LOCALITIES.find((l) => slugifyLocality(l) === normalized) ?? null;
}
