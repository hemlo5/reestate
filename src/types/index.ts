export type UserRole = 'seeker' | 'broker';

export type ListingIntent = 'rent' | 'buy';

export type PropertyCategory = 'Flat' | 'House' | 'Room';

export type DetailedPropertyCategory =
  | 'Apartment / Flat'
  | 'Independent House'
  | 'Villa'
  | 'PG / Hostel'
  | 'Commercial Space'
  | 'Office Space'
  | 'Shop'
  | 'Other';

export type TransactionType =
  | 'For Rent'
  | 'For Sale'
  | 'PG / Shared Accommodation'
  | 'Lease';

export type BrokerSpecialization =
  | 'Residential rentals'
  | 'Residential sales'
  | 'Commercial rentals'
  | 'Commercial sales'
  | 'PG and co-living'
  | 'Independent houses'
  | 'Apartments'
  | 'Villas';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export type FurnishingType = 'Furnished' | 'Semi-furnished' | 'Unfurnished';

export type FurnishingPreference = FurnishingType | 'Any';

export type PropertyAvailability = 'available' | 'draft' | 'rented' | 'sold' | 'inactive';

export type ProposalStatus = 'pending' | 'shortlisted' | 'accepted' | 'declined';

export type ProposalLifecycleStatus =
  | 'Sent'
  | 'Viewed'
  | 'Interested'
  | 'Visit Requested'
  | 'Visit Scheduled'
  | 'Rejected'
  | 'Closed';

export type VisitStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled';

export interface BrokerVerificationDocs {
  reraAuthority?: string;
  govtIdType?: string;
  govtIdNumber?: string;
  govtIdFileName?: string;
  govtIdFileKey?: string;
  govtIdFileData?: string;
  agencyRegFileName?: string;
  reraCertificateName?: string;
  businessEmail?: string;
  businessPhone?: string;
  submittedAt?: string;
  rejectionReason?: string;
}

export interface BrokerProfile {
  isIndependent?: boolean;
  agencyName?: string;
  agencyAddress?: string;
  phone: string;
  operatingLocalities: string[];
  propertyCategories: PropertyCategory[];
  specializations?: BrokerSpecialization[];
  yearsExperience: number;
  propertiesManagedCount?: number;
  website?: string;
  reraId?: string;
  avatarUrl?: string;
  verificationStatus?: VerificationStatus;
  verified: boolean;
  bio?: string;
  closedDealsCount: number;
  verificationDocs?: BrokerVerificationDocs;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  city: string;
  avatarUrl?: string;
  authMethod?: 'password' | 'otp';
  isDemo?: boolean;
  brokerProfile?: BrokerProfile;
}

export interface Requirement {
  id: string;
  seekerId: string;
  seekerName: string;
  seekerPhone: string;
  seekerEmail: string;
  intent: ListingIntent;
  localities: string[];
  budgetMin: number;
  budgetMax: number;
  propertyType: PropertyCategory;
  bedrooms: number; // 1, 2, 3, 4 (4 represents 4+)
  furnishing: FurnishingPreference;
  moveInDate: string;
  amenities: string[];
  notes: string;
  status: 'active' | 'paused' | 'fulfilled';
  isDemo?: boolean;
  createdAt: string;
}

export interface Property {
  id: string;
  brokerId: string;
  brokerName: string;
  brokerAgency?: string;
  brokerPhone: string;
  brokerVerified: boolean;
  brokerReraAuthority?: string;
  brokerReraId?: string;
  title: string;
  intent: ListingIntent;
  transactionType?: TransactionType;
  listingCategory?: DetailedPropertyCategory;
  locality: string;
  city?: string;
  pincode?: string;
  landmark?: string;
  address: string;
  price: number;
  securityDeposit?: number;
  maintenanceCharges?: number;
  pricePerSqFt?: number;
  brokerageAmount?: number;
  brokerageType?: 'fixed' | 'percentage';
  depositOrMaintenance?: string;
  brokerageFee: string;
  propertyType: PropertyCategory;
  bedrooms: number;
  bathrooms: number;
  areaSqFt: number;
  carpetAreaSqFt?: number;
  builtUpAreaSqFt?: number;
  floorInfo: string;
  floorNumber?: number;
  totalFloors?: number;
  furnishing: FurnishingType;
  parking?: string;
  balconies?: number;
  propertyAge?: string;
  availableFrom: string;
  amenities: string[];
  description: string;
  additionalInfo?: string;
  sellingPoints?: string[];
  videoTourUrl?: string;
  images: string[];
  availability: PropertyAvailability;
  isDemo?: boolean;
  mapX: number;
  mapY: number;
  lat?: number;
  lng?: number;
  createdAt: string;
}

export interface Proposal {
  id: string;
  requirementId: string;
  propertyId: string;
  brokerId: string;
  seekerId: string;
  proposedPrice: number;
  brokerageCharge: string;
  message: string;
  whyMatches?: string;
  availabilityConfirmed?: boolean;
  contactShared?: boolean;
  status: ProposalStatus;
  statusDetail?: ProposalLifecycleStatus;
  viewedAt?: string;
  matchScore: number;
  matchReasons: string[];
  isDemo?: boolean;
  createdAt: string;
}

export interface Visit {
  id: string;
  propertyId: string;
  proposalId?: string;
  seekerId: string;
  seekerName: string;
  brokerId: string;
  date: string;
  timeSlot: string;
  notes?: string;
  status: VisitStatus;
  createdAt: string;
}

export interface Message {
  id: string;
  proposalId?: string;
  propertyId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  body: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type:
    | 'matching_requirement'
    | 'proposal_received'
    | 'proposal_viewed'
    | 'customer_interested'
    | 'visit_requested'
    | 'visit_confirmed'
    | 'contact_shared';
  title: string;
  body: string;
  relatedId?: string;
  read: boolean;
  createdAt: string;
}

export interface BrokerReview {
  id: string;
  brokerId: string;
  authorId: string;
  authorName: string;
  rating: number;
  comment: string;
  locality?: string;
  createdAt: string;
}

export interface MatchBreakdown {
  locationScore: number;
  budgetScore: number;
  bhkScore: number;
  typeScore: number;
  furnishingScore: number;
}

export interface MatchResult {
  score: number;
  label: 'Strong Match' | 'Good Match' | 'Partial Match' | 'Low Match';
  reasons: string[];
  warnings: string[];
  breakdown: MatchBreakdown;
}

export interface SearchFilters {
  locality: string;
  intent: ListingIntent;
  propertyType: PropertyCategory | 'All';
  bedrooms: number | 'All';
  budgetMax: number | null;
  furnishing: FurnishingPreference;
  query: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}

export interface MatchedLeadItem {
  requirement: Requirement;
  bestProperty: Property | null;
  bestMatch: MatchResult | null;
  alreadyProposed: boolean;
}
