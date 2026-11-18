import { randomUUID } from 'node:crypto';
import type {
  AppNotification,
  BrokerReview,
  MatchedLeadItem,
  Message,
  PaginatedResult,
  Property,
  Proposal,
  Requirement,
  User,
  UserRole,
  Visit,
  VisitStatus,
} from '@/types';
import {
  computePropertyMatch,
  LOCALITY_COORDS,
  mapDetailedCategoryToBase,
  mapTransactionToIntent,
} from '@/lib/matching';
import { hashPassword } from '@/lib/auth/password';
import { sanitizeUser } from '@/lib/auth/session';
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
import { AppError } from './errors';
import { createSeedPayload } from './seed-data';
import type {
  DbAdapter,
  LeadQueryFilters,
  PropertyQueryFilters,
  SessionRecord,
  StoredUser,
} from './types';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
}

export class MemoryDbAdapter implements DbAdapter {
  private users: StoredUser[] = [];
  private sessions = new Map<string, SessionRecord>();
  private properties: Property[] = [];
  private requirements: Requirement[] = [];
  private proposals: Proposal[] = [];
  private visits: Visit[] = [];
  private messages: Message[] = [];
  private notifications: AppNotification[] = [];
  private reviews: BrokerReview[] = [];
  private saved = new Set<string>();
  private readyPromise: Promise<void> | null = null;

  private async ensureReady(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise = (async () => {
        if (this.users.length > 0) return;
        const demoHash = await hashPassword('housed123');
        const seed = createSeedPayload(demoHash);
        this.users = seed.users.map((u) => structuredClone(u));
        this.properties = seed.properties.map((p) => structuredClone(p));
        this.requirements = seed.requirements.map((r) => structuredClone(r));
        this.proposals = seed.proposals.map((pr) => structuredClone(pr));
        this.visits = seed.visits.map((v) => structuredClone(v));
        this.messages = seed.messages.map((m) => structuredClone(m));
        this.notifications = seed.notifications.map((n) => structuredClone(n));
        this.reviews = seed.reviews.map((rv) => structuredClone(rv));
        for (const pair of seed.savedPairs) {
          this.saved.add(`${pair.userId}::${pair.propertyId}`);
        }
      })().catch((err) => {
        this.readyPromise = null;
        throw err;
      });
    }
    return this.readyPromise;
  }

  async getUserById(id: string): Promise<StoredUser | null> {
    await this.ensureReady();
    const found = this.users.find((u) => u.id === id);
    return found ? structuredClone(found) : null;
  }

  async getUserByEmail(email: string): Promise<StoredUser | null> {
    await this.ensureReady();
    const normalized = email.trim().toLowerCase();
    const found = this.users.find((u) => u.email.toLowerCase() === normalized);
    return found ? structuredClone(found) : null;
  }

  async listDemoUsers(): Promise<User[]> {
    await this.ensureReady();
    return this.users
      .filter((u) => u.isDemo)
      .sort((a, b) => b.role.localeCompare(a.role) || a.name.localeCompare(b.name))
      .map((u) => sanitizeUser(structuredClone(u)));
  }

  async listPublicBrokers(): Promise<User[]> {
    await this.ensureReady();
    return this.users
      .filter((u) => u.role === 'broker')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((u) => sanitizeUser(structuredClone(u)));
  }

  async createUser(
    input: RegisterInput & { passwordHash?: string | null }
  ): Promise<User> {
    await this.ensureReady();
    const normalized = input.email.trim().toLowerCase();
    if (this.users.some((u) => u.email.toLowerCase() === normalized)) {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
    }

    const id = makeId(input.role);
    const now = new Date().toISOString();
    const newUser: StoredUser = {
      id,
      name: input.name.trim(),
      email: normalized,
      phone: input.phone.trim(),
      role: input.role,
      city: input.city?.trim() || 'Bengaluru',
      avatarUrl: input.avatarUrl ?? input.brokerProfile?.avatarUrl,
      authMethod: input.authMethod ?? 'password',
      passwordHash: input.passwordHash ?? null,
      isDemo: false,
      ...(input.role === 'broker'
        ? {
            brokerProfile: {
              isIndependent: Boolean(
                input.brokerProfile?.isIndependent ?? !input.brokerProfile?.agencyName?.trim()
              ),
              agencyName: input.brokerProfile?.agencyName?.trim() || '',
              agencyAddress: input.brokerProfile?.agencyAddress?.trim() || '',
              phone: input.brokerProfile?.phone?.trim() || input.phone.trim(),
              operatingLocalities: input.brokerProfile?.operatingLocalities?.length
                ? input.brokerProfile.operatingLocalities
                : ['Koramangala'],
              propertyCategories: input.brokerProfile?.propertyCategories?.length
                ? input.brokerProfile.propertyCategories
                : ['Flat', 'House'],
              specializations: input.brokerProfile?.specializations ?? ['Residential rentals'],
              yearsExperience: input.brokerProfile?.yearsExperience ?? 1,
              propertiesManagedCount: input.brokerProfile?.propertiesManagedCount ?? 0,
              website: input.brokerProfile?.website?.trim() || undefined,
              reraId: input.brokerProfile?.reraId?.trim() || undefined,
              avatarUrl: input.avatarUrl ?? input.brokerProfile?.avatarUrl,
              verificationStatus: 'pending',
              verified: false,
              bio: input.brokerProfile?.bio?.trim() || '',
              closedDealsCount: 0,
              verificationDocs: input.brokerProfile?.verificationDocs
                ? { ...input.brokerProfile.verificationDocs, submittedAt: now }
                : undefined,
            },
          }
        : {}),
    };

    this.users.push(newUser);
    return sanitizeUser(structuredClone(newUser));
  }

  async updateUserProfile(
    userId: string,
    updates: UpdateProfileInput
  ): Promise<User | null> {
    await this.ensureReady();
    const user = this.users.find((u) => u.id === userId);
    if (!user) return null;

    if (updates.name !== undefined) user.name = updates.name.trim();
    if (updates.phone !== undefined) user.phone = updates.phone.trim();
    if (updates.city !== undefined) user.city = updates.city.trim();
    if (updates.avatarUrl !== undefined) user.avatarUrl = updates.avatarUrl;

    if (user.role === 'broker' && user.brokerProfile && updates.brokerProfile) {
      const bp = updates.brokerProfile;
      if (bp.isIndependent !== undefined) user.brokerProfile.isIndependent = bp.isIndependent;
      if (bp.agencyName !== undefined) user.brokerProfile.agencyName = bp.agencyName;
      if (bp.agencyAddress !== undefined) user.brokerProfile.agencyAddress = bp.agencyAddress;
      if (bp.phone !== undefined) user.brokerProfile.phone = bp.phone;
      if (bp.operatingLocalities !== undefined) {
        user.brokerProfile.operatingLocalities = bp.operatingLocalities;
      }
      if (bp.propertyCategories !== undefined) {
        user.brokerProfile.propertyCategories = bp.propertyCategories;
      }
      if (bp.specializations !== undefined) {
        user.brokerProfile.specializations = bp.specializations;
      }
      if (bp.yearsExperience !== undefined) {
        user.brokerProfile.yearsExperience = bp.yearsExperience;
      }
      if (bp.propertiesManagedCount !== undefined) {
        user.brokerProfile.propertiesManagedCount = bp.propertiesManagedCount;
      }
      if (bp.website !== undefined) user.brokerProfile.website = bp.website;
      if (bp.reraId !== undefined) user.brokerProfile.reraId = bp.reraId;
      if (bp.bio !== undefined) user.brokerProfile.bio = bp.bio;
      if (bp.avatarUrl !== undefined || updates.avatarUrl !== undefined) {
        user.brokerProfile.avatarUrl = updates.avatarUrl ?? bp.avatarUrl;
      }
      if (bp.verificationDocs) {
        user.brokerProfile.verificationDocs = {
          ...user.brokerProfile.verificationDocs,
          ...bp.verificationDocs,
          submittedAt: new Date().toISOString(),
        };
      }
    }

    return sanitizeUser(structuredClone(user));
  }

  async createSession(userId: string, expiresAtIso: string): Promise<SessionRecord> {
    await this.ensureReady();
    const record: SessionRecord = {
      id: makeId('sess'),
      userId,
      expiresAt: expiresAtIso,
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(record.id, record);
    return record;
  }

  async getSession(sessionId: string): Promise<SessionRecord | null> {
    await this.ensureReady();
    const rec = this.sessions.get(sessionId);
    if (!rec) return null;
    if (new Date(rec.expiresAt).getTime() <= Date.now()) {
      this.sessions.delete(sessionId);
      return null;
    }
    return rec;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.ensureReady();
    this.sessions.delete(sessionId);
  }

  async listProperties(
    filters: PropertyQueryFilters = {}
  ): Promise<PaginatedResult<Property>> {
    await this.ensureReady();
    const limit = Math.min(Math.max(filters.limit ?? 24, 1), 100);
    const offset = filters.cursor ? Math.max(Number.parseInt(filters.cursor, 10) || 0, 0) : 0;

    const filtered = this.properties
      .filter((p) => {
        if (!filters.includeUnavailable && !filters.brokerId && p.availability !== 'available') {
          return false;
        }
        if (filters.brokerId && p.brokerId !== filters.brokerId) return false;
        if (filters.intent && p.intent !== filters.intent) return false;
        if (filters.locality && filters.locality !== 'All' && p.locality !== filters.locality) {
          return false;
        }
        if (
          filters.propertyType &&
          filters.propertyType !== 'All' &&
          p.propertyType !== filters.propertyType
        ) {
          return false;
        }
        if (filters.bedrooms !== undefined && filters.bedrooms !== 'All') {
          if (filters.bedrooms >= 4 ? p.bedrooms < 4 : p.bedrooms !== filters.bedrooms) {
            return false;
          }
        }
        if (filters.budgetMax && p.price > filters.budgetMax) return false;
        if (
          filters.furnishing &&
          filters.furnishing !== 'Any' &&
          p.furnishing !== filters.furnishing
        ) {
          return false;
        }
        if (filters.query && filters.query.trim()) {
          const q = filters.query.trim().toLowerCase();
          const hay = `${p.title} ${p.locality} ${p.address} ${p.description}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const items = filtered.slice(offset, offset + limit).map((p) => structuredClone(p));
    const nextCursor = offset + limit < filtered.length ? String(offset + limit) : null;
    return { items, nextCursor, total: filtered.length };
  }

  async getPropertyById(id: string): Promise<Property | null> {
    await this.ensureReady();
    const found = this.properties.find((p) => p.id === id);
    return found ? structuredClone(found) : null;
  }

  async createProperty(broker: User, input: CreatePropertyInput): Promise<Property> {
    await this.ensureReady();
    const id = makeId('prop');
    const now = new Date().toISOString();
    const coords = LOCALITY_COORDS[input.locality] ?? { lat: 12.97, lng: 77.59 };
    const intent = input.transactionType
      ? mapTransactionToIntent(input.transactionType)
      : input.intent;
    const propertyType = input.listingCategory
      ? mapDetailedCategoryToBase(input.listingCategory)
      : input.propertyType;

    const created: Property = {
      id,
      brokerId: broker.id,
      brokerName: broker.name,
      brokerAgency: broker.brokerProfile?.agencyName || undefined,
      brokerPhone: broker.brokerProfile?.phone || broker.phone,
      brokerVerified: Boolean(broker.brokerProfile?.verified),
      title: input.title,
      intent,
      transactionType: input.transactionType,
      listingCategory: input.listingCategory,
      locality: input.locality,
      city: input.city || broker.city || 'Bengaluru',
      pincode: input.pincode,
      landmark: input.landmark,
      address: input.address,
      price: input.price,
      securityDeposit: input.securityDeposit,
      maintenanceCharges: input.maintenanceCharges,
      pricePerSqFt: input.pricePerSqFt,
      brokerageAmount: input.brokerageAmount,
      brokerageType: input.brokerageType,
      depositOrMaintenance: input.depositOrMaintenance,
      brokerageFee: input.brokerageFee,
      propertyType,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      areaSqFt: input.areaSqFt,
      carpetAreaSqFt: input.carpetAreaSqFt,
      builtUpAreaSqFt: input.builtUpAreaSqFt,
      floorInfo: input.floorInfo || 'Middle floor',
      floorNumber: input.floorNumber,
      totalFloors: input.totalFloors,
      furnishing: input.furnishing,
      parking: input.parking,
      balconies: input.balconies,
      propertyAge: input.propertyAge,
      availableFrom: input.availableFrom || 'Immediate',
      amenities: input.amenities ?? [],
      description: input.description,
      additionalInfo: input.additionalInfo,
      sellingPoints: input.sellingPoints ?? [],
      videoTourUrl: input.videoTourUrl || undefined,
      images: input.images,
      availability: input.availability ?? 'available',
      isDemo: false,
      mapX: input.mapX ?? 50,
      mapY: input.mapY ?? 50,
      lat: coords.lat,
      lng: coords.lng,
      createdAt: now,
    };

    this.properties.unshift(created);
    return structuredClone(created);
  }

  async updateProperty(
    id: string,
    brokerId: string,
    updates: UpdatePropertyInput
  ): Promise<Property | null> {
    await this.ensureReady();
    const existing = this.properties.find((p) => p.id === id);
    if (!existing) return null;
    if (existing.brokerId !== brokerId) {
      throw new AppError('You can only edit your own property listings.', 403, 'FORBIDDEN');
    }

    Object.assign(existing, updates);
    if (updates.transactionType) {
      existing.intent = mapTransactionToIntent(updates.transactionType);
    }
    if (updates.listingCategory) {
      existing.propertyType = mapDetailedCategoryToBase(updates.listingCategory);
    }
    if (updates.locality && LOCALITY_COORDS[updates.locality]) {
      const coords = LOCALITY_COORDS[updates.locality];
      existing.lat = coords.lat;
      existing.lng = coords.lng;
    }

    return structuredClone(existing);
  }

  async deleteProperty(id: string, brokerId: string): Promise<boolean> {
    await this.ensureReady();
    const idx = this.properties.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    if (this.properties[idx].brokerId !== brokerId) {
      throw new AppError('You can only delete your own property listings.', 403, 'FORBIDDEN');
    }
    this.properties.splice(idx, 1);
    return true;
  }

  async listRequirementsBySeeker(seekerId: string): Promise<Requirement[]> {
    await this.ensureReady();
    return this.requirements
      .filter((r) => r.seekerId === seekerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => structuredClone(r));
  }

  async getRequirementById(id: string): Promise<Requirement | null> {
    await this.ensureReady();
    const found = this.requirements.find((r) => r.id === id);
    return found ? structuredClone(found) : null;
  }

  async createRequirement(
    seeker: User,
    input: CreateRequirementInput
  ): Promise<Requirement> {
    await this.ensureReady();
    const created: Requirement = {
      id: makeId('req'),
      seekerId: seeker.id,
      seekerName: seeker.name,
      seekerPhone: seeker.phone,
      seekerEmail: seeker.email,
      intent: input.intent,
      localities: input.localities,
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      propertyType: input.propertyType,
      bedrooms: input.bedrooms,
      furnishing: input.furnishing,
      moveInDate: input.moveInDate,
      amenities: input.amenities ?? [],
      notes: input.notes ?? '',
      status: 'active',
      isDemo: false,
      createdAt: new Date().toISOString(),
    };
    this.requirements.unshift(created);
    return structuredClone(created);
  }

  async updateRequirement(
    id: string,
    seekerId: string,
    updates: UpdateRequirementInput
  ): Promise<Requirement | null> {
    await this.ensureReady();
    const existing = this.requirements.find((r) => r.id === id);
    if (!existing) return null;
    if (existing.seekerId !== seekerId) {
      throw new AppError('You can only update your own requirements.', 403, 'FORBIDDEN');
    }
    Object.assign(existing, updates);
    return structuredClone(existing);
  }

  async deleteRequirement(id: string, seekerId: string): Promise<boolean> {
    await this.ensureReady();
    const idx = this.requirements.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    if (this.requirements[idx].seekerId !== seekerId) {
      throw new AppError('You can only delete your own requirements.', 403, 'FORBIDDEN');
    }
    this.requirements.splice(idx, 1);
    return true;
  }

  async getLeadsForBroker(
    filters: LeadQueryFilters
  ): Promise<PaginatedResult<MatchedLeadItem>> {
    await this.ensureReady();
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 60);
    const offset = filters.cursor ? Math.max(Number.parseInt(filters.cursor, 10) || 0, 0) : 0;
    const brokerProps = this.properties.filter(
      (p) => p.brokerId === filters.brokerId && p.availability === 'available'
    );

    const matched: MatchedLeadItem[] = [];
    for (const req of this.requirements) {
      if (req.status !== 'active') continue;
      if (filters.intent && filters.intent !== 'All' && req.intent !== filters.intent) continue;
      if (
        filters.locality &&
        filters.locality !== 'All' &&
        !req.localities.includes(filters.locality)
      ) {
        continue;
      }
      if (
        filters.propertyType &&
        filters.propertyType !== 'All' &&
        req.propertyType !== filters.propertyType
      ) {
        continue;
      }
      if (filters.bedrooms !== undefined && filters.bedrooms !== 'All') {
        if (filters.bedrooms >= 4 ? req.bedrooms < 4 : req.bedrooms !== filters.bedrooms) {
          continue;
        }
      }
      if (filters.query?.trim()) {
        const q = filters.query.trim().toLowerCase();
        const hay = `${req.localities.join(' ')} ${req.notes} ${req.seekerName}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }

      const scoredProps = brokerProps
        .map((property) => ({
          property,
          match: computePropertyMatch(req, property),
        }))
        .sort((a, b) => b.match.score - a.match.score);

      const best = scoredProps[0] ?? null;
      if (filters.onlyMatchingMyInventory && (!best || best.match.score < 45)) {
        continue;
      }

      const existingProposal = this.proposals.find(
        (pr) => pr.requirementId === req.id && pr.brokerId === filters.brokerId
      );
      const contactShared = Boolean(existingProposal?.contactShared);
      const maskedReq: Requirement = {
        ...structuredClone(req),
        seekerPhone: contactShared ? req.seekerPhone : 'Locked until contact shared',
        seekerEmail: contactShared ? req.seekerEmail : 'Locked until contact shared',
      };

      matched.push({
        requirement: maskedReq,
        bestProperty: best ? structuredClone(best.property) : null,
        bestMatch: best ? best.match : null,
        alreadyProposed: Boolean(existingProposal),
      });
    }

    matched.sort(
      (a, b) =>
        (b.bestMatch?.score ?? 0) - (a.bestMatch?.score ?? 0) ||
        b.requirement.createdAt.localeCompare(a.requirement.createdAt)
    );

    const items = matched.slice(offset, offset + limit);
    const nextCursor = offset + limit < matched.length ? String(offset + limit) : null;
    return { items, nextCursor, total: matched.length };
  }

  async listProposalsForSeeker(
    seekerId: string,
    requirementId?: string
  ): Promise<Proposal[]> {
    await this.ensureReady();
    return this.proposals
      .filter((p) => p.seekerId === seekerId && (!requirementId || p.requirementId === requirementId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => structuredClone(p));
  }

  async listProposalsForBroker(brokerId: string): Promise<Proposal[]> {
    await this.ensureReady();
    return this.proposals
      .filter((p) => p.brokerId === brokerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => structuredClone(p));
  }

  async getProposalById(id: string): Promise<Proposal | null> {
    await this.ensureReady();
    const found = this.proposals.find((p) => p.id === id);
    return found ? structuredClone(found) : null;
  }

  async createProposal(broker: User, input: CreateProposalInput): Promise<Proposal> {
    await this.ensureReady();
    const req = this.requirements.find((r) => r.id === input.requirementId);
    if (!req) throw new AppError('Requirement not found', 404, 'NOT_FOUND');
    const prop = this.properties.find((p) => p.id === input.propertyId);
    if (!prop) throw new AppError('Property not found', 404, 'NOT_FOUND');
    if (prop.brokerId !== broker.id) {
      throw new AppError('You can only pitch your own property listings.', 403, 'FORBIDDEN');
    }

    const dup = this.proposals.find(
      (p) =>
        p.requirementId === input.requirementId &&
        p.propertyId === input.propertyId &&
        p.brokerId === broker.id
    );
    if (dup) {
      throw new AppError('You have already proposed this property for this brief.', 409, 'DUPLICATE_PROPOSAL');
    }

    const match = computePropertyMatch(req, prop);
    const created: Proposal = {
      id: makeId('prop_pitch'),
      requirementId: req.id,
      propertyId: prop.id,
      brokerId: broker.id,
      seekerId: req.seekerId,
      proposedPrice: input.proposedPrice,
      brokerageCharge: input.brokerageCharge,
      message: input.message,
      whyMatches: input.whyMatches,
      availabilityConfirmed: input.availabilityConfirmed ?? true,
      contactShared: false,
      status: 'pending',
      statusDetail: 'Sent',
      matchScore: match.score,
      matchReasons: match.reasons,
      isDemo: false,
      createdAt: new Date().toISOString(),
    };
    this.proposals.unshift(created);
    return structuredClone(created);
  }

  async updateProposal(
    id: string,
    actor: User,
    updates: UpdateProposalInput
  ): Promise<Proposal | null> {
    await this.ensureReady();
    const existing = this.proposals.find((p) => p.id === id);
    if (!existing) return null;
    if (existing.seekerId !== actor.id && existing.brokerId !== actor.id) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }
    if (updates.status !== undefined) existing.status = updates.status;
    if (updates.statusDetail !== undefined) existing.statusDetail = updates.statusDetail;
    if (updates.contactShared !== undefined) existing.contactShared = updates.contactShared;
    if (updates.markViewed) existing.viewedAt = existing.viewedAt ?? new Date().toISOString();
    return structuredClone(existing);
  }

  async listVisitsForUser(userId: string, role: UserRole): Promise<Visit[]> {
    await this.ensureReady();
    return this.visits
      .filter((v) => (role === 'broker' ? v.brokerId === userId : v.seekerId === userId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((v) => structuredClone(v));
  }

  async createVisit(seeker: User, input: CreateVisitInput): Promise<Visit> {
    await this.ensureReady();
    const prop = this.properties.find((p) => p.id === input.propertyId);
    if (!prop) throw new AppError('Property not found', 404, 'NOT_FOUND');
    const created: Visit = {
      id: makeId('visit'),
      propertyId: prop.id,
      proposalId: input.proposalId,
      seekerId: seeker.id,
      seekerName: seeker.name,
      brokerId: prop.brokerId,
      date: input.date,
      timeSlot: input.timeSlot,
      notes: input.notes,
      status: 'requested',
      createdAt: new Date().toISOString(),
    };
    this.visits.unshift(created);
    return structuredClone(created);
  }

  async updateVisitStatus(
    visitId: string,
    actor: User,
    status: VisitStatus
  ): Promise<Visit | null> {
    await this.ensureReady();
    const existing = this.visits.find((v) => v.id === visitId);
    if (!existing) return null;
    if (existing.seekerId !== actor.id && existing.brokerId !== actor.id) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }
    existing.status = status;
    return structuredClone(existing);
  }

  async listMessagesForProperty(
    propertyId: string,
    viewerId?: string
  ): Promise<Message[]> {
    await this.ensureReady();
    return this.messages
      .filter(
        (m) =>
          m.propertyId === propertyId &&
          (!viewerId || m.senderId === viewerId || m.recipientId === viewerId)
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((m) => structuredClone(m));
  }

  async listMessagesForUser(userId: string): Promise<Message[]> {
    await this.ensureReady();
    return this.messages
      .filter((m) => m.senderId === userId || m.recipientId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((m) => structuredClone(m));
  }

  async createMessage(sender: User, input: CreateMessageInput): Promise<Message> {
    await this.ensureReady();
    const created: Message = {
      id: makeId('msg'),
      proposalId: input.proposalId,
      propertyId: input.propertyId,
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      recipientId: input.recipientId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    this.messages.push(created);
    return structuredClone(created);
  }

  async getSavedPropertyIds(userId: string): Promise<string[]> {
    await this.ensureReady();
    const prefix = `${userId}::`;
    return Array.from(this.saved)
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length));
  }

  async listSavedProperties(userId: string): Promise<Property[]> {
    await this.ensureReady();
    const ids = new Set(await this.getSavedPropertyIds(userId));
    return this.properties
      .filter((p) => ids.has(p.id))
      .map((p) => structuredClone(p));
  }

  async toggleSavedProperty(userId: string, propertyId: string): Promise<string[]> {
    await this.ensureReady();
    const key = `${userId}::${propertyId}`;
    if (this.saved.has(key)) {
      this.saved.delete(key);
    } else {
      this.saved.add(key);
    }
    return this.getSavedPropertyIds(userId);
  }

  async listNotificationsForUser(userId: string): Promise<AppNotification[]> {
    await this.ensureReady();
    return this.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((n) => structuredClone(n));
  }

  async markNotificationsRead(userId: string, notificationId?: string): Promise<void> {
    await this.ensureReady();
    for (const n of this.notifications) {
      if (n.userId === userId && (!notificationId || n.id === notificationId)) {
        n.read = true;
      }
    }
  }

  async listReviewsForBroker(brokerId: string): Promise<BrokerReview[]> {
    await this.ensureReady();
    return this.reviews
      .filter((r) => r.brokerId === brokerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => structuredClone(r));
  }

  async createReview(author: User, input: CreateReviewInput): Promise<BrokerReview> {
    await this.ensureReady();
    const created: BrokerReview = {
      id: makeId('rev'),
      brokerId: input.brokerId,
      authorId: author.id,
      authorName: author.name,
      rating: input.rating,
      comment: input.comment,
      locality: input.locality,
      createdAt: new Date().toISOString(),
    };
    this.reviews.unshift(created);
    return structuredClone(created);
  }
}
