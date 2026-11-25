import type {
  AppNotification,
  BrokerReview,
  ListingIntent,
  MatchedLeadItem,
  Message,
  PaginatedResult,
  Property,
  PropertyAvailability,
  PropertyCategory,
  Proposal,
  Requirement,
  User,
  UserRole,
  Visit,
  VisitStatus,
} from '@/types';
import type {
  CreateMessageInput,
  CreatePropertyInput,
  CreateProposalInput,
  CreateRequirementInput,
  CreateReviewInput,
  CreateVisitInput,
  RegisterInput,
  UpdateProfileInput,
  UpdatePropertyInput,
  UpdateProposalInput,
  UpdateRequirementInput,
} from '@/lib/validation/schemas';

export interface StoredUser extends User {
  passwordHash?: string | null;
}

export interface SessionRecord {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface PropertyQueryFilters {
  intent?: ListingIntent;
  locality?: string;
  propertyType?: PropertyCategory | 'All';
  bedrooms?: number | 'All';
  budgetMax?: number | null;
  furnishing?: string;
  query?: string;
  brokerId?: string;
  includeUnavailable?: boolean;
  cursor?: string | null;
  limit?: number;
}

export interface LeadQueryFilters {
  brokerId: string;
  intent?: ListingIntent | 'All';
  locality?: string;
  propertyType?: PropertyCategory | 'All';
  bedrooms?: number | 'All';
  query?: string;
  onlyMatchingMyInventory?: boolean;
  cursor?: string | null;
  limit?: number;
}

export interface DbAdapter {
  // Users & Sessions
  getUserById(id: string): Promise<StoredUser | null>;
  getUserByEmail(email: string): Promise<StoredUser | null>;
  listDemoUsers(): Promise<User[]>;
  listPublicBrokers(): Promise<User[]>;
  createUser(input: RegisterInput & { passwordHash?: string | null }): Promise<User>;
  registerAsBroker(
    userId: string,
    input: {
      name: string;
      phone: string;
      city: string;
      avatarUrl?: string;
      brokerProfile: NonNullable<UpdateProfileInput['brokerProfile']>;
    }
  ): Promise<User | null>;
  updateUserProfile(userId: string, updates: UpdateProfileInput): Promise<User | null>;
  createSession(userId: string, expiresAtIso: string): Promise<SessionRecord>;
  getSession(sessionId: string): Promise<SessionRecord | null>;
  deleteSession(sessionId: string): Promise<void>;

  // Properties
  listProperties(filters?: PropertyQueryFilters): Promise<PaginatedResult<Property>>;
  getPropertyById(id: string): Promise<Property | null>;
  createProperty(broker: User, input: CreatePropertyInput): Promise<Property>;
  updateProperty(
    id: string,
    brokerId: string,
    updates: UpdatePropertyInput
  ): Promise<Property | null>;
  deleteProperty(id: string, brokerId: string): Promise<boolean>;

  // Requirements & Matched Leads
  listRequirementsBySeeker(seekerId: string): Promise<Requirement[]>;
  getRequirementById(id: string): Promise<Requirement | null>;
  createRequirement(seeker: User, input: CreateRequirementInput): Promise<Requirement>;
  updateRequirement(
    id: string,
    seekerId: string,
    updates: UpdateRequirementInput
  ): Promise<Requirement | null>;
  deleteRequirement(id: string, seekerId: string): Promise<boolean>;
  getLeadsForBroker(filters: LeadQueryFilters): Promise<PaginatedResult<MatchedLeadItem>>;

  // Proposals
  listProposalsForSeeker(
    seekerId: string,
    requirementId?: string
  ): Promise<Proposal[]>;
  listProposalsForBroker(brokerId: string): Promise<Proposal[]>;
  getProposalById(id: string): Promise<Proposal | null>;
  createProposal(broker: User, input: CreateProposalInput): Promise<Proposal>;
  updateProposal(
    id: string,
    actor: User,
    updates: UpdateProposalInput
  ): Promise<Proposal | null>;

  // Visits
  listVisitsForUser(userId: string, role: UserRole): Promise<Visit[]>;
  createVisit(seeker: User, input: CreateVisitInput): Promise<Visit>;
  updateVisitStatus(
    visitId: string,
    actor: User,
    status: VisitStatus
  ): Promise<Visit | null>;

  // Messages
  listMessagesForProperty(propertyId: string, viewerId?: string): Promise<Message[]>;
  listMessagesForUser(userId: string): Promise<Message[]>;
  createMessage(sender: User, input: CreateMessageInput): Promise<Message>;

  // Saved Homes
  getSavedPropertyIds(userId: string): Promise<string[]>;
  listSavedProperties(userId: string): Promise<Property[]>;
  toggleSavedProperty(userId: string, propertyId: string): Promise<string[]>;

  // Notifications
  listNotificationsForUser(userId: string): Promise<AppNotification[]>;
  markNotificationsRead(userId: string, notificationId?: string): Promise<void>;

  // Reviews
  listReviewsForBroker(brokerId: string): Promise<BrokerReview[]>;
  createReview(author: User, input: CreateReviewInput): Promise<BrokerReview>;
}

export type AvailabilityFilter = PropertyAvailability;
