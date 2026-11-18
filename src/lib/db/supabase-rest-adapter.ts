import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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
import {
  mapSupabaseMessage,
  mapSupabaseNotification,
  mapSupabaseProperty,
  mapSupabaseProposal,
  mapSupabaseRequirement,
  mapSupabaseReview,
  mapSupabaseUser,
  mapSupabaseVisit,
} from './supabase-mappers';
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

function sanitizePostgrestSearch(raw: string): string {
  return raw.replace(/[,%()\\]/g, ' ').trim();
}

export class SupabaseSchemaMissingError extends Error {
  readonly code = 'SUPABASE_SCHEMA_MISSING';
  constructor(message = 'Supabase tables are not initialized yet (run supabase/migrations/001_initial_schema.sql).') {
    super(message);
    this.name = 'SupabaseSchemaMissingError';
  }
}

export class SupabaseRestDbAdapter implements DbAdapter {
  private readonly sb: SupabaseClient;
  private readyPromise: Promise<void> | null = null;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.sb = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async probeSchema(): Promise<boolean> {
    const { error } = await this.sb.from('users').select('id').limit(1);
    if (!error) return true;
    if (error.code === 'PGRST205' || error.code === '42P01') {
      return false;
    }
    throw new Error(`Supabase probe failed: ${error.message}`);
  }

  private async ensureReady(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise = this.seedIfEmpty().catch((err) => {
        this.readyPromise = null;
        throw err;
      });
    }
    return this.readyPromise;
  }

  private async seedIfEmpty(): Promise<void> {
    const { data, error } = await this.sb.from('users').select('id').limit(1);

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        throw new SupabaseSchemaMissingError();
      }
      throw new Error(`Supabase readiness check failed: ${error.message}`);
    }

    if ((data?.length ?? 0) > 0) return;

    const demoHash = await hashPassword('housed123');
    const seed = createSeedPayload(demoHash);

    const userRows = seed.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      city: u.city,
      avatar_url: u.avatarUrl ?? null,
      auth_method: u.authMethod ?? 'password',
      password_hash: u.passwordHash ?? null,
      is_demo: Boolean(u.isDemo),
    }));

    const { error: uErr } = await this.sb
      .from('users')
      .upsert(userRows, { onConflict: 'id', ignoreDuplicates: true });
    if (uErr) throw new Error(`Supabase seed users failed: ${uErr.message}`);

    const bpRows = seed.users
      .filter((u) => u.brokerProfile)
      .map((u) => {
        const bp = u.brokerProfile!;
        return {
          user_id: u.id,
          is_independent: Boolean(bp.isIndependent),
          agency_name: bp.agencyName ?? '',
          agency_address: bp.agencyAddress ?? '',
          phone: bp.phone,
          operating_localities: bp.operatingLocalities,
          property_categories: bp.propertyCategories,
          specializations: bp.specializations ?? [],
          years_experience: bp.yearsExperience,
          properties_managed_count: bp.propertiesManagedCount ?? 0,
          website: bp.website ?? null,
          rera_id: bp.reraId ?? null,
          avatar_url: bp.avatarUrl ?? null,
          verification_status:
            bp.verificationStatus ?? (bp.verified ? 'verified' : 'pending'),
          verified: Boolean(bp.verified),
          bio: bp.bio ?? '',
          closed_deals_count: bp.closedDealsCount,
          verification_docs: bp.verificationDocs ?? null,
        };
      });

    if (bpRows.length > 0) {
      const { error: bpErr } = await this.sb
        .from('broker_profiles')
        .upsert(bpRows, { onConflict: 'user_id', ignoreDuplicates: true });
      if (bpErr) throw new Error(`Supabase seed broker_profiles failed: ${bpErr.message}`);
    }

    const propRows = seed.properties.map((p) => ({
      id: p.id,
      broker_id: p.brokerId,
      broker_name: p.brokerName,
      broker_agency: p.brokerAgency ?? null,
      broker_phone: p.brokerPhone,
      broker_verified: p.brokerVerified,
      title: p.title,
      intent: p.intent,
      transaction_type: p.transactionType ?? null,
      listing_category: p.listingCategory ?? null,
      locality: p.locality,
      city: p.city ?? 'Bengaluru',
      pincode: p.pincode ?? null,
      landmark: p.landmark ?? null,
      address: p.address,
      price: p.price,
      security_deposit: p.securityDeposit ?? null,
      maintenance_charges: p.maintenanceCharges ?? null,
      price_per_sqft: p.pricePerSqFt ?? null,
      brokerage_amount: p.brokerageAmount ?? null,
      brokerage_type: p.brokerageType ?? null,
      deposit_or_maintenance: p.depositOrMaintenance ?? null,
      brokerage_fee: p.brokerageFee,
      property_type: p.propertyType,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      area_sqft: p.areaSqFt,
      carpet_area_sqft: p.carpetAreaSqFt ?? null,
      built_up_area_sqft: p.builtUpAreaSqFt ?? null,
      floor_info: p.floorInfo,
      floor_number: p.floorNumber ?? null,
      total_floors: p.totalFloors ?? null,
      furnishing: p.furnishing,
      parking: p.parking ?? null,
      balconies: p.balconies ?? null,
      property_age: p.propertyAge ?? null,
      available_from: p.availableFrom,
      amenities: p.amenities,
      description: p.description,
      additional_info: p.additionalInfo ?? null,
      selling_points: p.sellingPoints ?? [],
      video_tour_url: p.videoTourUrl ?? null,
      images: p.images,
      availability: p.availability,
      is_demo: Boolean(p.isDemo),
      map_x: p.mapX,
      map_y: p.mapY,
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      created_at: p.createdAt,
    }));

    const { error: pErr } = await this.sb
      .from('properties')
      .upsert(propRows, { onConflict: 'id', ignoreDuplicates: true });
    if (pErr) throw new Error(`Supabase seed properties failed: ${pErr.message}`);

    const reqRows = seed.requirements.map((r) => ({
      id: r.id,
      seeker_id: r.seekerId,
      seeker_name: r.seekerName,
      seeker_phone: r.seekerPhone,
      seeker_email: r.seekerEmail,
      intent: r.intent,
      localities: r.localities,
      budget_min: r.budgetMin,
      budget_max: r.budgetMax,
      property_type: r.propertyType,
      bedrooms: r.bedrooms,
      furnishing: r.furnishing,
      move_in_date: r.moveInDate,
      amenities: r.amenities,
      notes: r.notes,
      status: r.status,
      is_demo: Boolean(r.isDemo),
      created_at: r.createdAt,
    }));

    const { error: rErr } = await this.sb
      .from('requirements')
      .upsert(reqRows, { onConflict: 'id', ignoreDuplicates: true });
    if (rErr) throw new Error(`Supabase seed requirements failed: ${rErr.message}`);

    const proposalRows = seed.proposals.map((pr) => ({
      id: pr.id,
      requirement_id: pr.requirementId,
      property_id: pr.propertyId,
      broker_id: pr.brokerId,
      seeker_id: pr.seekerId,
      proposed_price: pr.proposedPrice,
      brokerage_charge: pr.brokerageCharge,
      message: pr.message,
      why_matches: pr.whyMatches ?? null,
      availability_confirmed: pr.availabilityConfirmed !== false,
      contact_shared: Boolean(pr.contactShared),
      status: pr.status,
      status_detail: pr.statusDetail ?? 'Sent',
      viewed_at: pr.viewedAt ?? null,
      match_score: pr.matchScore,
      match_reasons: pr.matchReasons,
      is_demo: Boolean(pr.isDemo),
      created_at: pr.createdAt,
    }));

    const { error: prErr } = await this.sb
      .from('proposals')
      .upsert(proposalRows, { onConflict: 'id', ignoreDuplicates: true });
    if (prErr) throw new Error(`Supabase seed proposals failed: ${prErr.message}`);

    if (seed.visits.length > 0) {
      await this.sb.from('visits').upsert(
        seed.visits.map((v) => ({
          id: v.id,
          property_id: v.propertyId,
          proposal_id: v.proposalId ?? null,
          seeker_id: v.seekerId,
          seeker_name: v.seekerName,
          broker_id: v.brokerId,
          date: v.date,
          time_slot: v.timeSlot,
          notes: v.notes ?? null,
          status: v.status,
          created_at: v.createdAt,
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      );
    }

    if (seed.messages.length > 0) {
      await this.sb.from('messages').upsert(
        seed.messages.map((m) => ({
          id: m.id,
          proposal_id: m.proposalId ?? null,
          property_id: m.propertyId,
          sender_id: m.senderId,
          sender_name: m.senderName,
          sender_role: m.senderRole,
          recipient_id: m.recipientId,
          body: m.body,
          created_at: m.createdAt,
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      );
    }

    if (seed.notifications.length > 0) {
      await this.sb.from('notifications').upsert(
        seed.notifications.map((n) => ({
          id: n.id,
          user_id: n.userId,
          type: n.type,
          title: n.title,
          body: n.body,
          related_id: n.relatedId ?? null,
          read: n.read,
          created_at: n.createdAt,
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      );
    }

    if (seed.reviews.length > 0) {
      await this.sb.from('broker_reviews').upsert(
        seed.reviews.map((rv) => ({
          id: rv.id,
          broker_id: rv.brokerId,
          author_id: rv.authorId,
          author_name: rv.authorName,
          rating: rv.rating,
          comment: rv.comment,
          locality: rv.locality ?? null,
          created_at: rv.createdAt,
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      );
    }

    if (seed.savedPairs.length > 0) {
      await this.sb.from('saved_properties').upsert(
        seed.savedPairs.map((pair) => ({
          user_id: pair.userId,
          property_id: pair.propertyId,
        })),
        { onConflict: 'user_id,property_id', ignoreDuplicates: true }
      );
    }
  }

  private async attachBrokerProfiles(
    users: Record<string, unknown>[]
  ): Promise<StoredUser[]> {
    const brokerIds = users
      .filter((u) => u.role === 'broker')
      .map((u) => u.id as string);
    const profileMap = new Map<string, Record<string, unknown>>();
    if (brokerIds.length > 0) {
      const { data: profiles } = await this.sb
        .from('broker_profiles')
        .select('*')
        .in('user_id', brokerIds);
      for (const bp of profiles ?? []) {
        profileMap.set(bp.user_id as string, bp as Record<string, unknown>);
      }
    }
    return users.map((u) =>
      mapSupabaseUser(u, profileMap.get(u.id as string))
    );
  }

  async getUserById(id: string): Promise<StoredUser | null> {
    await this.ensureReady();
    const { data, error } = await this.sb
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    const bp =
      data.role === 'broker'
        ? (
            await this.sb
              .from('broker_profiles')
              .select('*')
              .eq('user_id', id)
              .maybeSingle()
          ).data ?? undefined
        : undefined;
    return mapSupabaseUser(
      data as Record<string, unknown>,
      bp as Record<string, unknown> | undefined
    );
  }

  async getUserByEmail(email: string): Promise<StoredUser | null> {
    await this.ensureReady();
    const { data, error } = await this.sb
      .from('users')
      .select('*')
      .ilike('email', email.trim())
      .maybeSingle();
    if (error || !data) return null;
    const bp =
      data.role === 'broker'
        ? (
            await this.sb
              .from('broker_profiles')
              .select('*')
              .eq('user_id', data.id)
              .maybeSingle()
          ).data ?? undefined
        : undefined;
    return mapSupabaseUser(
      data as Record<string, unknown>,
      bp as Record<string, unknown> | undefined
    );
  }

  async listDemoUsers(): Promise<User[]> {
    await this.ensureReady();
    const { data, error } = await this.sb
      .from('users')
      .select('*')
      .eq('is_demo', true)
      .order('role', { ascending: false })
      .order('name', { ascending: true });
    if (error || !data) return [];
    const hydrated = await this.attachBrokerProfiles(
      data as Record<string, unknown>[]
    );
    return hydrated.map(sanitizeUser);
  }

  async listPublicBrokers(): Promise<User[]> {
    await this.ensureReady();
    const { data, error } = await this.sb
      .from('users')
      .select('*')
      .eq('role', 'broker')
      .order('name', { ascending: true });
    if (error || !data) return [];
    const hydrated = await this.attachBrokerProfiles(
      data as Record<string, unknown>[]
    );
    return hydrated.map(sanitizeUser);
  }

  async createUser(
    input: RegisterInput & { passwordHash?: string | null }
  ): Promise<User> {
    await this.ensureReady();
    const existing = await this.getUserByEmail(input.email);
    if (existing) {
      throw new AppError(
        'An account with this email already exists',
        409,
        'EMAIL_EXISTS'
      );
    }

    const id = makeId(input.role);
    const now = new Date().toISOString();

    const { error: uErr } = await this.sb.from('users').insert({
      id,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      role: input.role,
      city: input.city?.trim() || 'Bengaluru',
      avatar_url: input.avatarUrl ?? input.brokerProfile?.avatarUrl ?? null,
      auth_method: input.authMethod ?? 'password',
      password_hash: input.passwordHash ?? null,
      is_demo: false,
    });
    if (uErr) {
      if (uErr.code === '23505') {
        throw new AppError(
          'An account with this email already exists',
          409,
          'EMAIL_EXISTS'
        );
      }
      throw new AppError(uErr.message, 500, 'INTERNAL_ERROR');
    }

    if (input.role === 'broker') {
      const bp = input.brokerProfile;
      const docs = bp?.verificationDocs
        ? { ...bp.verificationDocs, submittedAt: now }
        : null;
      const { error: bpErr } = await this.sb.from('broker_profiles').insert({
        user_id: id,
        is_independent: Boolean(bp?.isIndependent ?? !bp?.agencyName?.trim()),
        agency_name: bp?.agencyName?.trim() || '',
        agency_address: bp?.agencyAddress?.trim() || '',
        phone: bp?.phone?.trim() || input.phone.trim(),
        operating_localities: bp?.operatingLocalities?.length
          ? bp.operatingLocalities
          : ['Koramangala'],
        property_categories: bp?.propertyCategories?.length
          ? bp.propertyCategories
          : ['Flat', 'House'],
        specializations: bp?.specializations ?? ['Residential rentals'],
        years_experience: bp?.yearsExperience ?? 1,
        properties_managed_count: bp?.propertiesManagedCount ?? 0,
        website: bp?.website?.trim() || null,
        rera_id: bp?.reraId?.trim() || null,
        avatar_url: input.avatarUrl ?? bp?.avatarUrl ?? null,
        verification_status: 'pending',
        verified: false,
        bio: bp?.bio?.trim() || '',
        closed_deals_count: 0,
        verification_docs: docs,
      });
      if (bpErr) {
        await this.sb.from('users').delete().eq('id', id);
        throw new AppError(bpErr.message, 500, 'INTERNAL_ERROR');
      }
    }

    const created = await this.getUserById(id);
    if (!created) {
      throw new AppError('Failed to create user', 500, 'INTERNAL_ERROR');
    }
    return sanitizeUser(created);
  }

  async updateUserProfile(
    userId: string,
    updates: UpdateProfileInput
  ): Promise<User | null> {
    await this.ensureReady();
    const existing = await this.getUserById(userId);
    if (!existing) return null;

    const nextName = updates.name?.trim() || existing.name;
    const nextPhone = updates.phone?.trim() || existing.phone;
    const nextCity = updates.city?.trim() || existing.city;
    const nextAvatar =
      updates.avatarUrl ??
      updates.brokerProfile?.avatarUrl ??
      existing.avatarUrl ??
      null;

    await this.sb
      .from('users')
      .update({
        name: nextName,
        phone: nextPhone,
        city: nextCity,
        avatar_url: nextAvatar,
      })
      .eq('id', userId);

    if (existing.role === 'broker' && updates.brokerProfile) {
      const prevBp = existing.brokerProfile;
      const bp = updates.brokerProfile;
      const nextAgency =
        bp.agencyName !== undefined
          ? bp.agencyName.trim()
          : (prevBp?.agencyName ?? '');
      const nextBrokerPhone = bp.phone?.trim() || prevBp?.phone || nextPhone;
      const nextDocs = bp.verificationDocs
        ? {
            ...(prevBp?.verificationDocs || {}),
            ...bp.verificationDocs,
            submittedAt:
              prevBp?.verificationDocs?.submittedAt || new Date().toISOString(),
          }
        : (prevBp?.verificationDocs ?? null);

      await this.sb
        .from('broker_profiles')
        .update({
          is_independent: Boolean(
            bp.isIndependent ?? prevBp?.isIndependent ?? !nextAgency
          ),
          agency_name: nextAgency,
          agency_address:
            bp.agencyAddress !== undefined
              ? bp.agencyAddress.trim()
              : (prevBp?.agencyAddress ?? ''),
          phone: nextBrokerPhone,
          operating_localities:
            bp.operatingLocalities ??
            prevBp?.operatingLocalities ??
            ['Koramangala'],
          property_categories:
            bp.propertyCategories ?? prevBp?.propertyCategories ?? ['Flat'],
          specializations: bp.specializations ?? prevBp?.specializations ?? [],
          years_experience: bp.yearsExperience ?? prevBp?.yearsExperience ?? 1,
          properties_managed_count:
            bp.propertiesManagedCount ?? prevBp?.propertiesManagedCount ?? 0,
          website:
            bp.website !== undefined
              ? bp.website.trim() || null
              : (prevBp?.website ?? null),
          rera_id:
            bp.reraId !== undefined
              ? bp.reraId.trim() || null
              : (prevBp?.reraId ?? null),
          avatar_url: nextAvatar,
          bio: bp.bio !== undefined ? bp.bio.trim() : (prevBp?.bio ?? ''),
          verification_docs: nextDocs,
        })
        .eq('user_id', userId);

      await this.sb
        .from('properties')
        .update({
          broker_name: nextName,
          broker_agency: nextAgency || null,
          broker_phone: nextBrokerPhone,
        })
        .eq('broker_id', userId);
    }

    const refreshed = await this.getUserById(userId);
    return refreshed ? sanitizeUser(refreshed) : null;
  }

  async createSession(
    userId: string,
    expiresAtIso: string
  ): Promise<SessionRecord> {
    await this.ensureReady();
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const { error } = await this.sb.from('sessions').insert({
      id,
      user_id: userId,
      expires_at: expiresAtIso,
      created_at: createdAt,
    });
    if (error) {
      throw new AppError(error.message, 500, 'INTERNAL_ERROR');
    }
    return { id, userId, expiresAt: expiresAtIso, createdAt };
  }

  async getSession(sessionId: string): Promise<SessionRecord | null> {
    await this.ensureReady();
    const { data, error } = await this.sb
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();
    if (error || !data) return null;
    const expiresAt = new Date(data.expires_at as string).toISOString();
    if (new Date(expiresAt).getTime() <= Date.now()) {
      await this.sb.from('sessions').delete().eq('id', sessionId);
      return null;
    }
    return {
      id: data.id as string,
      userId: data.user_id as string,
      expiresAt,
      createdAt: new Date(data.created_at as string).toISOString(),
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.ensureReady();
    await this.sb.from('sessions').delete().eq('id', sessionId);
  }

  async listProperties(
    filters: PropertyQueryFilters = {}
  ): Promise<PaginatedResult<Property>> {
    await this.ensureReady();
    let q = this.sb.from('properties').select('*', { count: 'exact' });

    if (!filters.includeUnavailable) q = q.eq('availability', 'available');
    if (filters.brokerId) q = q.eq('broker_id', filters.brokerId);
    if (filters.intent) q = q.eq('intent', filters.intent);
    if (filters.locality && filters.locality !== 'All') {
      q = q.ilike('locality', filters.locality);
    }
    if (filters.propertyType && filters.propertyType !== 'All') {
      q = q.eq('property_type', filters.propertyType);
    }
    if (filters.bedrooms && filters.bedrooms !== 'All') {
      if (filters.bedrooms >= 4) q = q.gte('bedrooms', 4);
      else q = q.eq('bedrooms', filters.bedrooms);
    }
    if (filters.budgetMax && filters.budgetMax > 0) {
      q = q.lte('price', filters.budgetMax);
    }
    if (filters.furnishing && filters.furnishing !== 'Any') {
      q = q.eq('furnishing', filters.furnishing);
    }
    if (filters.query && filters.query.trim()) {
      const term = sanitizePostgrestSearch(filters.query);
      if (term) {
        q = q.or(
          `title.ilike.%${term}%,locality.ilike.%${term}%,address.ilike.%${term}%,description.ilike.%${term}%`
        );
      }
    }

    const limit = Math.min(50, Math.max(1, filters.limit ?? 24));
    const offset = filters.cursor
      ? Math.max(0, Number.parseInt(filters.cursor, 10) || 0)
      : 0;

    const { data, count, error } = await q
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit);

    if (error || !data) {
      throw new AppError(
        error?.message || 'Failed to load properties',
        500,
        'INTERNAL_ERROR'
      );
    }

    const hasMore = data.length > limit;
    const sliced = hasMore ? data.slice(0, limit) : data;
    return {
      items: sliced.map((r) => mapSupabaseProperty(r as Record<string, unknown>)),
      nextCursor: hasMore ? String(offset + limit) : null,
      total: count ?? sliced.length,
    };
  }

  async getPropertyById(id: string): Promise<Property | null> {
    await this.ensureReady();
    const { data, error } = await this.sb
      .from('properties')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return mapSupabaseProperty(data as Record<string, unknown>);
  }

  async createProperty(
    broker: User,
    input: CreatePropertyInput
  ): Promise<Property> {
    await this.ensureReady();
    if (broker.role !== 'broker') {
      throw new AppError(
        'Only registered brokers can list properties.',
        403,
        'FORBIDDEN'
      );
    }

    const id = makeId('prop');
    const intent =
      input.intent ??
      (input.transactionType
        ? mapTransactionToIntent(input.transactionType)
        : 'rent');
    const propertyType =
      input.propertyType ??
      (input.listingCategory
        ? mapDetailedCategoryToBase(input.listingCategory)
        : 'Flat');
    const coords = LOCALITY_COORDS[input.locality];
    const brokerVerified = broker.brokerProfile?.verificationStatus === 'verified';

    const { error } = await this.sb.from('properties').insert({
      id,
      broker_id: broker.id,
      broker_name: broker.name,
      broker_agency: broker.brokerProfile?.agencyName || null,
      broker_phone: broker.brokerProfile?.phone || broker.phone,
      broker_verified: brokerVerified,
      title: input.title.trim(),
      intent,
      transaction_type:
        input.transactionType ?? (intent === 'buy' ? 'For Sale' : 'For Rent'),
      listing_category: input.listingCategory ?? null,
      locality: input.locality,
      city: input.city ?? broker.city ?? 'Bengaluru',
      pincode: input.pincode ?? null,
      landmark: input.landmark ?? null,
      address: input.address.trim(),
      price: input.price,
      security_deposit: input.securityDeposit ?? null,
      maintenance_charges: input.maintenanceCharges ?? null,
      price_per_sqft: input.pricePerSqFt ?? null,
      brokerage_amount: input.brokerageAmount ?? null,
      brokerage_type: input.brokerageType ?? null,
      deposit_or_maintenance: input.depositOrMaintenance ?? null,
      brokerage_fee: input.brokerageFee,
      property_type: propertyType,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      area_sqft: input.areaSqFt,
      carpet_area_sqft: input.carpetAreaSqFt ?? null,
      built_up_area_sqft: input.builtUpAreaSqFt ?? null,
      floor_info: input.floorInfo,
      floor_number: input.floorNumber ?? null,
      total_floors: input.totalFloors ?? null,
      furnishing: input.furnishing,
      parking: input.parking ?? null,
      balconies: input.balconies ?? null,
      property_age: input.propertyAge ?? null,
      available_from: input.availableFrom,
      amenities: input.amenities ?? [],
      description: input.description,
      additional_info: input.additionalInfo ?? null,
      selling_points: input.sellingPoints ?? [],
      video_tour_url: input.videoTourUrl ?? null,
      images: input.images,
      availability: input.availability ?? 'available',
      is_demo: false,
      map_x: input.mapX ?? 50,
      map_y: input.mapY ?? 50,
      lat: input.lat ?? coords?.lat ?? null,
      lng: input.lng ?? coords?.lng ?? null,
    });

    if (error) {
      throw new AppError(error.message, 500, 'INTERNAL_ERROR');
    }

    const created = await this.getPropertyById(id);
    if (!created) {
      throw new AppError('Failed to create property', 500, 'INTERNAL_ERROR');
    }
    return created;
  }

  async updateProperty(
    id: string,
    brokerId: string,
    updates: UpdatePropertyInput
  ): Promise<Property | null> {
    await this.ensureReady();
    const existing = await this.getPropertyById(id);
    if (!existing) return null;
    if (existing.brokerId !== brokerId) {
      throw new AppError(
        'Brokers can only edit their own properties.',
        403,
        'FORBIDDEN'
      );
    }

    const merged: Property = {
      ...existing,
      ...updates,
      amenities: updates.amenities ?? existing.amenities,
      sellingPoints: updates.sellingPoints ?? existing.sellingPoints,
      images: updates.images ?? existing.images,
    };

    const { error } = await this.sb
      .from('properties')
      .update({
        title: merged.title,
        intent: merged.intent,
        transaction_type: merged.transactionType ?? null,
        listing_category: merged.listingCategory ?? null,
        locality: merged.locality,
        city: merged.city ?? 'Bengaluru',
        pincode: merged.pincode ?? null,
        landmark: merged.landmark ?? null,
        address: merged.address,
        price: merged.price,
        security_deposit: merged.securityDeposit ?? null,
        maintenance_charges: merged.maintenanceCharges ?? null,
        price_per_sqft: merged.pricePerSqFt ?? null,
        brokerage_amount: merged.brokerageAmount ?? null,
        brokerage_type: merged.brokerageType ?? null,
        deposit_or_maintenance: merged.depositOrMaintenance ?? null,
        brokerage_fee: merged.brokerageFee,
        property_type: merged.propertyType,
        bedrooms: merged.bedrooms,
        bathrooms: merged.bathrooms,
        area_sqft: merged.areaSqFt,
        carpet_area_sqft: merged.carpetAreaSqFt ?? null,
        built_up_area_sqft: merged.builtUpAreaSqFt ?? null,
        floor_info: merged.floorInfo,
        floor_number: merged.floorNumber ?? null,
        total_floors: merged.totalFloors ?? null,
        furnishing: merged.furnishing,
        parking: merged.parking ?? null,
        balconies: merged.balconies ?? null,
        property_age: merged.propertyAge ?? null,
        available_from: merged.availableFrom,
        amenities: merged.amenities,
        description: merged.description,
        additional_info: merged.additionalInfo ?? null,
        selling_points: merged.sellingPoints ?? [],
        video_tour_url: merged.videoTourUrl ?? null,
        images: merged.images,
        availability: merged.availability,
        map_x: merged.mapX,
        map_y: merged.mapY,
      })
      .eq('id', id);

    if (error) {
      throw new AppError(error.message, 500, 'INTERNAL_ERROR');
    }

    return this.getPropertyById(id);
  }

  async deleteProperty(id: string, brokerId: string): Promise<boolean> {
    await this.ensureReady();
    const existing = await this.getPropertyById(id);
    if (!existing) return false;
    if (existing.brokerId !== brokerId) {
      throw new AppError(
        'Brokers can only remove their own properties.',
        403,
        'FORBIDDEN'
      );
    }
    const { error } = await this.sb.from('properties').delete().eq('id', id);
    if (error) throw new AppError(error.message, 500, 'INTERNAL_ERROR');
    return true;
  }

  async listRequirementsBySeeker(seekerId: string): Promise<Requirement[]> {
    await this.ensureReady();
    const { data, error } = await this.sb
      .from('requirements')
      .select('*')
      .eq('seeker_id', seekerId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((r) => mapSupabaseRequirement(r as Record<string, unknown>));
  }

  async getRequirementById(id: string): Promise<Requirement | null> {
    await this.ensureReady();
    const { data, error } = await this.sb
      .from('requirements')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return mapSupabaseRequirement(data as Record<string, unknown>);
  }

  async createRequirement(
    seeker: User,
    input: CreateRequirementInput
  ): Promise<Requirement> {
    await this.ensureReady();
    if (seeker.role !== 'seeker') {
      throw new AppError(
        'Only home seekers can post property requirements.',
        403,
        'FORBIDDEN'
      );
    }
    const id = makeId('req');
    const { error } = await this.sb.from('requirements').insert({
      id,
      seeker_id: seeker.id,
      seeker_name: input.seekerName?.trim() || seeker.name,
      seeker_phone: input.seekerPhone?.trim() || seeker.phone,
      seeker_email: input.seekerEmail?.trim() || seeker.email,
      intent: input.intent,
      localities: input.localities,
      budget_min: input.budgetMin,
      budget_max: input.budgetMax,
      property_type: input.propertyType,
      bedrooms: input.bedrooms,
      furnishing: input.furnishing,
      move_in_date: input.moveInDate,
      amenities: input.amenities,
      notes: input.notes,
      status: 'active',
      is_demo: false,
    });
    if (error) {
      throw new AppError(error.message, 500, 'INTERNAL_ERROR');
    }

    const { data: brokers } = await this.sb
      .from('users')
      .select('id')
      .eq('role', 'broker');
    if (brokers && brokers.length > 0) {
      const { data: bps } = await this.sb
        .from('broker_profiles')
        .select('user_id, operating_localities')
        .in(
          'user_id',
          brokers.map((b) => b.id as string)
        );
      const areaMap = new Map<string, string[]>();
      for (const bp of bps ?? []) {
        areaMap.set(
          bp.user_id as string,
          (bp.operating_localities as string[]) ?? []
        );
      }
      const notifs = brokers
        .filter((b) => {
          const areas = areaMap.get(b.id as string) ?? [];
          return (
            areas.length === 0 ||
            input.localities.some((loc) =>
              areas.some((a) => a.toLowerCase() === loc.toLowerCase())
            )
          );
        })
        .map((b) => ({
          id: makeId('notif'),
          user_id: b.id as string,
          type: 'matching_requirement',
          title: `New ${input.bedrooms} BHK ${input.propertyType} lead in ${input.localities[0]}`,
          body: `Customer looking to ${input.intent} · Move-in ${input.moveInDate}`,
          related_id: id,
        }));
      if (notifs.length > 0) {
        await this.sb.from('notifications').insert(notifs);
      }
    }

    const created = await this.getRequirementById(id);
    if (!created) {
      throw new AppError('Failed to create requirement', 500, 'INTERNAL_ERROR');
    }
    return created;
  }

  async updateRequirement(
    id: string,
    seekerId: string,
    updates: UpdateRequirementInput
  ): Promise<Requirement | null> {
    await this.ensureReady();
    const existing = await this.getRequirementById(id);
    if (!existing) return null;
    if (existing.seekerId !== seekerId) {
      throw new AppError(
        'Only the requirement owner can update this brief.',
        403,
        'FORBIDDEN'
      );
    }
    const next = {
      ...existing,
      ...updates,
      localities: updates.localities ?? existing.localities,
      amenities: updates.amenities ?? existing.amenities,
    };
    const { error } = await this.sb
      .from('requirements')
      .update({
        status: next.status,
        localities: next.localities,
        budget_min: next.budgetMin,
        budget_max: next.budgetMax,
        furnishing: next.furnishing,
        move_in_date: next.moveInDate,
        amenities: next.amenities,
        notes: next.notes,
      })
      .eq('id', id);
    if (error) throw new AppError(error.message, 500, 'INTERNAL_ERROR');
    return this.getRequirementById(id);
  }

  async deleteRequirement(id: string, seekerId: string): Promise<boolean> {
    await this.ensureReady();
    const existing = await this.getRequirementById(id);
    if (!existing) return false;
    if (existing.seekerId !== seekerId) {
      throw new AppError(
        'Only the requirement owner can delete this brief.',
        403,
        'FORBIDDEN'
      );
    }
    const { error } = await this.sb.from('requirements').delete().eq('id', id);
    if (error) throw new AppError(error.message, 500, 'INTERNAL_ERROR');
    return true;
  }

  async getLeadsForBroker(
    filters: LeadQueryFilters
  ): Promise<PaginatedResult<MatchedLeadItem>> {
    await this.ensureReady();
    const [reqRes, invRes, propRes] = await Promise.all([
      this.sb
        .from('requirements')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      this.sb
        .from('properties')
        .select('*')
        .eq('broker_id', filters.brokerId)
        .eq('availability', 'available'),
      this.sb
        .from('proposals')
        .select('requirement_id, contact_shared, status')
        .eq('broker_id', filters.brokerId),
    ]);

    const inventory = (invRes.data ?? []).map((r) =>
      mapSupabaseProperty(r as Record<string, unknown>)
    );
    const proposals = propRes.data ?? [];
    const proposedSet = new Set(
      proposals.map((p) => p.requirement_id as string)
    );
    const consentSet = new Set(
      proposals
        .filter((p) => Boolean(p.contact_shared) || p.status === 'accepted')
        .map((p) => p.requirement_id as string)
    );

    let items: MatchedLeadItem[] = (reqRes.data ?? [])
      .map((r) => mapSupabaseRequirement(r as Record<string, unknown>))
      .map((req) =>
        consentSet.has(req.id) || req.seekerId === filters.brokerId
          ? req
          : { ...req, seekerPhone: '', seekerEmail: '' }
      )
      .filter((req) => {
        if (filters.intent && filters.intent !== 'All' && req.intent !== filters.intent)
          return false;
        if (
          filters.propertyType &&
          filters.propertyType !== 'All' &&
          req.propertyType !== filters.propertyType
        )
          return false;
        if (filters.bedrooms && filters.bedrooms !== 'All') {
          if (filters.bedrooms >= 4 ? req.bedrooms < 4 : req.bedrooms !== filters.bedrooms)
            return false;
        }
        if (filters.locality && filters.locality !== 'All') {
          if (
            !req.localities.some(
              (l) => l.toLowerCase() === filters.locality!.toLowerCase()
            )
          )
            return false;
        }
        if (filters.query && filters.query.trim()) {
          const q = filters.query.trim().toLowerCase();
          const hay =
            `${req.seekerName} ${req.localities.join(' ')} ${req.notes} ${req.amenities.join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((req) => {
        let bestProperty: Property | null = null;
        let bestMatch = null;
        for (const prop of inventory) {
          const m = computePropertyMatch(req, prop);
          if (!bestMatch || m.score > bestMatch.score) {
            bestMatch = m;
            bestProperty = prop;
          }
        }
        return {
          requirement: req,
          bestProperty,
          bestMatch,
          alreadyProposed: proposedSet.has(req.id),
        };
      });

    if (filters.onlyMatchingMyInventory) {
      items = items.filter((item) => (item.bestMatch?.score ?? 0) >= 55);
    }
    items.sort((a, b) => (b.bestMatch?.score ?? 0) - (a.bestMatch?.score ?? 0));

    const total = items.length;
    const limit = Math.min(50, Math.max(1, filters.limit ?? 20));
    const offset = filters.cursor
      ? Math.max(0, Number.parseInt(filters.cursor, 10) || 0)
      : 0;
    const page = items.slice(offset, offset + limit);
    return {
      items: page,
      nextCursor: offset + limit < total ? String(offset + limit) : null,
      total,
    };
  }

  async listProposalsForSeeker(
    seekerId: string,
    requirementId?: string
  ): Promise<Proposal[]> {
    await this.ensureReady();
    let q = this.sb
      .from('proposals')
      .select('*')
      .eq('seeker_id', seekerId)
      .order('created_at', { ascending: false });
    if (requirementId) q = q.eq('requirement_id', requirementId);
    const { data, error } = await q;
    if (error || !data) return [];
    return data.map((r) => mapSupabaseProposal(r as Record<string, unknown>));
  }

  async listProposalsForBroker(brokerId: string): Promise<Proposal[]> {
    await this.ensureReady();
    const { data, error } = await this.sb
      .from('proposals')
      .select('*')
      .eq('broker_id', brokerId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((r) => mapSupabaseProposal(r as Record<string, unknown>));
  }

  async getProposalById(id: string): Promise<Proposal | null> {
    await this.ensureReady();
    const { data, error } = await this.sb
      .from('proposals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return mapSupabaseProposal(data as Record<string, unknown>);
  }

  async createProposal(
    broker: User,
    input: CreateProposalInput
  ): Promise<Proposal> {
    await this.ensureReady();
    if (broker.role !== 'broker') {
      throw new AppError(
        'Only brokers can submit property proposals.',
        403,
        'FORBIDDEN'
      );
    }

    const [requirement, property] = await Promise.all([
      this.getRequirementById(input.requirementId),
      this.getPropertyById(input.propertyId),
    ]);
    if (!requirement || !property) {
      throw new AppError('Requirement or property not found', 404, 'NOT_FOUND');
    }
    if (property.brokerId !== broker.id) {
      throw new AppError(
        'You can only propose properties from your own inventory.',
        403,
        'FORBIDDEN'
      );
    }
    if (property.availability !== 'available') {
      throw new AppError(
        `Cannot propose this property because its status is currently "${property.availability}".`,
        400,
        'PROPERTY_UNAVAILABLE'
      );
    }

    const { data: dup } = await this.sb
      .from('proposals')
      .select('id')
      .eq('requirement_id', input.requirementId)
      .eq('property_id', input.propertyId)
      .limit(1);
    if (dup && dup.length > 0) {
      throw new AppError(
        'You have already proposed this property for this customer requirement.',
        409,
        'DUPLICATE_PROPOSAL'
      );
    }

    const match = computePropertyMatch(requirement, {
      ...property,
      price: input.proposedPrice,
    });
    const id = makeId('prop-pos');
    const whyMatches =
      input.whyMatches?.trim() || match.reasons.slice(0, 2).join(' · ') || null;
    const matchReasons = match.reasons.length > 0 ? match.reasons : match.warnings;

    const { error } = await this.sb.from('proposals').insert({
      id,
      requirement_id: input.requirementId,
      property_id: input.propertyId,
      broker_id: broker.id,
      seeker_id: requirement.seekerId,
      proposed_price: input.proposedPrice,
      brokerage_charge: input.brokerageCharge.trim(),
      message: input.message.trim(),
      why_matches: whyMatches,
      availability_confirmed: Boolean(input.availabilityConfirmed),
      contact_shared: false,
      status: 'pending',
      status_detail: 'Sent',
      viewed_at: null,
      match_score: match.score,
      match_reasons: matchReasons,
      is_demo: false,
    });
    if (error) {
      if (error.code === '23505') {
        throw new AppError(
          'You have already proposed this property for this customer requirement.',
          409,
          'DUPLICATE_PROPOSAL'
        );
      }
      throw new AppError(error.message, 500, 'INTERNAL_ERROR');
    }

    await this.sb.from('notifications').insert({
      id: makeId('notif'),
      user_id: requirement.seekerId,
      type: 'proposal_received',
      title: `New property proposal for ${requirement.bedrooms} BHK ${requirement.propertyType}`,
      body: `${property.brokerName} pitched "${property.title}" (${match.score}% match).`,
      related_id: id,
    });

    const created = await this.getProposalById(id);
    if (!created) {
      throw new AppError('Failed to create proposal', 500, 'INTERNAL_ERROR');
    }
    return created;
  }

  async updateProposal(
    id: string,
    actor: User,
    updates: UpdateProposalInput
  ): Promise<Proposal | null> {
    await this.ensureReady();
    const existing = await this.getProposalById(id);
    if (!existing) return null;
    if (actor.id !== existing.seekerId && actor.id !== existing.brokerId) {
      throw new AppError('Unauthorized proposal update', 403, 'FORBIDDEN');
    }
    if (
      actor.id !== existing.seekerId &&
      (updates.status !== undefined ||
        updates.contactShared !== undefined ||
        updates.markViewed !== undefined)
    ) {
      throw new AppError(
        'Only the home seeker can update proposal interest or contact sharing.',
        403,
        'FORBIDDEN'
      );
    }

    const prop = await this.getPropertyById(existing.propertyId);
    const propTitle = prop?.title || 'your property';
    const next = { ...existing };

    if (updates.markViewed && !existing.viewedAt) {
      next.viewedAt = new Date().toISOString();
      if (!next.statusDetail || next.statusDetail === 'Sent') {
        next.statusDetail = 'Viewed';
      }
      await this.sb.from('notifications').insert({
        id: makeId('notif'),
        user_id: existing.brokerId,
        type: 'proposal_viewed',
        title: `Proposal viewed: ${propTitle}`,
        body: 'The home seeker opened your property proposal.',
        related_id: existing.id,
      });
    }

    if (updates.status) {
      next.status = updates.status;
      if (updates.status === 'shortlisted') {
        next.statusDetail = 'Interested';
        await this.sb.from('notifications').insert({
          id: makeId('notif'),
          user_id: existing.brokerId,
          type: 'customer_interested',
          title: `Customer interested in ${propTitle}`,
          body: 'The seeker shortlisted your proposal.',
          related_id: existing.id,
        });
      } else if (updates.status === 'accepted') {
        next.statusDetail = 'Interested';
        next.contactShared = true;
        await this.sb.from('notifications').insert({
          id: makeId('notif'),
          user_id: existing.brokerId,
          type: 'contact_shared',
          title: 'Proposal accepted & contact shared',
          body: `Seeker accepted "${propTitle}" and shared private contact details.`,
          related_id: existing.id,
        });
        if (existing.status !== 'accepted') {
          const { data: bp } = await this.sb
            .from('broker_profiles')
            .select('closed_deals_count')
            .eq('user_id', existing.brokerId)
            .maybeSingle();
          const currentDeals = Number(bp?.closed_deals_count ?? 0);
          await this.sb
            .from('broker_profiles')
            .update({ closed_deals_count: currentDeals + 1 })
            .eq('user_id', existing.brokerId);
        }
      } else if (updates.status === 'declined') {
        next.statusDetail = 'Rejected';
      }
    }

    if (updates.statusDetail) next.statusDetail = updates.statusDetail;
    if (typeof updates.contactShared === 'boolean') {
      next.contactShared = updates.contactShared;
      if (updates.contactShared && !existing.contactShared) {
        await this.sb.from('notifications').insert({
          id: makeId('notif'),
          user_id: existing.brokerId,
          type: 'contact_shared',
          title: 'Seeker shared contact details',
          body: `Contact details unlocked for ${propTitle}.`,
          related_id: existing.id,
        });
      }
    }

    const { error } = await this.sb
      .from('proposals')
      .update({
        status: next.status,
        status_detail: next.statusDetail ?? null,
        contact_shared: Boolean(next.contactShared),
        viewed_at: next.viewedAt ?? null,
      })
      .eq('id', id);
    if (error) throw new AppError(error.message, 500, 'INTERNAL_ERROR');

    return this.getProposalById(id);
  }

  async listVisitsForUser(userId: string, role: UserRole): Promise<Visit[]> {
    await this.ensureReady();
    const col = role === 'broker' ? 'broker_id' : 'seeker_id';
    const { data, error } = await this.sb
      .from('visits')
      .select('*')
      .eq(col, userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((r) => mapSupabaseVisit(r as Record<string, unknown>));
  }

  async createVisit(seeker: User, input: CreateVisitInput): Promise<Visit> {
    await this.ensureReady();
    const prop = await this.getPropertyById(input.propertyId);
    if (!prop) throw new AppError('Property not found', 404, 'NOT_FOUND');

    const id = makeId('visit');
    const { data, error } = await this.sb
      .from('visits')
      .insert({
        id,
        property_id: prop.id,
        proposal_id: input.proposalId ?? null,
        seeker_id: seeker.id,
        seeker_name: seeker.name,
        broker_id: prop.brokerId,
        date: input.date,
        time_slot: input.timeSlot,
        notes: input.notes ?? null,
        status: 'requested',
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new AppError(
        error?.message || 'Failed to schedule visit',
        500,
        'INTERNAL_ERROR'
      );
    }

    await this.sb
      .from('proposals')
      .update({ status_detail: 'Visit Requested' })
      .eq('property_id', prop.id)
      .eq('seeker_id', seeker.id);

    await this.sb.from('notifications').insert({
      id: makeId('notif'),
      user_id: prop.brokerId,
      type: 'visit_requested',
      title: `Visit requested for ${prop.title}`,
      body: `${seeker.name} requested a viewing on ${input.date} at ${input.timeSlot}.`,
      related_id: id,
    });

    return mapSupabaseVisit(data as Record<string, unknown>);
  }

  async updateVisitStatus(
    visitId: string,
    actor: User,
    status: VisitStatus
  ): Promise<Visit | null> {
    await this.ensureReady();
    const { data: row } = await this.sb
      .from('visits')
      .select('*')
      .eq('id', visitId)
      .maybeSingle();
    if (!row) return null;
    const existing = mapSupabaseVisit(row as Record<string, unknown>);
    if (actor.id !== existing.brokerId && actor.id !== existing.seekerId) {
      throw new AppError('Unauthorized visit update', 403, 'FORBIDDEN');
    }
    if (
      (status === 'confirmed' || status === 'completed') &&
      actor.id !== existing.brokerId
    ) {
      throw new AppError(
        'Only the listing broker can confirm or complete a visit.',
        403,
        'FORBIDDEN'
      );
    }

    const { data: updated, error } = await this.sb
      .from('visits')
      .update({ status })
      .eq('id', visitId)
      .select('*')
      .single();
    if (error || !updated) {
      throw new AppError(
        error?.message || 'Failed to update visit',
        500,
        'INTERNAL_ERROR'
      );
    }

    const prop = await this.getPropertyById(existing.propertyId);
    const title = prop?.title || 'property';
    if (status === 'confirmed') {
      await this.sb
        .from('proposals')
        .update({ status_detail: 'Visit Scheduled' })
        .eq('property_id', existing.propertyId)
        .eq('seeker_id', existing.seekerId);
      await this.sb.from('notifications').insert({
        id: makeId('notif'),
        user_id: existing.seekerId,
        type: 'visit_confirmed',
        title: `Visit confirmed for ${title}`,
        body: `Broker confirmed your tour on ${existing.date} at ${existing.timeSlot}.`,
        related_id: existing.id,
      });
    } else if (status === 'completed') {
      await this.sb
        .from('proposals')
        .update({ status_detail: 'Closed' })
        .eq('property_id', existing.propertyId)
        .eq('seeker_id', existing.seekerId);
    }

    return mapSupabaseVisit(updated as Record<string, unknown>);
  }

  async listMessagesForProperty(
    propertyId: string,
    viewerId?: string
  ): Promise<Message[]> {
    await this.ensureReady();
    if (!viewerId) return [];
    const { data, error } = await this.sb
      .from('messages')
      .select('*')
      .eq('property_id', propertyId)
      .or(`sender_id.eq.${viewerId},recipient_id.eq.${viewerId}`)
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data.map((r) => mapSupabaseMessage(r as Record<string, unknown>));
  }

  async listMessagesForUser(userId: string): Promise<Message[]> {
    await this.ensureReady();
    const { data, error } = await this.sb
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data.map((r) => mapSupabaseMessage(r as Record<string, unknown>));
  }

  async createMessage(
    sender: User,
    input: CreateMessageInput
  ): Promise<Message> {
    await this.ensureReady();
    if (sender.id === input.recipientId) {
      throw new AppError(
        'Cannot send a message to yourself',
        400,
        'BAD_REQUEST'
      );
    }
    const id = makeId('msg');
    const { data, error } = await this.sb
      .from('messages')
      .insert({
        id,
        proposal_id: input.proposalId ?? null,
        property_id: input.propertyId,
        sender_id: sender.id,
        sender_name: sender.name,
        sender_role: sender.role,
        recipient_id: input.recipientId,
        body: input.body.trim(),
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new AppError(
        error?.message || 'Failed to send message',
        500,
        'INTERNAL_ERROR'
      );
    }
    return mapSupabaseMessage(data as Record<string, unknown>);
  }

  async getSavedPropertyIds(userId: string): Promise<string[]> {
    await this.ensureReady();
    const { data, error } = await this.sb
      .from('saved_properties')
      .select('property_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((r) => r.property_id as string);
  }

  async listSavedProperties(userId: string): Promise<Property[]> {
    await this.ensureReady();
    const ids = await this.getSavedPropertyIds(userId);
    if (ids.length === 0) return [];
    const { data, error } = await this.sb
      .from('properties')
      .select('*')
      .in('id', ids);
    if (error || !data) return [];
    const map = new Map(
      data.map((r) => [
        r.id as string,
        mapSupabaseProperty(r as Record<string, unknown>),
      ])
    );
    return ids.map((id) => map.get(id)).filter((p): p is Property => Boolean(p));
  }

  async toggleSavedProperty(
    userId: string,
    propertyId: string
  ): Promise<string[]> {
    await this.ensureReady();
    const prop = await this.getPropertyById(propertyId);
    if (!prop) throw new AppError('Property not found', 404, 'NOT_FOUND');

    const { data: existing } = await this.sb
      .from('saved_properties')
      .select('property_id')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .maybeSingle();

    if (existing) {
      await this.sb
        .from('saved_properties')
        .delete()
        .eq('user_id', userId)
        .eq('property_id', propertyId);
    } else {
      await this.sb.from('saved_properties').insert({
        user_id: userId,
        property_id: propertyId,
      });
    }
    return this.getSavedPropertyIds(userId);
  }

  async listNotificationsForUser(userId: string): Promise<AppNotification[]> {
    await this.ensureReady();
    const { data, error } = await this.sb
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error || !data) return [];
    return data.map((r) =>
      mapSupabaseNotification(r as Record<string, unknown>)
    );
  }

  async markNotificationsRead(
    userId: string,
    notificationId?: string
  ): Promise<void> {
    await this.ensureReady();
    let q = this.sb
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);
    if (notificationId) q = q.eq('id', notificationId);
    await q;
  }

  async listReviewsForBroker(brokerId: string): Promise<BrokerReview[]> {
    await this.ensureReady();
    const { data, error } = await this.sb
      .from('broker_reviews')
      .select('*')
      .eq('broker_id', brokerId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((r) => mapSupabaseReview(r as Record<string, unknown>));
  }

  async createReview(
    author: User,
    input: CreateReviewInput
  ): Promise<BrokerReview> {
    await this.ensureReady();
    if (author.id === input.brokerId) {
      throw new AppError(
        'Brokers cannot leave reviews on their own profile.',
        403,
        'FORBIDDEN'
      );
    }
    const broker = await this.getUserById(input.brokerId);
    if (!broker || broker.role !== 'broker') {
      throw new AppError('Broker not found', 404, 'NOT_FOUND');
    }
    const id = makeId('rev');
    const { data, error } = await this.sb
      .from('broker_reviews')
      .insert({
        id,
        broker_id: input.brokerId,
        author_id: author.id,
        author_name: author.name,
        rating: input.rating,
        comment: input.comment.trim(),
        locality: input.locality?.trim() || null,
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new AppError(
        error?.message || 'Failed to create review',
        500,
        'INTERNAL_ERROR'
      );
    }
    return mapSupabaseReview(data as Record<string, unknown>);
  }
}
