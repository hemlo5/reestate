import type {
  AppNotification,
  BrokerProfile,
  BrokerReview,
  Message,
  Property,
  PropertyCategory,
  Proposal,
  ProposalStatus,
  Requirement,
  UserRole,
  Visit,
  VisitStatus,
} from '@/types';
import type { StoredUser } from './types';

export function mapSupabaseUser(
  row: Record<string, unknown>,
  bpRow?: Record<string, unknown>
): StoredUser {
  const brokerProfile: BrokerProfile | undefined = bpRow
    ? {
        isIndependent: Boolean(bpRow.is_independent),
        agencyName: (bpRow.agency_name as string) || '',
        agencyAddress: (bpRow.agency_address as string) || '',
        phone: (bpRow.phone as string) || '',
        operatingLocalities: (bpRow.operating_localities as string[]) || [],
        propertyCategories:
          (bpRow.property_categories as PropertyCategory[]) || [],
        specializations:
          (bpRow.specializations as BrokerProfile['specializations']) || [],
        yearsExperience: Number(bpRow.years_experience ?? 1),
        propertiesManagedCount: Number(bpRow.properties_managed_count ?? 0),
        website: (bpRow.website as string | null) ?? undefined,
        reraId: (bpRow.rera_id as string | null) ?? undefined,
        avatarUrl: (bpRow.avatar_url as string | null) ?? undefined,
        verificationStatus:
          (bpRow.verification_status as BrokerProfile['verificationStatus']) ??
          'pending',
        verified: Boolean(bpRow.verified),
        bio: (bpRow.bio as string) || '',
        closedDealsCount: Number(bpRow.closed_deals_count ?? 0),
        verificationDocs:
          (bpRow.verification_docs as BrokerProfile['verificationDocs']) ??
          undefined,
      }
    : undefined;

  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    phone: (row.phone as string) || '',
    role: row.role as UserRole,
    city: (row.city as string) || 'Bengaluru',
    avatarUrl: (row.avatar_url as string | null) ?? undefined,
    authMethod: (row.auth_method as 'password' | 'otp') ?? 'password',
    passwordHash: (row.password_hash as string | null) ?? null,
    isDemo: Boolean(row.is_demo),
    ...(brokerProfile ? { brokerProfile } : {}),
  };
}

export function mapSupabaseProperty(row: Record<string, unknown>): Property {
  return {
    id: row.id as string,
    brokerId: row.broker_id as string,
    brokerName: row.broker_name as string,
    brokerAgency: (row.broker_agency as string | null) ?? undefined,
    brokerPhone: (row.broker_phone as string) || '',
    brokerVerified: Boolean(row.broker_verified),
    title: row.title as string,
    intent: row.intent as Property['intent'],
    transactionType:
      (row.transaction_type as Property['transactionType']) ?? undefined,
    listingCategory:
      (row.listing_category as Property['listingCategory']) ?? undefined,
    locality: row.locality as string,
    city: (row.city as string) || 'Bengaluru',
    pincode: (row.pincode as string | null) ?? undefined,
    landmark: (row.landmark as string | null) ?? undefined,
    address: row.address as string,
    price: Number(row.price),
    securityDeposit:
      row.security_deposit != null ? Number(row.security_deposit) : undefined,
    maintenanceCharges:
      row.maintenance_charges != null
        ? Number(row.maintenance_charges)
        : undefined,
    pricePerSqFt:
      row.price_per_sqft != null ? Number(row.price_per_sqft) : undefined,
    brokerageAmount:
      row.brokerage_amount != null ? Number(row.brokerage_amount) : undefined,
    brokerageType:
      (row.brokerage_type as Property['brokerageType']) ?? undefined,
    depositOrMaintenance:
      (row.deposit_or_maintenance as string | null) ?? undefined,
    brokerageFee: (row.brokerage_fee as string) || '',
    propertyType: row.property_type as PropertyCategory,
    bedrooms: Number(row.bedrooms),
    bathrooms: Number(row.bathrooms),
    areaSqFt: Number(row.area_sqft),
    carpetAreaSqFt:
      row.carpet_area_sqft != null ? Number(row.carpet_area_sqft) : undefined,
    builtUpAreaSqFt:
      row.built_up_area_sqft != null ? Number(row.built_up_area_sqft) : undefined,
    floorInfo: (row.floor_info as string) || '',
    floorNumber:
      row.floor_number != null ? Number(row.floor_number) : undefined,
    totalFloors:
      row.total_floors != null ? Number(row.total_floors) : undefined,
    furnishing: row.furnishing as Property['furnishing'],
    parking: (row.parking as string | null) ?? undefined,
    balconies: row.balconies != null ? Number(row.balconies) : undefined,
    propertyAge: (row.property_age as string | null) ?? undefined,
    availableFrom: (row.available_from as string) || 'Immediate',
    amenities: (row.amenities as string[]) || [],
    description: (row.description as string) || '',
    additionalInfo: (row.additional_info as string | null) ?? undefined,
    sellingPoints: (row.selling_points as string[]) || [],
    videoTourUrl: (row.video_tour_url as string | null) ?? undefined,
    images: (row.images as string[]) || [],
    availability: row.availability as Property['availability'],
    isDemo: Boolean(row.is_demo),
    mapX: Number(row.map_x ?? 50),
    mapY: Number(row.map_y ?? 50),
    lat: row.lat != null ? Number(row.lat) : undefined,
    lng: row.lng != null ? Number(row.lng) : undefined,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export function mapSupabaseRequirement(row: Record<string, unknown>): Requirement {
  return {
    id: row.id as string,
    seekerId: row.seeker_id as string,
    seekerName: row.seeker_name as string,
    seekerPhone: (row.seeker_phone as string) || '',
    seekerEmail: (row.seeker_email as string) || '',
    intent: row.intent as Requirement['intent'],
    localities: (row.localities as string[]) || [],
    budgetMin: Number(row.budget_min),
    budgetMax: Number(row.budget_max),
    propertyType: row.property_type as Requirement['propertyType'],
    bedrooms: Number(row.bedrooms),
    furnishing: row.furnishing as Requirement['furnishing'],
    moveInDate: (row.move_in_date as string) || '',
    amenities: (row.amenities as string[]) || [],
    notes: (row.notes as string) || '',
    status: row.status as Requirement['status'],
    isDemo: Boolean(row.is_demo),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export function mapSupabaseProposal(row: Record<string, unknown>): Proposal {
  return {
    id: row.id as string,
    requirementId: row.requirement_id as string,
    propertyId: row.property_id as string,
    brokerId: row.broker_id as string,
    seekerId: row.seeker_id as string,
    proposedPrice: Number(row.proposed_price),
    brokerageCharge: (row.brokerage_charge as string) || '',
    message: (row.message as string) || '',
    whyMatches: (row.why_matches as string | null) ?? undefined,
    availabilityConfirmed: Boolean(row.availability_confirmed),
    contactShared: Boolean(row.contact_shared),
    status: row.status as ProposalStatus,
    statusDetail: (row.status_detail as Proposal['statusDetail']) ?? undefined,
    viewedAt: row.viewed_at
      ? new Date(row.viewed_at as string).toISOString()
      : undefined,
    matchScore: Number(row.match_score),
    matchReasons: (row.match_reasons as string[]) || [],
    isDemo: Boolean(row.is_demo),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export function mapSupabaseVisit(row: Record<string, unknown>): Visit {
  return {
    id: row.id as string,
    propertyId: row.property_id as string,
    proposalId: (row.proposal_id as string | null) ?? undefined,
    seekerId: row.seeker_id as string,
    seekerName: row.seeker_name as string,
    brokerId: row.broker_id as string,
    date: row.date as string,
    timeSlot: row.time_slot as string,
    notes: (row.notes as string | null) ?? undefined,
    status: row.status as VisitStatus,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export function mapSupabaseMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    proposalId: (row.proposal_id as string | null) ?? undefined,
    propertyId: row.property_id as string,
    senderId: row.sender_id as string,
    senderName: row.sender_name as string,
    senderRole: row.sender_role as UserRole,
    recipientId: row.recipient_id as string,
    body: row.body as string,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export function mapSupabaseNotification(
  row: Record<string, unknown>
): AppNotification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as AppNotification['type'],
    title: row.title as string,
    body: row.body as string,
    relatedId: (row.related_id as string | null) ?? undefined,
    read: Boolean(row.read),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export function mapSupabaseReview(row: Record<string, unknown>): BrokerReview {
  return {
    id: row.id as string,
    brokerId: row.broker_id as string,
    authorId: row.author_id as string,
    authorName: row.author_name as string,
    rating: Number(row.rating),
    comment: row.comment as string,
    locality: (row.locality as string | null) ?? undefined,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}
