import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import type {
  AppNotification,
  BrokerProfile,
  BrokerReview,
  MatchedLeadItem,
  Message,
  PaginatedResult,
  Property,
  PropertyCategory,
  Proposal,
  ProposalStatus,
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
import { inferReraAuthority } from '@/lib/rera';
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

export class SupabaseDbAdapter implements DbAdapter {
  private readonly pool: Pool;
  private readyPromise: Promise<void> | null = null;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 10,
      ssl: connectionString.includes('localhost')
        ? undefined
        : { rejectUnauthorized: false },
    });
  }

  private async ensureReady(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise = this.seedIfEmpty();
    }
    return this.readyPromise;
  }

  private async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async seedIfEmpty(): Promise<void> {
    const { rows } = await this.pool.query<{ cnt: string }>(
      'SELECT COUNT(*)::text AS cnt FROM public.users'
    );
    if (Number(rows[0]?.cnt ?? 0) > 0) return;

    const demoHash = await hashPassword('housed123');
    const seed = createSeedPayload(demoHash);

    await this.withTransaction(async (client) => {
      for (const u of seed.users) {
        await client.query(
          `INSERT INTO public.users (id, name, email, phone, role, city, avatar_url, auth_method, password_hash, is_demo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
          [
            u.id,
            u.name,
            u.email,
            u.phone,
            u.role,
            u.city,
            u.avatarUrl ?? null,
            u.authMethod ?? 'password',
            u.passwordHash ?? null,
            Boolean(u.isDemo),
          ]
        );
        if (u.brokerProfile) {
          const bp = u.brokerProfile;
          await client.query(
            `INSERT INTO public.broker_profiles (
              user_id, is_independent, agency_name, agency_address, phone,
              operating_localities, property_categories, specializations,
              years_experience, properties_managed_count, website, rera_id, avatar_url,
              verification_status, verified, bio, closed_deals_count, verification_docs
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
            ON CONFLICT (user_id) DO NOTHING`,
            [
              u.id,
              Boolean(bp.isIndependent),
              bp.agencyName ?? '',
              bp.agencyAddress ?? '',
              bp.phone,
              bp.operatingLocalities,
              bp.propertyCategories,
              bp.specializations ?? [],
              bp.yearsExperience,
              bp.propertiesManagedCount ?? 0,
              bp.website ?? null,
              bp.reraId ?? null,
              bp.avatarUrl ?? null,
              bp.verificationStatus ?? (bp.verified ? 'verified' : 'pending'),
              Boolean(bp.verified),
              bp.bio ?? '',
              bp.closedDealsCount,
              bp.verificationDocs ? JSON.stringify(bp.verificationDocs) : null,
            ]
          );
        }
      }

      for (const p of seed.properties) {
        await client.query(
          `INSERT INTO public.properties (
            id, broker_id, broker_name, broker_agency, broker_phone, broker_verified,
            title, intent, transaction_type, listing_category, locality, city, pincode, landmark, address,
            price, security_deposit, maintenance_charges, price_per_sqft, brokerage_amount, brokerage_type,
            deposit_or_maintenance, brokerage_fee, property_type, bedrooms, bathrooms, area_sqft,
            carpet_area_sqft, built_up_area_sqft, floor_info, floor_number, total_floors,
            furnishing, parking, balconies, property_age, available_from, amenities,
            description, additional_info, selling_points, video_tour_url, images,
            availability, is_demo, map_x, map_y, lat, lng, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50)
          ON CONFLICT (id) DO NOTHING`,
          [
            p.id,
            p.brokerId,
            p.brokerName,
            p.brokerAgency ?? null,
            p.brokerPhone,
            p.brokerVerified,
            p.title,
            p.intent,
            p.transactionType ?? null,
            p.listingCategory ?? null,
            p.locality,
            p.city ?? 'Bengaluru',
            p.pincode ?? null,
            p.landmark ?? null,
            p.address,
            p.price,
            p.securityDeposit ?? null,
            p.maintenanceCharges ?? null,
            p.pricePerSqFt ?? null,
            p.brokerageAmount ?? null,
            p.brokerageType ?? null,
            p.depositOrMaintenance ?? null,
            p.brokerageFee,
            p.propertyType,
            p.bedrooms,
            p.bathrooms,
            p.areaSqFt,
            p.carpetAreaSqFt ?? null,
            p.builtUpAreaSqFt ?? null,
            p.floorInfo,
            p.floorNumber ?? null,
            p.totalFloors ?? null,
            p.furnishing,
            p.parking ?? null,
            p.balconies ?? null,
            p.propertyAge ?? null,
            p.availableFrom,
            p.amenities,
            p.description,
            p.additionalInfo ?? null,
            p.sellingPoints ?? [],
            p.videoTourUrl ?? null,
            p.images,
            p.availability,
            Boolean(p.isDemo),
            p.mapX,
            p.mapY,
            p.lat ?? null,
            p.lng ?? null,
            p.createdAt,
          ]
        );
      }

      for (const r of seed.requirements) {
        await client.query(
          `INSERT INTO public.requirements (
            id, seeker_id, seeker_name, seeker_phone, seeker_email, intent,
            localities, budget_min, budget_max, property_type, bedrooms,
            furnishing, move_in_date, amenities, notes, status, is_demo, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
          ON CONFLICT (id) DO NOTHING`,
          [
            r.id,
            r.seekerId,
            r.seekerName,
            r.seekerPhone,
            r.seekerEmail,
            r.intent,
            r.localities,
            r.budgetMin,
            r.budgetMax,
            r.propertyType,
            r.bedrooms,
            r.furnishing,
            r.moveInDate,
            r.amenities,
            r.notes,
            r.status,
            Boolean(r.isDemo),
            r.createdAt,
          ]
        );
      }

      for (const pr of seed.proposals) {
        await client.query(
          `INSERT INTO public.proposals (
            id, requirement_id, property_id, broker_id, seeker_id, proposed_price,
            brokerage_charge, message, why_matches, availability_confirmed, contact_shared,
            status, status_detail, viewed_at, match_score, match_reasons, is_demo, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
          ON CONFLICT (id) DO NOTHING`,
          [
            pr.id,
            pr.requirementId,
            pr.propertyId,
            pr.brokerId,
            pr.seekerId,
            pr.proposedPrice,
            pr.brokerageCharge,
            pr.message,
            pr.whyMatches ?? null,
            pr.availabilityConfirmed !== false,
            Boolean(pr.contactShared),
            pr.status,
            pr.statusDetail ?? 'Sent',
            pr.viewedAt ?? null,
            pr.matchScore,
            pr.matchReasons,
            Boolean(pr.isDemo),
            pr.createdAt,
          ]
        );
      }

      for (const v of seed.visits) {
        await client.query(
          `INSERT INTO public.visits (id, property_id, proposal_id, seeker_id, seeker_name, broker_id, date, time_slot, notes, status, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
          [v.id, v.propertyId, v.proposalId ?? null, v.seekerId, v.seekerName, v.brokerId, v.date, v.timeSlot, v.notes ?? null, v.status, v.createdAt]
        );
      }

      for (const m of seed.messages) {
        await client.query(
          `INSERT INTO public.messages (id, proposal_id, property_id, sender_id, sender_name, sender_role, recipient_id, body, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
          [m.id, m.proposalId ?? null, m.propertyId, m.senderId, m.senderName, m.senderRole, m.recipientId, m.body, m.createdAt]
        );
      }

      for (const n of seed.notifications) {
        await client.query(
          `INSERT INTO public.notifications (id, user_id, type, title, body, related_id, read, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          [n.id, n.userId, n.type, n.title, n.body, n.relatedId ?? null, n.read, n.createdAt]
        );
      }

      for (const rv of seed.reviews) {
        await client.query(
          `INSERT INTO public.broker_reviews (id, broker_id, author_id, author_name, rating, comment, locality, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          [rv.id, rv.brokerId, rv.authorId, rv.authorName, rv.rating, rv.comment, rv.locality ?? null, rv.createdAt]
        );
      }

      for (const pair of seed.savedPairs) {
        await client.query(
          `INSERT INTO public.saved_properties (user_id, property_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [pair.userId, pair.propertyId]
        );
      }
    });

    await this.pool.query(
      `UPDATE public.properties p
       SET broker_rera_id = coalesce(bp.rera_id, ''),
           broker_rera_authority = coalesce(
             nullif(bp.verification_docs ->> 'reraAuthority', ''),
             case
               when lower(u.city) like '%bengaluru%' or lower(u.city) like '%karnataka%' then 'Karnataka RERA'
               when lower(u.city) like '%mumbai%' or lower(u.city) like '%maharashtra%' or lower(u.city) like '%pune%' then 'MahaRERA'
               when lower(u.city) like '%kerala%' or lower(u.city) like '%kochi%' or lower(u.city) like '%thiruvananthapuram%' then 'K-RERA'
               else ''
             end
           )
       FROM public.broker_profiles bp JOIN public.users u ON u.id = bp.user_id
       WHERE p.broker_id = bp.user_id`
    );
  }

  private mapUser(row: Record<string, unknown>, bpRow?: Record<string, unknown>): StoredUser {
    const brokerProfile: BrokerProfile | undefined = bpRow
      ? {
          isIndependent: Boolean(bpRow.is_independent),
          agencyName: (bpRow.agency_name as string) || '',
          agencyAddress: (bpRow.agency_address as string) || '',
          phone: (bpRow.phone as string) || '',
          operatingLocalities: (bpRow.operating_localities as string[]) || [],
          propertyCategories: (bpRow.property_categories as PropertyCategory[]) || [],
          specializations: (bpRow.specializations as BrokerProfile['specializations']) || [],
          yearsExperience: Number(bpRow.years_experience ?? 1),
          propertiesManagedCount: Number(bpRow.properties_managed_count ?? 0),
          website: (bpRow.website as string | null) ?? undefined,
          reraId: (bpRow.rera_id as string | null) ?? undefined,
          avatarUrl: (bpRow.avatar_url as string | null) ?? undefined,
          verificationStatus:
            (bpRow.verification_status as BrokerProfile['verificationStatus']) ?? 'pending',
          verified: Boolean(bpRow.verified),
          bio: (bpRow.bio as string) || '',
          closedDealsCount: Number(bpRow.closed_deals_count ?? 0),
          verificationDocs: (bpRow.verification_docs as BrokerProfile['verificationDocs']) ?? undefined,
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

  private mapProperty(row: Record<string, unknown>): Property {
    return {
      id: row.id as string,
      brokerId: row.broker_id as string,
      brokerName: row.broker_name as string,
      brokerAgency: (row.broker_agency as string | null) ?? undefined,
      brokerPhone: (row.broker_phone as string) || '',
      brokerVerified: Boolean(row.broker_verified),
      brokerReraAuthority: (row.broker_rera_authority as string | null) ?? undefined,
      brokerReraId: (row.broker_rera_id as string | null) ?? undefined,
      title: row.title as string,
      intent: row.intent as Property['intent'],
      transactionType: (row.transaction_type as Property['transactionType']) ?? undefined,
      listingCategory: (row.listing_category as Property['listingCategory']) ?? undefined,
      locality: row.locality as string,
      city: (row.city as string) || 'Bengaluru',
      pincode: (row.pincode as string | null) ?? undefined,
      landmark: (row.landmark as string | null) ?? undefined,
      address: row.address as string,
      price: Number(row.price),
      securityDeposit: row.security_deposit != null ? Number(row.security_deposit) : undefined,
      maintenanceCharges: row.maintenance_charges != null ? Number(row.maintenance_charges) : undefined,
      pricePerSqFt: row.price_per_sqft != null ? Number(row.price_per_sqft) : undefined,
      brokerageAmount: row.brokerage_amount != null ? Number(row.brokerage_amount) : undefined,
      brokerageType: (row.brokerage_type as Property['brokerageType']) ?? undefined,
      depositOrMaintenance: (row.deposit_or_maintenance as string | null) ?? undefined,
      brokerageFee: (row.brokerage_fee as string) || '',
      propertyType: row.property_type as PropertyCategory,
      bedrooms: Number(row.bedrooms),
      bathrooms: Number(row.bathrooms),
      areaSqFt: Number(row.area_sqft),
      carpetAreaSqFt: row.carpet_area_sqft != null ? Number(row.carpet_area_sqft) : undefined,
      builtUpAreaSqFt: row.built_up_area_sqft != null ? Number(row.built_up_area_sqft) : undefined,
      floorInfo: (row.floor_info as string) || '',
      floorNumber: row.floor_number != null ? Number(row.floor_number) : undefined,
      totalFloors: row.total_floors != null ? Number(row.total_floors) : undefined,
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

  private mapRequirement(row: Record<string, unknown>): Requirement {
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

  private mapProposal(row: Record<string, unknown>): Proposal {
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
      viewedAt: row.viewed_at ? new Date(row.viewed_at as string).toISOString() : undefined,
      matchScore: Number(row.match_score),
      matchReasons: (row.match_reasons as string[]) || [],
      isDemo: Boolean(row.is_demo),
      createdAt: new Date(row.created_at as string).toISOString(),
    };
  }

  private mapVisit(row: Record<string, unknown>): Visit {
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

  private mapMessage(row: Record<string, unknown>): Message {
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

  private mapNotification(row: Record<string, unknown>): AppNotification {
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

  private mapReview(row: Record<string, unknown>): BrokerReview {
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

  async getUserById(id: string): Promise<StoredUser | null> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT * FROM public.users WHERE id = $1', [id]);
    if (!res.rows[0]) return null;
    const u = res.rows[0];
    const bp =
      u.role === 'broker'
        ? (await this.pool.query('SELECT * FROM public.broker_profiles WHERE user_id = $1', [id])).rows[0]
        : undefined;
    return this.mapUser(u, bp);
  }

  async getUserByEmail(email: string): Promise<StoredUser | null> {
    await this.ensureReady();
    const res = await this.pool.query(
      'SELECT * FROM public.users WHERE lower(email) = lower($1)',
      [email.trim()]
    );
    if (!res.rows[0]) return null;
    const u = res.rows[0];
    const bp =
      u.role === 'broker'
        ? (await this.pool.query('SELECT * FROM public.broker_profiles WHERE user_id = $1', [u.id])).rows[0]
        : undefined;
    return this.mapUser(u, bp);
  }

  async listDemoUsers(): Promise<User[]> {
    await this.ensureReady();
    const res = await this.pool.query(
      'SELECT * FROM public.users WHERE is_demo = true ORDER BY role DESC, name ASC'
    );
    const out: User[] = [];
    for (const u of res.rows) {
      const bp =
        u.role === 'broker'
          ? (await this.pool.query('SELECT * FROM public.broker_profiles WHERE user_id = $1', [u.id])).rows[0]
          : undefined;
      out.push(sanitizeUser(this.mapUser(u, bp)));
    }
    return out;
  }

  async listPublicBrokers(): Promise<User[]> {
    await this.ensureReady();
    const res = await this.pool.query(
      "SELECT * FROM public.users WHERE role = 'broker' ORDER BY name ASC"
    );
    const out: User[] = [];
    for (const u of res.rows) {
      const bp = (
        await this.pool.query('SELECT * FROM public.broker_profiles WHERE user_id = $1', [u.id])
      ).rows[0];
      out.push(sanitizeUser(this.mapUser(u, bp)));
    }
    return out;
  }

  async createUser(input: RegisterInput & { passwordHash?: string | null }): Promise<User> {
    await this.ensureReady();
    const existing = await this.getUserByEmail(input.email);
    if (existing) {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
    }
    const id = makeId(input.role);
    const now = new Date().toISOString();

    await this.withTransaction(async (client) => {
      await client.query(
        `INSERT INTO public.users (id, name, email, phone, role, city, avatar_url, auth_method, password_hash, is_demo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false)`,
        [
          id,
          input.name.trim(),
          input.email.trim().toLowerCase(),
          input.phone.trim(),
          input.role,
          input.city?.trim() || 'Bengaluru',
          input.avatarUrl ?? input.brokerProfile?.avatarUrl ?? null,
          input.authMethod ?? 'password',
          input.passwordHash ?? null,
        ]
      );
      if (input.role === 'broker') {
        const bp = input.brokerProfile;
        const docs = bp?.verificationDocs
          ? { ...bp.verificationDocs, submittedAt: now }
          : null;
        await client.query(
          `INSERT INTO public.broker_profiles (
            user_id, is_independent, agency_name, agency_address, phone,
            operating_localities, property_categories, specializations,
            years_experience, properties_managed_count, website, rera_id, avatar_url,
            verification_status, verified, bio, closed_deals_count, verification_docs
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending',false,$14,0,$15)`,
          [
            id,
            Boolean(bp?.isIndependent ?? !bp?.agencyName?.trim()),
            bp?.agencyName?.trim() || '',
            bp?.agencyAddress?.trim() || '',
            bp?.phone?.trim() || input.phone.trim(),
            bp?.operatingLocalities?.length ? bp.operatingLocalities : ['Koramangala'],
            bp?.propertyCategories?.length ? bp.propertyCategories : ['Flat', 'House'],
            bp?.specializations ?? ['Residential rentals'],
            bp?.yearsExperience ?? 1,
            bp?.propertiesManagedCount ?? 0,
            bp?.website?.trim() || null,
            bp?.reraId?.trim() || null,
            input.avatarUrl ?? bp?.avatarUrl ?? null,
            bp?.bio?.trim() || '',
            docs ? JSON.stringify(docs) : null,
          ]
        );
      }
    });

    const created = await this.getUserById(id);
    if (!created) throw new AppError('Failed to create user', 500, 'INTERNAL_ERROR');
    return sanitizeUser(created);
  }

  async updateUserProfile(userId: string, updates: UpdateProfileInput): Promise<User | null> {
    await this.ensureReady();
    const existing = await this.getUserById(userId);
    if (!existing) return null;

    const nextName = updates.name?.trim() || existing.name;
    const nextPhone = updates.phone?.trim() || existing.phone;
    const nextCity = updates.city?.trim() || existing.city;
    const nextAvatar = updates.avatarUrl ?? updates.brokerProfile?.avatarUrl ?? existing.avatarUrl ?? null;

    await this.withTransaction(async (client) => {
      await client.query(
        'UPDATE public.users SET name = $1, phone = $2, city = $3, avatar_url = $4 WHERE id = $5',
        [nextName, nextPhone, nextCity, nextAvatar, userId]
      );

      if (existing.role === 'broker' && updates.brokerProfile) {
        const prevBp = existing.brokerProfile;
        const bp = updates.brokerProfile;
        const nextAgency = bp.agencyName !== undefined ? bp.agencyName.trim() : prevBp?.agencyName ?? '';
        const nextBrokerPhone = bp.phone?.trim() || prevBp?.phone || nextPhone;
        const nextDocs = bp.verificationDocs
          ? { ...(prevBp?.verificationDocs || {}), ...bp.verificationDocs, submittedAt: bp.verificationDocs.submittedAt || new Date().toISOString() }
          : prevBp?.verificationDocs;

        await client.query(
          `UPDATE public.broker_profiles SET
            is_independent = $1, agency_name = $2, agency_address = $3, phone = $4,
            operating_localities = $5, property_categories = $6, specializations = $7,
            years_experience = $8, properties_managed_count = $9, website = $10, rera_id = $11,
            avatar_url = $12, bio = $13, verification_docs = $14, verification_status = $15
          WHERE user_id = $16`,
          [
            Boolean(bp.isIndependent ?? prevBp?.isIndependent ?? !nextAgency),
            nextAgency,
            bp.agencyAddress !== undefined ? bp.agencyAddress.trim() : prevBp?.agencyAddress ?? '',
            nextBrokerPhone,
            bp.operatingLocalities ?? prevBp?.operatingLocalities ?? ['Koramangala'],
            bp.propertyCategories ?? prevBp?.propertyCategories ?? ['Flat'],
            bp.specializations ?? prevBp?.specializations ?? [],
            bp.yearsExperience ?? prevBp?.yearsExperience ?? 1,
            bp.propertiesManagedCount ?? prevBp?.propertiesManagedCount ?? 0,
            bp.website !== undefined ? bp.website.trim() || null : prevBp?.website ?? null,
            bp.reraId !== undefined ? bp.reraId.trim() || null : prevBp?.reraId ?? null,
            nextAvatar,
            bp.bio !== undefined ? bp.bio.trim() : prevBp?.bio ?? '',
            nextDocs ? JSON.stringify(nextDocs) : null,
            bp.verificationDocs && prevBp?.verificationStatus !== 'verified'
              ? 'pending'
              : (prevBp?.verificationStatus ?? 'pending'),
            userId,
          ]
        );

        await client.query(
          'UPDATE public.properties SET broker_name = $1, broker_agency = $2, broker_phone = $3, broker_rera_authority = $4, broker_rera_id = $5 WHERE broker_id = $6',
          [nextName, nextAgency || null, nextBrokerPhone, nextDocs?.reraAuthority || inferReraAuthority(nextCity), bp.reraId !== undefined ? bp.reraId.trim() : prevBp?.reraId || '', userId]
        );
      }
    });

    const refreshed = await this.getUserById(userId);
    return refreshed ? sanitizeUser(refreshed) : null;
  }

  async createSession(userId: string, expiresAtIso: string): Promise<SessionRecord> {
    await this.ensureReady();
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await this.pool.query(
      'INSERT INTO public.sessions (id, user_id, expires_at, created_at) VALUES ($1,$2,$3,$4)',
      [id, userId, expiresAtIso, createdAt]
    );
    return { id, userId, expiresAt: expiresAtIso, createdAt };
  }

  async getSession(sessionId: string): Promise<SessionRecord | null> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT * FROM public.sessions WHERE id = $1', [sessionId]);
    const row = res.rows[0];
    if (!row) return null;
    const expiresAt = new Date(row.expires_at as string).toISOString();
    if (new Date(expiresAt).getTime() <= Date.now()) {
      await this.pool.query('DELETE FROM public.sessions WHERE id = $1', [sessionId]);
      return null;
    }
    return {
      id: row.id as string,
      userId: row.user_id as string,
      expiresAt,
      createdAt: new Date(row.created_at as string).toISOString(),
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.ensureReady();
    await this.pool.query('DELETE FROM public.sessions WHERE id = $1', [sessionId]);
  }

  async listProperties(filters: PropertyQueryFilters = {}): Promise<PaginatedResult<Property>> {
    await this.ensureReady();
    const conditions: string[] = [];
    const params: unknown[] = [];

    const add = (cond: string, val?: unknown) => {
      if (val === undefined) {
        conditions.push(cond);
      } else {
        params.push(val);
        conditions.push(cond.replace('$?', `$${params.length}`));
      }
    };

    if (!filters.includeUnavailable) add("availability = 'available'");
    if (filters.brokerId) add('broker_id = $?', filters.brokerId);
    if (filters.intent) add('intent = $?', filters.intent);
    if (filters.locality && filters.locality !== 'All') add('lower(locality) = lower($?)', filters.locality);
    if (filters.propertyType && filters.propertyType !== 'All') add('property_type = $?', filters.propertyType);
    if (filters.bedrooms && filters.bedrooms !== 'All') {
      if (filters.bedrooms >= 4) add('bedrooms >= 4');
      else add('bedrooms = $?', filters.bedrooms);
    }
    if (filters.budgetMax && filters.budgetMax > 0) add('price <= $?', filters.budgetMax);
    if (filters.furnishing && filters.furnishing !== 'Any') add('furnishing = $?', filters.furnishing);
    if (filters.query && filters.query.trim()) {
      params.push(`%${filters.query.trim()}%`);
      const idx = params.length;
      conditions.push(`(title ILIKE $${idx} OR locality ILIKE $${idx} OR address ILIKE $${idx} OR description ILIKE $${idx})`);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await this.pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM public.properties ${whereSql}`,
      params
    );

    const limit = Math.min(50, Math.max(1, filters.limit ?? 24));
    const offset = filters.cursor ? Math.max(0, Number.parseInt(filters.cursor, 10) || 0) : 0;

    const rowsRes = await this.pool.query(
      `SELECT * FROM public.properties ${whereSql} ORDER BY created_at DESC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit + 1, offset]
    );

    const hasMore = rowsRes.rows.length > limit;
    const sliced = hasMore ? rowsRes.rows.slice(0, limit) : rowsRes.rows;
    return {
      items: sliced.map((r) => this.mapProperty(r)),
      nextCursor: hasMore ? String(offset + limit) : null,
      total: Number(countRes.rows[0]?.total ?? 0),
    };
  }

  async getPropertyById(id: string): Promise<Property | null> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT * FROM public.properties WHERE id = $1', [id]);
    return res.rows[0] ? this.mapProperty(res.rows[0]) : null;
  }

  async createProperty(broker: User, input: CreatePropertyInput): Promise<Property> {
    await this.ensureReady();
    if (broker.role !== 'broker') {
      throw new AppError('Only registered brokers can list properties.', 403, 'FORBIDDEN');
    }
    if (!broker.brokerProfile?.reraId?.trim() || !broker.brokerProfile.verificationDocs?.reraAuthority?.trim()) {
      throw new AppError('Complete your applicable state RERA authority and registration number before listing a property.', 400, 'RERA_REGISTRATION_REQUIRED');
    }
    const id = makeId('prop');
    const intent = input.intent ?? (input.transactionType ? mapTransactionToIntent(input.transactionType) : 'rent');
    const propertyType = input.propertyType ?? (input.listingCategory ? mapDetailedCategoryToBase(input.listingCategory) : 'Flat');
    const coords = LOCALITY_COORDS[input.locality];
    const brokerVerified = broker.brokerProfile?.verificationStatus === 'verified';

    await this.pool.query(
      `INSERT INTO public.properties (
        id, broker_id, broker_name, broker_agency, broker_phone, broker_verified,
        broker_rera_authority, broker_rera_id,
        title, intent, transaction_type, listing_category, locality, city, pincode, landmark, address,
        price, security_deposit, maintenance_charges, price_per_sqft, brokerage_amount, brokerage_type,
        deposit_or_maintenance, brokerage_fee, property_type, bedrooms, bathrooms, area_sqft,
        carpet_area_sqft, built_up_area_sqft, floor_info, floor_number, total_floors,
        furnishing, parking, balconies, property_age, available_from, amenities,
        description, additional_info, selling_points, video_tour_url, images,
        availability, is_demo, map_x, map_y, lat, lng
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,false,$47,$48,$49,$50)`,
      [
        id,
        broker.id,
        broker.name,
        broker.brokerProfile?.agencyName || null,
        broker.brokerProfile?.phone || broker.phone,
        brokerVerified,
        broker.brokerProfile?.verificationDocs?.reraAuthority || inferReraAuthority(broker.city),
        broker.brokerProfile?.reraId || '',
        input.title.trim(),
        intent,
        input.transactionType ?? (intent === 'buy' ? 'For Sale' : 'For Rent'),
        input.listingCategory ?? null,
        input.locality,
        input.city ?? broker.city ?? 'Bengaluru',
        input.pincode ?? null,
        input.landmark ?? null,
        input.address.trim(),
        input.price,
        input.securityDeposit ?? null,
        input.maintenanceCharges ?? null,
        input.pricePerSqFt ?? null,
        input.brokerageAmount ?? null,
        input.brokerageType ?? null,
        input.depositOrMaintenance ?? null,
        input.brokerageFee,
        propertyType,
        input.bedrooms,
        input.bathrooms,
        input.areaSqFt,
        input.carpetAreaSqFt ?? null,
        input.builtUpAreaSqFt ?? null,
        input.floorInfo,
        input.floorNumber ?? null,
        input.totalFloors ?? null,
        input.furnishing,
        input.parking ?? null,
        input.balconies ?? null,
        input.propertyAge ?? null,
        input.availableFrom,
        input.amenities ?? [],
        input.description,
        input.additionalInfo ?? null,
        input.sellingPoints ?? [],
        input.videoTourUrl ?? null,
        input.images,
        input.availability ?? 'available',
        input.mapX ?? 50,
        input.mapY ?? 50,
        input.lat ?? coords?.lat ?? null,
        input.lng ?? coords?.lng ?? null,
      ]
    );
    const created = await this.getPropertyById(id);
    if (!created) throw new AppError('Failed to create property', 500, 'INTERNAL_ERROR');
    return created;
  }

  async updateProperty(id: string, brokerId: string, updates: UpdatePropertyInput): Promise<Property | null> {
    await this.ensureReady();
    const existing = await this.getPropertyById(id);
    if (!existing) return null;
    if (existing.brokerId !== brokerId) {
      throw new AppError('Brokers can only edit their own properties.', 403, 'FORBIDDEN');
    }
    const merged: Property = {
      ...existing,
      ...updates,
      amenities: updates.amenities ?? existing.amenities,
      sellingPoints: updates.sellingPoints ?? existing.sellingPoints,
      images: updates.images ?? existing.images,
    };
    await this.pool.query(
      `UPDATE public.properties SET
        title=$1, intent=$2, transaction_type=$3, listing_category=$4, locality=$5, city=$6, pincode=$7, landmark=$8, address=$9,
        price=$10, security_deposit=$11, maintenance_charges=$12, price_per_sqft=$13, brokerage_amount=$14, brokerage_type=$15,
        deposit_or_maintenance=$16, brokerage_fee=$17, property_type=$18, bedrooms=$19, bathrooms=$20, area_sqft=$21,
        carpet_area_sqft=$22, built_up_area_sqft=$23, floor_info=$24, floor_number=$25, total_floors=$26,
        furnishing=$27, parking=$28, balconies=$29, property_age=$30, available_from=$31, amenities=$32,
        description=$33, additional_info=$34, selling_points=$35, video_tour_url=$36, images=$37, availability=$38, map_x=$39, map_y=$40
      WHERE id = $41`,
      [
        merged.title,
        merged.intent,
        merged.transactionType ?? null,
        merged.listingCategory ?? null,
        merged.locality,
        merged.city ?? 'Bengaluru',
        merged.pincode ?? null,
        merged.landmark ?? null,
        merged.address,
        merged.price,
        merged.securityDeposit ?? null,
        merged.maintenanceCharges ?? null,
        merged.pricePerSqFt ?? null,
        merged.brokerageAmount ?? null,
        merged.brokerageType ?? null,
        merged.depositOrMaintenance ?? null,
        merged.brokerageFee,
        merged.propertyType,
        merged.bedrooms,
        merged.bathrooms,
        merged.areaSqFt,
        merged.carpetAreaSqFt ?? null,
        merged.builtUpAreaSqFt ?? null,
        merged.floorInfo,
        merged.floorNumber ?? null,
        merged.totalFloors ?? null,
        merged.furnishing,
        merged.parking ?? null,
        merged.balconies ?? null,
        merged.propertyAge ?? null,
        merged.availableFrom,
        merged.amenities,
        merged.description,
        merged.additionalInfo ?? null,
        merged.sellingPoints ?? [],
        merged.videoTourUrl ?? null,
        merged.images,
        merged.availability,
        merged.mapX,
        merged.mapY,
        id,
      ]
    );
    return this.getPropertyById(id);
  }

  async deleteProperty(id: string, brokerId: string): Promise<boolean> {
    await this.ensureReady();
    const existing = await this.getPropertyById(id);
    if (!existing) return false;
    if (existing.brokerId !== brokerId) {
      throw new AppError('Brokers can only remove their own properties.', 403, 'FORBIDDEN');
    }
    await this.pool.query('DELETE FROM public.properties WHERE id = $1', [id]);
    return true;
  }

  async listRequirementsBySeeker(seekerId: string): Promise<Requirement[]> {
    await this.ensureReady();
    const res = await this.pool.query(
      'SELECT * FROM public.requirements WHERE seeker_id = $1 ORDER BY created_at DESC',
      [seekerId]
    );
    return res.rows.map((r) => this.mapRequirement(r));
  }

  async getRequirementById(id: string): Promise<Requirement | null> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT * FROM public.requirements WHERE id = $1', [id]);
    return res.rows[0] ? this.mapRequirement(res.rows[0]) : null;
  }

  async createRequirement(seeker: User, input: CreateRequirementInput): Promise<Requirement> {
    await this.ensureReady();
    if (seeker.role !== 'seeker') {
      throw new AppError('Only home seekers can post property requirements.', 403, 'FORBIDDEN');
    }
    const id = makeId('req');
    await this.withTransaction(async (client) => {
      await client.query(
        `INSERT INTO public.requirements (
          id, seeker_id, seeker_name, seeker_phone, seeker_email, intent,
          localities, budget_min, budget_max, property_type, bedrooms,
          furnishing, move_in_date, amenities, notes, status, is_demo
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'active',false)`,
        [
          id,
          seeker.id,
          input.seekerName?.trim() || seeker.name,
          input.seekerPhone?.trim() || seeker.phone,
          input.seekerEmail?.trim() || seeker.email,
          input.intent,
          input.localities,
          input.budgetMin,
          input.budgetMax,
          input.propertyType,
          input.bedrooms,
          input.furnishing,
          input.moveInDate,
          input.amenities,
          input.notes,
        ]
      );

      const brokers = await client.query<{ id: string; operating_localities: string[] | null }>(
        `SELECT u.id, bp.operating_localities FROM public.users u
         LEFT JOIN public.broker_profiles bp ON bp.user_id = u.id
         WHERE u.role = 'broker'`
      );
      for (const b of brokers.rows) {
        const areas = b.operating_localities ?? [];
        const areaMatch =
          areas.length === 0 ||
          input.localities.some((loc) => areas.some((a) => a.toLowerCase() === loc.toLowerCase()));
        if (areaMatch) {
          await client.query(
            `INSERT INTO public.notifications (id, user_id, type, title, body, related_id)
             VALUES ($1,$2,'matching_requirement',$3,$4,$5)`,
            [
              makeId('notif'),
              b.id,
              `New ${input.bedrooms} BHK ${input.propertyType} lead in ${input.localities[0]}`,
              `Customer looking to ${input.intent} · Move-in ${input.moveInDate}`,
              id,
            ]
          );
        }
      }
    });
    const created = await this.getRequirementById(id);
    if (!created) throw new AppError('Failed to create requirement', 500, 'INTERNAL_ERROR');
    return created;
  }

  async updateRequirement(id: string, seekerId: string, updates: UpdateRequirementInput): Promise<Requirement | null> {
    await this.ensureReady();
    const existing = await this.getRequirementById(id);
    if (!existing) return null;
    if (existing.seekerId !== seekerId) {
      throw new AppError('Only the requirement owner can update this brief.', 403, 'FORBIDDEN');
    }
    const next = {
      ...existing,
      ...updates,
      localities: updates.localities ?? existing.localities,
      amenities: updates.amenities ?? existing.amenities,
    };
    await this.pool.query(
      `UPDATE public.requirements SET status=$1, localities=$2, budget_min=$3, budget_max=$4, furnishing=$5, move_in_date=$6, amenities=$7, notes=$8 WHERE id=$9`,
      [next.status, next.localities, next.budgetMin, next.budgetMax, next.furnishing, next.moveInDate, next.amenities, next.notes, id]
    );
    return this.getRequirementById(id);
  }

  async deleteRequirement(id: string, seekerId: string): Promise<boolean> {
    await this.ensureReady();
    const existing = await this.getRequirementById(id);
    if (!existing) return false;
    if (existing.seekerId !== seekerId) {
      throw new AppError('Only the requirement owner can delete this brief.', 403, 'FORBIDDEN');
    }
    await this.pool.query('DELETE FROM public.requirements WHERE id = $1', [id]);
    return true;
  }

  async getLeadsForBroker(filters: LeadQueryFilters): Promise<PaginatedResult<MatchedLeadItem>> {
    await this.ensureReady();
    const reqRes = await this.pool.query(
      "SELECT * FROM public.requirements WHERE status = 'active' ORDER BY created_at DESC"
    );
    const invRes = await this.pool.query(
      "SELECT * FROM public.properties WHERE broker_id = $1 AND availability = 'available'",
      [filters.brokerId]
    );
    const propRes = await this.pool.query<{ requirement_id: string; contact_shared: boolean; status: string }>(
      'SELECT requirement_id, contact_shared, status FROM public.proposals WHERE broker_id = $1',
      [filters.brokerId]
    );

    const inventory = invRes.rows.map((r) => this.mapProperty(r));
    const proposedSet = new Set(propRes.rows.map((p) => p.requirement_id));
    const consentSet = new Set(
      propRes.rows.filter((p) => p.contact_shared || p.status === 'accepted').map((p) => p.requirement_id)
    );

    let items: MatchedLeadItem[] = reqRes.rows
      .map((r) => this.mapRequirement(r))
      .map((req) =>
        consentSet.has(req.id) || req.seekerId === filters.brokerId
          ? req
          : { ...req, seekerPhone: '', seekerEmail: '' }
      )
      .filter((req) => {
        if (filters.intent && filters.intent !== 'All' && req.intent !== filters.intent) return false;
        if (filters.propertyType && filters.propertyType !== 'All' && req.propertyType !== filters.propertyType) return false;
        if (filters.bedrooms && filters.bedrooms !== 'All') {
          if (filters.bedrooms >= 4 ? req.bedrooms < 4 : req.bedrooms !== filters.bedrooms) return false;
        }
        if (filters.locality && filters.locality !== 'All') {
          if (!req.localities.some((l) => l.toLowerCase() === filters.locality!.toLowerCase())) return false;
        }
        if (filters.query && filters.query.trim()) {
          const q = filters.query.trim().toLowerCase();
          const hay = `${req.seekerName} ${req.localities.join(' ')} ${req.notes} ${req.amenities.join(' ')}`.toLowerCase();
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
    const offset = filters.cursor ? Math.max(0, Number.parseInt(filters.cursor, 10) || 0) : 0;
    const page = items.slice(offset, offset + limit);
    return {
      items: page,
      nextCursor: offset + limit < total ? String(offset + limit) : null,
      total,
    };
  }

  async listProposalsForSeeker(seekerId: string, requirementId?: string): Promise<Proposal[]> {
    await this.ensureReady();
    const res = requirementId
      ? await this.pool.query(
          'SELECT * FROM public.proposals WHERE seeker_id = $1 AND requirement_id = $2 ORDER BY created_at DESC',
          [seekerId, requirementId]
        )
      : await this.pool.query(
          'SELECT * FROM public.proposals WHERE seeker_id = $1 ORDER BY created_at DESC',
          [seekerId]
        );
    return res.rows.map((r) => this.mapProposal(r));
  }

  async listProposalsForBroker(brokerId: string): Promise<Proposal[]> {
    await this.ensureReady();
    const res = await this.pool.query(
      'SELECT * FROM public.proposals WHERE broker_id = $1 ORDER BY created_at DESC',
      [brokerId]
    );
    return res.rows.map((r) => this.mapProposal(r));
  }

  async getProposalById(id: string): Promise<Proposal | null> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT * FROM public.proposals WHERE id = $1', [id]);
    return res.rows[0] ? this.mapProposal(res.rows[0]) : null;
  }

  async createProposal(broker: User, input: CreateProposalInput): Promise<Proposal> {
    await this.ensureReady();
    if (broker.role !== 'broker') {
      throw new AppError('Only brokers can submit property proposals.', 403, 'FORBIDDEN');
    }
    const requirement = await this.getRequirementById(input.requirementId);
    const property = await this.getPropertyById(input.propertyId);
    if (!requirement || !property) throw new AppError('Requirement or property not found', 404, 'NOT_FOUND');
    if (property.brokerId !== broker.id) {
      throw new AppError('You can only propose properties from your own inventory.', 403, 'FORBIDDEN');
    }
    if (property.availability !== 'available') {
      throw new AppError(`Cannot propose this property because its status is currently "${property.availability}".`, 400, 'PROPERTY_UNAVAILABLE');
    }
    const dup = await this.pool.query(
      'SELECT 1 FROM public.proposals WHERE requirement_id = $1 AND property_id = $2 LIMIT 1',
      [input.requirementId, input.propertyId]
    );
    if (dup.rows.length > 0) {
      throw new AppError('You have already proposed this property for this customer requirement.', 409, 'DUPLICATE_PROPOSAL');
    }

    const match = computePropertyMatch(requirement, { ...property, price: input.proposedPrice });
    const id = makeId('prop-pos');
    const whyMatches = input.whyMatches?.trim() || match.reasons.slice(0, 2).join(' · ') || null;
    const matchReasons = match.reasons.length > 0 ? match.reasons : match.warnings;

    await this.withTransaction(async (client) => {
      await client.query(
        `INSERT INTO public.proposals (
          id, requirement_id, property_id, broker_id, seeker_id, proposed_price,
          brokerage_charge, message, why_matches, availability_confirmed, contact_shared,
          status, status_detail, viewed_at, match_score, match_reasons, is_demo
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,'pending','Sent',null,$11,$12,false)`,
        [
          id,
          input.requirementId,
          input.propertyId,
          broker.id,
          requirement.seekerId,
          input.proposedPrice,
          input.brokerageCharge.trim(),
          input.message.trim(),
          whyMatches,
          Boolean(input.availabilityConfirmed),
          match.score,
          matchReasons,
        ]
      );
      await client.query(
        `INSERT INTO public.notifications (id, user_id, type, title, body, related_id)
         VALUES ($1,$2,'proposal_received',$3,$4,$5)`,
        [
          makeId('notif'),
          requirement.seekerId,
          `New property proposal for ${requirement.bedrooms} BHK ${requirement.propertyType}`,
          `${property.brokerName} pitched "${property.title}" (${match.score}% match).`,
          id,
        ]
      );
    });
    const created = await this.getProposalById(id);
    if (!created) throw new AppError('Failed to create proposal', 500, 'INTERNAL_ERROR');
    return created;
  }

  async updateProposal(id: string, actor: User, updates: UpdateProposalInput): Promise<Proposal | null> {
    await this.ensureReady();
    const existing = await this.getProposalById(id);
    if (!existing) return null;
    if (actor.id !== existing.seekerId && actor.id !== existing.brokerId) {
      throw new AppError('Unauthorized proposal update', 403, 'FORBIDDEN');
    }
    if (
      actor.id !== existing.seekerId &&
      (updates.status !== undefined || updates.contactShared !== undefined || updates.markViewed !== undefined)
    ) {
      throw new AppError('Only the home seeker can update proposal interest or contact sharing.', 403, 'FORBIDDEN');
    }

    const next = { ...existing };
    await this.withTransaction(async (client) => {
      const propRes = await client.query<{ title: string }>('SELECT title FROM public.properties WHERE id = $1', [existing.propertyId]);
      const propTitle = propRes.rows[0]?.title || 'your property';

      if (updates.markViewed && !existing.viewedAt) {
        next.viewedAt = new Date().toISOString();
        if (!next.statusDetail || next.statusDetail === 'Sent') next.statusDetail = 'Viewed';
        await client.query(
          `INSERT INTO public.notifications (id, user_id, type, title, body, related_id) VALUES ($1,$2,'proposal_viewed',$3,$4,$5)`,
          [makeId('notif'), existing.brokerId, `Proposal viewed: ${propTitle}`, 'The home seeker opened your property proposal.', existing.id]
        );
      }

      if (updates.status) {
        next.status = updates.status;
        if (updates.status === 'shortlisted') {
          next.statusDetail = 'Interested';
          await client.query(
            `INSERT INTO public.notifications (id, user_id, type, title, body, related_id) VALUES ($1,$2,'customer_interested',$3,$4,$5)`,
            [makeId('notif'), existing.brokerId, `Customer interested in ${propTitle}`, 'The seeker shortlisted your proposal.', existing.id]
          );
        } else if (updates.status === 'accepted') {
          next.statusDetail = 'Interested';
          next.contactShared = true;
          await client.query(
            `INSERT INTO public.notifications (id, user_id, type, title, body, related_id) VALUES ($1,$2,'contact_shared',$3,$4,$5)`,
            [makeId('notif'), existing.brokerId, 'Proposal accepted & contact shared', `Seeker accepted "${propTitle}" and shared private contact details.`, existing.id]
          );
          if (existing.status !== 'accepted') {
            await client.query(
              'UPDATE public.broker_profiles SET closed_deals_count = closed_deals_count + 1 WHERE user_id = $1',
              [existing.brokerId]
            );
          }
        } else if (updates.status === 'declined') {
          next.statusDetail = 'Rejected';
        }
      }

      if (updates.statusDetail) next.statusDetail = updates.statusDetail;
      if (typeof updates.contactShared === 'boolean') {
        next.contactShared = updates.contactShared;
        if (updates.contactShared && !existing.contactShared) {
          await client.query(
            `INSERT INTO public.notifications (id, user_id, type, title, body, related_id) VALUES ($1,$2,'contact_shared',$3,$4,$5)`,
            [makeId('notif'), existing.brokerId, 'Seeker shared contact details', `Contact details unlocked for ${propTitle}.`, existing.id]
          );
        }
      }

      await client.query(
        'UPDATE public.proposals SET status=$1, status_detail=$2, contact_shared=$3, viewed_at=$4 WHERE id=$5',
        [next.status, next.statusDetail ?? null, Boolean(next.contactShared), next.viewedAt ?? null, id]
      );
    });

    return this.getProposalById(id);
  }

  async listVisitsForUser(userId: string, role: UserRole): Promise<Visit[]> {
    await this.ensureReady();
    const col = role === 'broker' ? 'broker_id' : 'seeker_id';
    const res = await this.pool.query(
      `SELECT * FROM public.visits WHERE ${col} = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows.map((r) => this.mapVisit(r));
  }

  async createVisit(seeker: User, input: CreateVisitInput): Promise<Visit> {
    await this.ensureReady();
    const prop = await this.getPropertyById(input.propertyId);
    if (!prop) throw new AppError('Property not found', 404, 'NOT_FOUND');

    const id = makeId('visit');
    await this.withTransaction(async (client) => {
      await client.query(
        `INSERT INTO public.visits (id, property_id, proposal_id, seeker_id, seeker_name, broker_id, date, time_slot, notes, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'requested')`,
        [id, prop.id, input.proposalId ?? null, seeker.id, seeker.name, prop.brokerId, input.date, input.timeSlot, input.notes ?? null]
      );
      await client.query(
        `UPDATE public.proposals SET status_detail = 'Visit Requested' WHERE property_id = $1 AND seeker_id = $2`,
        [prop.id, seeker.id]
      );
      await client.query(
        `INSERT INTO public.notifications (id, user_id, type, title, body, related_id) VALUES ($1,$2,'visit_requested',$3,$4,$5)`,
        [makeId('notif'), prop.brokerId, `Visit requested for ${prop.title}`, `${seeker.name} requested a viewing on ${input.date} at ${input.timeSlot}.`, id]
      );
    });
    const res = await this.pool.query('SELECT * FROM public.visits WHERE id = $1', [id]);
    return this.mapVisit(res.rows[0]);
  }

  async updateVisitStatus(visitId: string, actor: User, status: VisitStatus): Promise<Visit | null> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT * FROM public.visits WHERE id = $1', [visitId]);
    if (!res.rows[0]) return null;
    const existing = this.mapVisit(res.rows[0]);
    if (actor.id !== existing.brokerId && actor.id !== existing.seekerId) {
      throw new AppError('Unauthorized visit update', 403, 'FORBIDDEN');
    }
    if ((status === 'confirmed' || status === 'completed') && actor.id !== existing.brokerId) {
      throw new AppError('Only the listing broker can confirm or complete a visit.', 403, 'FORBIDDEN');
    }

    await this.withTransaction(async (client) => {
      await client.query('UPDATE public.visits SET status = $1 WHERE id = $2', [status, visitId]);
      const propRes = await client.query<{ title: string }>('SELECT title FROM public.properties WHERE id = $1', [existing.propertyId]);
      const title = propRes.rows[0]?.title || 'property';
      if (status === 'confirmed') {
        await client.query(`UPDATE public.proposals SET status_detail = 'Visit Scheduled' WHERE property_id = $1 AND seeker_id = $2`, [existing.propertyId, existing.seekerId]);
        await client.query(
          `INSERT INTO public.notifications (id, user_id, type, title, body, related_id) VALUES ($1,$2,'visit_confirmed',$3,$4,$5)`,
          [makeId('notif'), existing.seekerId, `Visit confirmed for ${title}`, `Broker confirmed your tour on ${existing.date} at ${existing.timeSlot}.`, existing.id]
        );
      } else if (status === 'completed') {
        await client.query(`UPDATE public.proposals SET status_detail = 'Closed' WHERE property_id = $1 AND seeker_id = $2`, [existing.propertyId, existing.seekerId]);
      }
    });

    const updated = await this.pool.query('SELECT * FROM public.visits WHERE id = $1', [visitId]);
    return this.mapVisit(updated.rows[0]);
  }

  async listMessagesForProperty(propertyId: string, viewerId?: string): Promise<Message[]> {
    await this.ensureReady();
    if (!viewerId) return [];
    const res = await this.pool.query(
      'SELECT * FROM public.messages WHERE property_id = $1 AND (sender_id = $2 OR recipient_id = $2) ORDER BY created_at ASC',
      [propertyId, viewerId]
    );
    return res.rows.map((r) => this.mapMessage(r));
  }

  async listMessagesForUser(userId: string): Promise<Message[]> {
    await this.ensureReady();
    const res = await this.pool.query(
      'SELECT * FROM public.messages WHERE sender_id = $1 OR recipient_id = $1 ORDER BY created_at ASC',
      [userId]
    );
    return res.rows.map((r) => this.mapMessage(r));
  }

  async createMessage(sender: User, input: CreateMessageInput): Promise<Message> {
    await this.ensureReady();
    if (sender.id === input.recipientId) {
      throw new AppError('Cannot send a message to yourself', 400, 'BAD_REQUEST');
    }
    const id = makeId('msg');
    const res = await this.pool.query(
      `INSERT INTO public.messages (id, proposal_id, property_id, sender_id, sender_name, sender_role, recipient_id, body)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, input.proposalId ?? null, input.propertyId, sender.id, sender.name, sender.role, input.recipientId, input.body.trim()]
    );
    return this.mapMessage(res.rows[0]);
  }

  async getSavedPropertyIds(userId: string): Promise<string[]> {
    await this.ensureReady();
    const res = await this.pool.query<{ property_id: string }>(
      'SELECT property_id FROM public.saved_properties WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return res.rows.map((r) => r.property_id);
  }

  async listSavedProperties(userId: string): Promise<Property[]> {
    await this.ensureReady();
    const res = await this.pool.query(
      `SELECT p.* FROM public.properties p
       INNER JOIN public.saved_properties sp ON sp.property_id = p.id
       WHERE sp.user_id = $1 ORDER BY sp.created_at DESC`,
      [userId]
    );
    return res.rows.map((r) => this.mapProperty(r));
  }

  async toggleSavedProperty(userId: string, propertyId: string): Promise<string[]> {
    await this.ensureReady();
    const prop = await this.getPropertyById(propertyId);
    if (!prop) throw new AppError('Property not found', 404, 'NOT_FOUND');
    const existing = await this.pool.query(
      'SELECT 1 FROM public.saved_properties WHERE user_id = $1 AND property_id = $2',
      [userId, propertyId]
    );
    if (existing.rows.length > 0) {
      await this.pool.query(
        'DELETE FROM public.saved_properties WHERE user_id = $1 AND property_id = $2',
        [userId, propertyId]
      );
    } else {
      await this.pool.query(
        'INSERT INTO public.saved_properties (user_id, property_id) VALUES ($1,$2)',
        [userId, propertyId]
      );
    }
    return this.getSavedPropertyIds(userId);
  }

  async listNotificationsForUser(userId: string): Promise<AppNotification[]> {
    await this.ensureReady();
    const res = await this.pool.query(
      'SELECT * FROM public.notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    return res.rows.map((r) => this.mapNotification(r));
  }

  async markNotificationsRead(userId: string, notificationId?: string): Promise<void> {
    await this.ensureReady();
    if (notificationId) {
      await this.pool.query('UPDATE public.notifications SET read = true WHERE id = $1 AND user_id = $2', [notificationId, userId]);
    } else {
      await this.pool.query('UPDATE public.notifications SET read = true WHERE user_id = $1', [userId]);
    }
  }

  async listReviewsForBroker(brokerId: string): Promise<BrokerReview[]> {
    await this.ensureReady();
    const res = await this.pool.query(
      'SELECT * FROM public.broker_reviews WHERE broker_id = $1 ORDER BY created_at DESC',
      [brokerId]
    );
    return res.rows.map((r) => this.mapReview(r));
  }

  async createReview(author: User, input: CreateReviewInput): Promise<BrokerReview> {
    await this.ensureReady();
    if (author.id === input.brokerId) {
      throw new AppError('Brokers cannot leave reviews on their own profile.', 403, 'FORBIDDEN');
    }
    const broker = await this.getUserById(input.brokerId);
    if (!broker || broker.role !== 'broker') {
      throw new AppError('Broker not found', 404, 'NOT_FOUND');
    }
    const id = makeId('rev');
    const res = await this.pool.query(
      `INSERT INTO public.broker_reviews (id, broker_id, author_id, author_name, rating, comment, locality)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, input.brokerId, author.id, author.name, input.rating, input.comment.trim(), input.locality?.trim() || null]
    );
    return this.mapReview(res.rows[0]);
  }
}
