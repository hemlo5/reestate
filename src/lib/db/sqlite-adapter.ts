import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
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

function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export class SqliteDbAdapter implements DbAdapter {
  private readonly db: DatabaseSync;
  private readyPromise: Promise<void> | null = null;

  constructor(dbPath?: string) {
    const resolved =
      dbPath ?? path.resolve(process.cwd(), 'data', 'housed.sqlite');
    if (resolved !== ':memory:') {
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
    }
    this.db = new DatabaseSync(resolved);
    this.db.exec('PRAGMA busy_timeout = 10000;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    if (resolved !== ':memory:') {
      this.db.exec('PRAGMA journal_mode = WAL;');
    }
    this.createSchema();
  }

  private createSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        phone TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL CHECK (role IN ('seeker', 'broker')),
        city TEXT NOT NULL DEFAULT 'Bengaluru',
        avatar_url TEXT,
        auth_method TEXT NOT NULL DEFAULT 'password',
        password_hash TEXT,
        is_demo INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

      CREATE TABLE IF NOT EXISTS broker_profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        is_independent INTEGER NOT NULL DEFAULT 0,
        agency_name TEXT NOT NULL DEFAULT '',
        agency_address TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        operating_localities_json TEXT NOT NULL DEFAULT '[]',
        property_categories_json TEXT NOT NULL DEFAULT '[]',
        specializations_json TEXT NOT NULL DEFAULT '[]',
        years_experience INTEGER NOT NULL DEFAULT 1,
        properties_managed_count INTEGER NOT NULL DEFAULT 0,
        website TEXT,
        rera_id TEXT,
        avatar_url TEXT,
        verification_status TEXT NOT NULL DEFAULT 'pending',
        verified INTEGER NOT NULL DEFAULT 0,
        bio TEXT NOT NULL DEFAULT '',
        closed_deals_count INTEGER NOT NULL DEFAULT 0,
        verification_docs_json TEXT
      );

      CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY,
        broker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        broker_name TEXT NOT NULL,
        broker_agency TEXT,
        broker_phone TEXT NOT NULL DEFAULT '',
        broker_verified INTEGER NOT NULL DEFAULT 0,
        title TEXT NOT NULL,
        intent TEXT NOT NULL CHECK (intent IN ('rent', 'buy')),
        transaction_type TEXT,
        listing_category TEXT,
        locality TEXT NOT NULL,
        city TEXT NOT NULL DEFAULT 'Bengaluru',
        pincode TEXT,
        landmark TEXT,
        address TEXT NOT NULL,
        price INTEGER NOT NULL,
        security_deposit INTEGER,
        maintenance_charges INTEGER,
        price_per_sqft INTEGER,
        brokerage_amount REAL,
        brokerage_type TEXT,
        deposit_or_maintenance TEXT,
        brokerage_fee TEXT NOT NULL DEFAULT '',
        property_type TEXT NOT NULL CHECK (property_type IN ('Flat', 'House', 'Room')),
        bedrooms INTEGER NOT NULL DEFAULT 2,
        bathrooms INTEGER NOT NULL DEFAULT 2,
        area_sqft INTEGER NOT NULL DEFAULT 1000,
        carpet_area_sqft INTEGER,
        built_up_area_sqft INTEGER,
        floor_info TEXT NOT NULL DEFAULT '',
        floor_number INTEGER,
        total_floors INTEGER,
        furnishing TEXT NOT NULL,
        parking TEXT,
        balconies INTEGER,
        property_age TEXT,
        available_from TEXT NOT NULL DEFAULT 'Immediate',
        amenities_json TEXT NOT NULL DEFAULT '[]',
        description TEXT NOT NULL DEFAULT '',
        additional_info TEXT,
        selling_points_json TEXT NOT NULL DEFAULT '[]',
        video_tour_url TEXT,
        images_json TEXT NOT NULL DEFAULT '[]',
        availability TEXT NOT NULL DEFAULT 'available',
        is_demo INTEGER NOT NULL DEFAULT 0,
        map_x REAL NOT NULL DEFAULT 50,
        map_y REAL NOT NULL DEFAULT 50,
        lat REAL,
        lng REAL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS properties_search_idx
        ON properties(availability, intent, locality, price, bedrooms);
      CREATE INDEX IF NOT EXISTS properties_broker_idx
        ON properties(broker_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS requirements (
        id TEXT PRIMARY KEY,
        seeker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seeker_name TEXT NOT NULL,
        seeker_phone TEXT NOT NULL DEFAULT '',
        seeker_email TEXT NOT NULL DEFAULT '',
        intent TEXT NOT NULL CHECK (intent IN ('rent', 'buy')),
        localities_json TEXT NOT NULL DEFAULT '[]',
        budget_min INTEGER NOT NULL,
        budget_max INTEGER NOT NULL,
        property_type TEXT NOT NULL CHECK (property_type IN ('Flat', 'House', 'Room')),
        bedrooms INTEGER NOT NULL DEFAULT 2,
        furnishing TEXT NOT NULL DEFAULT 'Any',
        move_in_date TEXT NOT NULL DEFAULT '',
        amenities_json TEXT NOT NULL DEFAULT '[]',
        notes TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        is_demo INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS requirements_seeker_idx ON requirements(seeker_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS requirements_status_idx ON requirements(status, intent, created_at DESC);

      CREATE TABLE IF NOT EXISTS proposals (
        id TEXT PRIMARY KEY,
        requirement_id TEXT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        broker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seeker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        proposed_price INTEGER NOT NULL,
        brokerage_charge TEXT NOT NULL DEFAULT '',
        message TEXT NOT NULL DEFAULT '',
        why_matches TEXT,
        availability_confirmed INTEGER NOT NULL DEFAULT 1,
        contact_shared INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        status_detail TEXT DEFAULT 'Sent',
        viewed_at TEXT,
        match_score INTEGER NOT NULL DEFAULT 0,
        match_reasons_json TEXT NOT NULL DEFAULT '[]',
        is_demo INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE(requirement_id, property_id)
      );
      CREATE INDEX IF NOT EXISTS proposals_seeker_idx ON proposals(seeker_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS proposals_broker_idx ON proposals(broker_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS visits (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
        seeker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seeker_name TEXT NOT NULL,
        broker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'requested',
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS visits_seeker_idx ON visits(seeker_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS visits_broker_idx ON visits(broker_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sender_name TEXT NOT NULL,
        sender_role TEXT NOT NULL,
        recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS messages_property_idx ON messages(property_id, created_at ASC);

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        related_id TEXT,
        read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, read, created_at DESC);

      CREATE TABLE IF NOT EXISTS broker_reviews (
        id TEXT PRIMARY KEY,
        broker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        author_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT NOT NULL,
        locality TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS reviews_broker_idx ON broker_reviews(broker_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS saved_properties (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        PRIMARY KEY (user_id, property_id)
      );
    `);
  }

  private async ensureReady(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise = this.seedIfEmpty();
    }
    return this.readyPromise;
  }

  private async seedIfEmpty(): Promise<void> {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
    if (row.cnt > 0) return;

    const demoHash = await hashPassword('housed123');
    const seed = createSeedPayload(demoHash);

    this.withTransaction(() => {
      const recheck = this.db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
      if (recheck.cnt > 0) return;

      const insertUser = this.db.prepare(`
        INSERT INTO users (id, name, email, phone, role, city, avatar_url, auth_method, password_hash, is_demo, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertBrokerProfile = this.db.prepare(`
        INSERT INTO broker_profiles (
          user_id, is_independent, agency_name, agency_address, phone,
          operating_localities_json, property_categories_json, specializations_json,
          years_experience, properties_managed_count, website, rera_id, avatar_url,
          verification_status, verified, bio, closed_deals_count, verification_docs_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = new Date().toISOString();
      for (const u of seed.users) {
        insertUser.run(
          u.id,
          u.name,
          u.email,
          u.phone,
          u.role,
          u.city,
          u.avatarUrl ?? null,
          u.authMethod ?? 'password',
          u.passwordHash ?? null,
          u.isDemo ? 1 : 0,
          now
        );
        if (u.brokerProfile) {
          const bp = u.brokerProfile;
          insertBrokerProfile.run(
            u.id,
            bp.isIndependent ? 1 : 0,
            bp.agencyName ?? '',
            bp.agencyAddress ?? '',
            bp.phone,
            JSON.stringify(bp.operatingLocalities),
            JSON.stringify(bp.propertyCategories),
            JSON.stringify(bp.specializations ?? []),
            bp.yearsExperience,
            bp.propertiesManagedCount ?? 0,
            bp.website ?? null,
            bp.reraId ?? null,
            bp.avatarUrl ?? null,
            bp.verificationStatus ?? (bp.verified ? 'verified' : 'pending'),
            bp.verified ? 1 : 0,
            bp.bio ?? '',
            bp.closedDealsCount,
            bp.verificationDocs ? JSON.stringify(bp.verificationDocs) : null
          );
        }
      }

      const insertProperty = this.db.prepare(`
        INSERT INTO properties (
          id, broker_id, broker_name, broker_agency, broker_phone, broker_verified,
          title, intent, transaction_type, listing_category, locality, city, pincode, landmark, address,
          price, security_deposit, maintenance_charges, price_per_sqft, brokerage_amount, brokerage_type,
          deposit_or_maintenance, brokerage_fee, property_type, bedrooms, bathrooms, area_sqft,
          carpet_area_sqft, built_up_area_sqft, floor_info, floor_number, total_floors,
          furnishing, parking, balconies, property_age, available_from, amenities_json,
          description, additional_info, selling_points_json, video_tour_url, images_json,
          availability, is_demo, map_x, map_y, lat, lng, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const p of seed.properties) {
        insertProperty.run(
          p.id,
          p.brokerId,
          p.brokerName,
          p.brokerAgency ?? null,
          p.brokerPhone,
          p.brokerVerified ? 1 : 0,
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
          JSON.stringify(p.amenities),
          p.description,
          p.additionalInfo ?? null,
          JSON.stringify(p.sellingPoints ?? []),
          p.videoTourUrl ?? null,
          JSON.stringify(p.images),
          p.availability,
          p.isDemo ? 1 : 0,
          p.mapX,
          p.mapY,
          p.lat ?? null,
          p.lng ?? null,
          p.createdAt
        );
      }

      const insertReq = this.db.prepare(`
        INSERT INTO requirements (
          id, seeker_id, seeker_name, seeker_phone, seeker_email, intent,
          localities_json, budget_min, budget_max, property_type, bedrooms,
          furnishing, move_in_date, amenities_json, notes, status, is_demo, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const r of seed.requirements) {
        insertReq.run(
          r.id,
          r.seekerId,
          r.seekerName,
          r.seekerPhone,
          r.seekerEmail,
          r.intent,
          JSON.stringify(r.localities),
          r.budgetMin,
          r.budgetMax,
          r.propertyType,
          r.bedrooms,
          r.furnishing,
          r.moveInDate,
          JSON.stringify(r.amenities),
          r.notes,
          r.status,
          r.isDemo ? 1 : 0,
          r.createdAt
        );
      }

      const insertProposal = this.db.prepare(`
        INSERT INTO proposals (
          id, requirement_id, property_id, broker_id, seeker_id, proposed_price,
          brokerage_charge, message, why_matches, availability_confirmed, contact_shared,
          status, status_detail, viewed_at, match_score, match_reasons_json, is_demo, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const pr of seed.proposals) {
        insertProposal.run(
          pr.id,
          pr.requirementId,
          pr.propertyId,
          pr.brokerId,
          pr.seekerId,
          pr.proposedPrice,
          pr.brokerageCharge,
          pr.message,
          pr.whyMatches ?? null,
          pr.availabilityConfirmed === false ? 0 : 1,
          pr.contactShared ? 1 : 0,
          pr.status,
          pr.statusDetail ?? 'Sent',
          pr.viewedAt ?? null,
          pr.matchScore,
          JSON.stringify(pr.matchReasons),
          pr.isDemo ? 1 : 0,
          pr.createdAt
        );
      }

      const insertVisit = this.db.prepare(`
        INSERT INTO visits (id, property_id, proposal_id, seeker_id, seeker_name, broker_id, date, time_slot, notes, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const v of seed.visits) {
        insertVisit.run(
          v.id,
          v.propertyId,
          v.proposalId ?? null,
          v.seekerId,
          v.seekerName,
          v.brokerId,
          v.date,
          v.timeSlot,
          v.notes ?? null,
          v.status,
          v.createdAt
        );
      }

      const insertMsg = this.db.prepare(`
        INSERT INTO messages (id, proposal_id, property_id, sender_id, sender_name, sender_role, recipient_id, body, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const m of seed.messages) {
        insertMsg.run(
          m.id,
          m.proposalId ?? null,
          m.propertyId,
          m.senderId,
          m.senderName,
          m.senderRole,
          m.recipientId,
          m.body,
          m.createdAt
        );
      }

      const insertNotif = this.db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, body, related_id, read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const n of seed.notifications) {
        insertNotif.run(
          n.id,
          n.userId,
          n.type,
          n.title,
          n.body,
          n.relatedId ?? null,
          n.read ? 1 : 0,
          n.createdAt
        );
      }

      const insertReview = this.db.prepare(`
        INSERT INTO broker_reviews (id, broker_id, author_id, author_name, rating, comment, locality, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const rv of seed.reviews) {
        insertReview.run(
          rv.id,
          rv.brokerId,
          rv.authorId,
          rv.authorName,
          rv.rating,
          rv.comment,
          rv.locality ?? null,
          rv.createdAt
        );
      }

      const insertSaved = this.db.prepare(`
        INSERT INTO saved_properties (user_id, property_id, created_at)
        VALUES (?, ?, ?)
      `);
      for (const pair of seed.savedPairs) {
        insertSaved.run(pair.userId, pair.propertyId, now);
      }
    });
  }

  private withTransaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      const result = fn();
      this.db.exec('COMMIT;');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  private mapUserRow(
    userRow: Record<string, unknown>,
    bpRow?: Record<string, unknown> | undefined
  ): StoredUser {
    const brokerProfile: BrokerProfile | undefined = bpRow
      ? {
          isIndependent: Boolean(bpRow.is_independent),
          agencyName: (bpRow.agency_name as string) || '',
          agencyAddress: (bpRow.agency_address as string) || '',
          phone: (bpRow.phone as string) || '',
          operatingLocalities: parseJson(bpRow.operating_localities_json, []),
          propertyCategories: parseJson(bpRow.property_categories_json, []),
          specializations: parseJson(bpRow.specializations_json, []),
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
          verificationDocs: parseJson(bpRow.verification_docs_json, undefined),
        }
      : undefined;

    return {
      id: userRow.id as string,
      name: userRow.name as string,
      email: userRow.email as string,
      phone: (userRow.phone as string) || '',
      role: userRow.role as UserRole,
      city: (userRow.city as string) || 'Bengaluru',
      avatarUrl: (userRow.avatar_url as string | null) ?? undefined,
      authMethod: (userRow.auth_method as 'password' | 'otp') ?? 'password',
      passwordHash: (userRow.password_hash as string | null) ?? null,
      isDemo: Boolean(userRow.is_demo),
      ...(brokerProfile ? { brokerProfile } : {}),
    };
  }

  private mapPropertyRow(row: Record<string, unknown>): Property {
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
        (row.transaction_type as Property['transactionType'] | null) ?? undefined,
      listingCategory:
        (row.listing_category as Property['listingCategory'] | null) ?? undefined,
      locality: row.locality as string,
      city: (row.city as string | null) ?? 'Bengaluru',
      pincode: (row.pincode as string | null) ?? undefined,
      landmark: (row.landmark as string | null) ?? undefined,
      address: row.address as string,
      price: Number(row.price),
      securityDeposit:
        row.security_deposit !== null && row.security_deposit !== undefined
          ? Number(row.security_deposit)
          : undefined,
      maintenanceCharges:
        row.maintenance_charges !== null && row.maintenance_charges !== undefined
          ? Number(row.maintenance_charges)
          : undefined,
      pricePerSqFt:
        row.price_per_sqft !== null && row.price_per_sqft !== undefined
          ? Number(row.price_per_sqft)
          : undefined,
      brokerageAmount:
        row.brokerage_amount !== null && row.brokerage_amount !== undefined
          ? Number(row.brokerage_amount)
          : undefined,
      brokerageType:
        (row.brokerage_type as Property['brokerageType'] | null) ?? undefined,
      depositOrMaintenance:
        (row.deposit_or_maintenance as string | null) ?? undefined,
      brokerageFee: (row.brokerage_fee as string) || '',
      propertyType: row.property_type as PropertyCategory,
      bedrooms: Number(row.bedrooms),
      bathrooms: Number(row.bathrooms),
      areaSqFt: Number(row.area_sqft),
      carpetAreaSqFt:
        row.carpet_area_sqft !== null && row.carpet_area_sqft !== undefined
          ? Number(row.carpet_area_sqft)
          : undefined,
      builtUpAreaSqFt:
        row.built_up_area_sqft !== null && row.built_up_area_sqft !== undefined
          ? Number(row.built_up_area_sqft)
          : undefined,
      floorInfo: (row.floor_info as string) || '',
      floorNumber:
        row.floor_number !== null && row.floor_number !== undefined
          ? Number(row.floor_number)
          : undefined,
      totalFloors:
        row.total_floors !== null && row.total_floors !== undefined
          ? Number(row.total_floors)
          : undefined,
      furnishing: row.furnishing as Property['furnishing'],
      parking: (row.parking as string | null) ?? undefined,
      balconies:
        row.balconies !== null && row.balconies !== undefined
          ? Number(row.balconies)
          : undefined,
      propertyAge: (row.property_age as string | null) ?? undefined,
      availableFrom: (row.available_from as string) || 'Immediate',
      amenities: parseJson(row.amenities_json, []),
      description: (row.description as string) || '',
      additionalInfo: (row.additional_info as string | null) ?? undefined,
      sellingPoints: parseJson(row.selling_points_json, []),
      videoTourUrl: (row.video_tour_url as string | null) ?? undefined,
      images: parseJson(row.images_json, []),
      availability: row.availability as Property['availability'],
      isDemo: Boolean(row.is_demo),
      mapX: Number(row.map_x ?? 50),
      mapY: Number(row.map_y ?? 50),
      lat:
        row.lat !== null && row.lat !== undefined ? Number(row.lat) : undefined,
      lng:
        row.lng !== null && row.lng !== undefined ? Number(row.lng) : undefined,
      createdAt: row.created_at as string,
    };
  }

  private mapRequirementRow(row: Record<string, unknown>): Requirement {
    return {
      id: row.id as string,
      seekerId: row.seeker_id as string,
      seekerName: row.seeker_name as string,
      seekerPhone: (row.seeker_phone as string) || '',
      seekerEmail: (row.seeker_email as string) || '',
      intent: row.intent as Requirement['intent'],
      localities: parseJson(row.localities_json, []),
      budgetMin: Number(row.budget_min),
      budgetMax: Number(row.budget_max),
      propertyType: row.property_type as Requirement['propertyType'],
      bedrooms: Number(row.bedrooms),
      furnishing: row.furnishing as Requirement['furnishing'],
      moveInDate: (row.move_in_date as string) || '',
      amenities: parseJson(row.amenities_json, []),
      notes: (row.notes as string) || '',
      status: row.status as Requirement['status'],
      isDemo: Boolean(row.is_demo),
      createdAt: row.created_at as string,
    };
  }

  private mapProposalRow(row: Record<string, unknown>): Proposal {
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
      statusDetail:
        (row.status_detail as Proposal['statusDetail'] | null) ?? undefined,
      viewedAt: (row.viewed_at as string | null) ?? undefined,
      matchScore: Number(row.match_score),
      matchReasons: parseJson(row.match_reasons_json, []),
      isDemo: Boolean(row.is_demo),
      createdAt: row.created_at as string,
    };
  }

  private mapVisitRow(row: Record<string, unknown>): Visit {
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
      createdAt: row.created_at as string,
    };
  }

  private mapMessageRow(row: Record<string, unknown>): Message {
    return {
      id: row.id as string,
      proposalId: (row.proposal_id as string | null) ?? undefined,
      propertyId: row.property_id as string,
      senderId: row.sender_id as string,
      senderName: row.sender_name as string,
      senderRole: row.sender_role as UserRole,
      recipientId: row.recipient_id as string,
      body: row.body as string,
      createdAt: row.created_at as string,
    };
  }

  private mapNotificationRow(row: Record<string, unknown>): AppNotification {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      type: row.type as AppNotification['type'],
      title: row.title as string,
      body: row.body as string,
      relatedId: (row.related_id as string | null) ?? undefined,
      read: Boolean(row.read),
      createdAt: row.created_at as string,
    };
  }

  private mapReviewRow(row: Record<string, unknown>): BrokerReview {
    return {
      id: row.id as string,
      brokerId: row.broker_id as string,
      authorId: row.author_id as string,
      authorName: row.author_name as string,
      rating: Number(row.rating),
      comment: row.comment as string,
      locality: (row.locality as string | null) ?? undefined,
      createdAt: row.created_at as string,
    };
  }

  private pushNotificationSync(
    payload: Omit<AppNotification, 'id' | 'read' | 'createdAt'>
  ): void {
    this.db
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, related_id, read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
      )
      .run(
        makeId('notif'),
        payload.userId,
        payload.type,
        payload.title,
        payload.body,
        payload.relatedId ?? null,
        new Date().toISOString()
      );
  }

  private maskRequirementForViewer(req: Requirement, viewerId?: string): Requirement {
    if (viewerId && viewerId === req.seekerId) return req;
    if (viewerId) {
      const consent = this.db
        .prepare(
          `SELECT 1 FROM proposals
           WHERE requirement_id = ? AND broker_id = ? AND (contact_shared = 1 OR status = 'accepted')
           LIMIT 1`
        )
        .get(req.id, viewerId);
      if (consent) return req;
    }
    return {
      ...req,
      seekerPhone: '',
      seekerEmail: '',
    };
  }

  async getUserById(id: string): Promise<StoredUser | null> {
    await this.ensureReady();
    const row = this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    const bpRow =
      row.role === 'broker'
        ? (this.db
            .prepare('SELECT * FROM broker_profiles WHERE user_id = ?')
            .get(id) as Record<string, unknown> | undefined)
        : undefined;
    return this.mapUserRow(row, bpRow);
  }

  async getUserByEmail(email: string): Promise<StoredUser | null> {
    await this.ensureReady();
    const row = this.db
      .prepare('SELECT * FROM users WHERE lower(email) = lower(?)')
      .get(email.trim()) as Record<string, unknown> | undefined;
    if (!row) return null;
    const bpRow =
      row.role === 'broker'
        ? (this.db
            .prepare('SELECT * FROM broker_profiles WHERE user_id = ?')
            .get(row.id as string) as Record<string, unknown> | undefined)
        : undefined;
    return this.mapUserRow(row, bpRow);
  }

  async listDemoUsers(): Promise<User[]> {
    await this.ensureReady();
    const rows = this.db
      .prepare('SELECT * FROM users WHERE is_demo = 1 ORDER BY role DESC, name ASC')
      .all() as Array<Record<string, unknown>>;
    return rows.map((row) => {
      const bp =
        row.role === 'broker'
          ? (this.db
              .prepare('SELECT * FROM broker_profiles WHERE user_id = ?')
              .get(row.id as string) as Record<string, unknown> | undefined)
          : undefined;
      return sanitizeUser(this.mapUserRow(row, bp));
    });
  }

  async listPublicBrokers(): Promise<User[]> {
    await this.ensureReady();
    const rows = this.db
      .prepare("SELECT * FROM users WHERE role = 'broker' ORDER BY name ASC")
      .all() as Array<Record<string, unknown>>;
    return rows.map((row) => {
      const bp = this.db
        .prepare('SELECT * FROM broker_profiles WHERE user_id = ?')
        .get(row.id as string) as Record<string, unknown> | undefined;
      return sanitizeUser(this.mapUserRow(row, bp));
    });
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

    this.withTransaction(() => {
      this.db
        .prepare(
          `INSERT INTO users (id, name, email, phone, role, city, avatar_url, auth_method, password_hash, is_demo, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
        )
        .run(
          id,
          input.name.trim(),
          input.email.trim().toLowerCase(),
          input.phone.trim(),
          input.role,
          input.city?.trim() || 'Bengaluru',
          input.avatarUrl ?? input.brokerProfile?.avatarUrl ?? null,
          input.authMethod ?? 'password',
          input.passwordHash ?? null,
          now
        );

      if (input.role === 'broker') {
        const bp = input.brokerProfile;
        const docs = bp?.verificationDocs
          ? { ...bp.verificationDocs, submittedAt: now }
          : null;
        this.db
          .prepare(
            `INSERT INTO broker_profiles (
              user_id, is_independent, agency_name, agency_address, phone,
              operating_localities_json, property_categories_json, specializations_json,
              years_experience, properties_managed_count, website, rera_id, avatar_url,
              verification_status, verified, bio, closed_deals_count, verification_docs_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, 0, ?)`
          )
          .run(
            id,
            bp?.isIndependent ?? !bp?.agencyName?.trim() ? 1 : 0,
            bp?.agencyName?.trim() || '',
            bp?.agencyAddress?.trim() || '',
            bp?.phone?.trim() || input.phone.trim(),
            JSON.stringify(
              bp?.operatingLocalities?.length
                ? bp.operatingLocalities
                : ['Koramangala']
            ),
            JSON.stringify(
              bp?.propertyCategories?.length
                ? bp.propertyCategories
                : ['Flat', 'House']
            ),
            JSON.stringify(bp?.specializations ?? ['Residential rentals']),
            bp?.yearsExperience ?? 1,
            bp?.propertiesManagedCount ?? 0,
            bp?.website?.trim() || null,
            bp?.reraId?.trim() || null,
            input.avatarUrl ?? bp?.avatarUrl ?? null,
            bp?.bio?.trim() || '',
            docs ? JSON.stringify(docs) : null
          );
      }
    });

    const created = await this.getUserById(id);
    if (!created) throw new AppError('Failed to create user', 500, 'INTERNAL_ERROR');
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

    this.withTransaction(() => {
      this.db
        .prepare(
          `UPDATE users SET name = ?, phone = ?, city = ?, avatar_url = ? WHERE id = ?`
        )
        .run(nextName, nextPhone, nextCity, nextAvatar, userId);

      if (existing.role === 'broker' && updates.brokerProfile) {
        const prevBp = existing.brokerProfile;
        const bp = updates.brokerProfile;
        const nextAgency = bp.agencyName !== undefined ? bp.agencyName.trim() : prevBp?.agencyName ?? '';
        const nextBrokerPhone = bp.phone?.trim() || prevBp?.phone || nextPhone;
        const nextDocs = bp.verificationDocs
          ? {
              ...(prevBp?.verificationDocs || {}),
              ...bp.verificationDocs,
              submittedAt:
                prevBp?.verificationDocs?.submittedAt ||
                new Date().toISOString(),
            }
          : prevBp?.verificationDocs;

        this.db
          .prepare(
            `UPDATE broker_profiles SET
              is_independent = ?, agency_name = ?, agency_address = ?, phone = ?,
              operating_localities_json = ?, property_categories_json = ?, specializations_json = ?,
              years_experience = ?, properties_managed_count = ?, website = ?, rera_id = ?,
              avatar_url = ?, bio = ?, verification_docs_json = ?
            WHERE user_id = ?`
          )
          .run(
            (bp.isIndependent ?? prevBp?.isIndependent ?? !nextAgency) ? 1 : 0,
            nextAgency,
            bp.agencyAddress !== undefined ? bp.agencyAddress.trim() : prevBp?.agencyAddress ?? '',
            nextBrokerPhone,
            JSON.stringify(bp.operatingLocalities ?? prevBp?.operatingLocalities ?? ['Koramangala']),
            JSON.stringify(bp.propertyCategories ?? prevBp?.propertyCategories ?? ['Flat']),
            JSON.stringify(bp.specializations ?? prevBp?.specializations ?? []),
            bp.yearsExperience ?? prevBp?.yearsExperience ?? 1,
            bp.propertiesManagedCount ?? prevBp?.propertiesManagedCount ?? 0,
            bp.website !== undefined ? bp.website.trim() || null : prevBp?.website ?? null,
            bp.reraId !== undefined ? bp.reraId.trim() || null : prevBp?.reraId ?? null,
            nextAvatar,
            bp.bio !== undefined ? bp.bio.trim() : prevBp?.bio ?? '',
            nextDocs ? JSON.stringify(nextDocs) : null,
            userId
          );

        this.db
          .prepare(
            `UPDATE properties SET broker_name = ?, broker_agency = ?, broker_phone = ? WHERE broker_id = ?`
          )
          .run(nextName, nextAgency || null, nextBrokerPhone, userId);
      }
    });

    const refreshed = await this.getUserById(userId);
    return refreshed ? sanitizeUser(refreshed) : null;
  }

  async createSession(userId: string, expiresAtIso: string): Promise<SessionRecord> {
    await this.ensureReady();
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`
      )
      .run(id, userId, expiresAtIso, createdAt);
    return { id, userId, expiresAt: expiresAtIso, createdAt };
  }

  async getSession(sessionId: string): Promise<SessionRecord | null> {
    await this.ensureReady();
    const row = this.db
      .prepare('SELECT * FROM sessions WHERE id = ?')
      .get(sessionId) as Record<string, unknown> | undefined;
    if (!row) return null;
    const expiresAt = row.expires_at as string;
    if (new Date(expiresAt).getTime() <= Date.now()) {
      this.db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
      return null;
    }
    return {
      id: row.id as string,
      userId: row.user_id as string,
      expiresAt,
      createdAt: row.created_at as string,
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.ensureReady();
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }

  async listProperties(
    filters: PropertyQueryFilters = {}
  ): Promise<PaginatedResult<Property>> {
    await this.ensureReady();
    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (!filters.includeUnavailable) {
      conditions.push("availability = 'available'");
    }
    if (filters.brokerId) {
      conditions.push('broker_id = ?');
      params.push(filters.brokerId);
    }
    if (filters.intent) {
      conditions.push('intent = ?');
      params.push(filters.intent);
    }
    if (filters.locality && filters.locality !== 'All') {
      conditions.push('lower(locality) = lower(?)');
      params.push(filters.locality);
    }
    if (filters.propertyType && filters.propertyType !== 'All') {
      conditions.push('property_type = ?');
      params.push(filters.propertyType);
    }
    if (filters.bedrooms && filters.bedrooms !== 'All') {
      if (filters.bedrooms >= 4) {
        conditions.push('bedrooms >= 4');
      } else {
        conditions.push('bedrooms = ?');
        params.push(filters.bedrooms);
      }
    }
    if (filters.budgetMax && filters.budgetMax > 0) {
      conditions.push('price <= ?');
      params.push(filters.budgetMax);
    }
    if (filters.furnishing && filters.furnishing !== 'Any') {
      conditions.push('furnishing = ?');
      params.push(filters.furnishing);
    }
    if (filters.query && filters.query.trim()) {
      const q = `%${filters.query.trim().toLowerCase()}%`;
      conditions.push(
        '(lower(title) LIKE ? OR lower(locality) LIKE ? OR lower(address) LIKE ? OR lower(description) LIKE ?)'
      );
      params.push(q, q, q, q);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM properties ${whereSql}`)
      .get(...params) as { total: number };

    const limit = Math.min(50, Math.max(1, filters.limit ?? 24));
    const offset = filters.cursor ? Math.max(0, Number.parseInt(filters.cursor, 10) || 0) : 0;

    const rows = this.db
      .prepare(
        `SELECT * FROM properties ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit + 1, offset) as Array<Record<string, unknown>>;

    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: sliced.map((r) => this.mapPropertyRow(r)),
      nextCursor: hasMore ? String(offset + limit) : null,
      total: countRow.total,
    };
  }

  async getPropertyById(id: string): Promise<Property | null> {
    await this.ensureReady();
    const row = this.db
      .prepare('SELECT * FROM properties WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    return row ? this.mapPropertyRow(row) : null;
  }

  async createProperty(broker: User, input: CreatePropertyInput): Promise<Property> {
    await this.ensureReady();
    if (broker.role !== 'broker') {
      throw new AppError('Only verified or registered brokers can list properties.', 403, 'FORBIDDEN');
    }
    const id = makeId('prop');
    const now = new Date().toISOString();
    const intent =
      input.intent ??
      (input.transactionType ? mapTransactionToIntent(input.transactionType) : 'rent');
    const propertyType =
      input.propertyType ??
      (input.listingCategory
        ? mapDetailedCategoryToBase(input.listingCategory)
        : 'Flat');
    const coords = LOCALITY_COORDS[input.locality];
    const brokerVerified = broker.brokerProfile?.verificationStatus === 'verified';

    this.db
      .prepare(
        `INSERT INTO properties (
          id, broker_id, broker_name, broker_agency, broker_phone, broker_verified,
          title, intent, transaction_type, listing_category, locality, city, pincode, landmark, address,
          price, security_deposit, maintenance_charges, price_per_sqft, brokerage_amount, brokerage_type,
          deposit_or_maintenance, brokerage_fee, property_type, bedrooms, bathrooms, area_sqft,
          carpet_area_sqft, built_up_area_sqft, floor_info, floor_number, total_floors,
          furnishing, parking, balconies, property_age, available_from, amenities_json,
          description, additional_info, selling_points_json, video_tour_url, images_json,
          availability, is_demo, map_x, map_y, lat, lng, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        broker.id,
        broker.name,
        broker.brokerProfile?.agencyName || null,
        broker.brokerProfile?.phone || broker.phone,
        brokerVerified ? 1 : 0,
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
        JSON.stringify(input.amenities ?? []),
        input.description,
        input.additionalInfo ?? null,
        JSON.stringify(input.sellingPoints ?? []),
        input.videoTourUrl ?? null,
        JSON.stringify(input.images),
        input.availability ?? 'available',
        input.mapX ?? 50,
        input.mapY ?? 50,
        input.lat ?? coords?.lat ?? null,
        input.lng ?? coords?.lng ?? null,
        now
      );

    const created = await this.getPropertyById(id);
    if (!created) throw new AppError('Failed to create property', 500, 'INTERNAL_ERROR');
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
      throw new AppError('Brokers can only edit their own properties.', 403, 'FORBIDDEN');
    }

    const merged: Property = {
      ...existing,
      ...updates,
      amenities: updates.amenities ?? existing.amenities,
      sellingPoints: updates.sellingPoints ?? existing.sellingPoints,
      images: updates.images ?? existing.images,
    };

    this.db
      .prepare(
        `UPDATE properties SET
          title = ?, intent = ?, transaction_type = ?, listing_category = ?,
          locality = ?, city = ?, pincode = ?, landmark = ?, address = ?,
          price = ?, security_deposit = ?, maintenance_charges = ?, price_per_sqft = ?,
          brokerage_amount = ?, brokerage_type = ?, deposit_or_maintenance = ?, brokerage_fee = ?,
          property_type = ?, bedrooms = ?, bathrooms = ?, area_sqft = ?,
          carpet_area_sqft = ?, built_up_area_sqft = ?, floor_info = ?, floor_number = ?, total_floors = ?,
          furnishing = ?, parking = ?, balconies = ?, property_age = ?, available_from = ?,
          amenities_json = ?, description = ?, additional_info = ?, selling_points_json = ?,
          video_tour_url = ?, images_json = ?, availability = ?, map_x = ?, map_y = ?
        WHERE id = ?`
      )
      .run(
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
        JSON.stringify(merged.amenities),
        merged.description,
        merged.additionalInfo ?? null,
        JSON.stringify(merged.sellingPoints ?? []),
        merged.videoTourUrl ?? null,
        JSON.stringify(merged.images),
        merged.availability,
        merged.mapX,
        merged.mapY,
        id
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
    this.db.prepare('DELETE FROM properties WHERE id = ?').run(id);
    return true;
  }

  async listRequirementsBySeeker(seekerId: string): Promise<Requirement[]> {
    await this.ensureReady();
    const rows = this.db
      .prepare('SELECT * FROM requirements WHERE seeker_id = ? ORDER BY created_at DESC')
      .all(seekerId) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapRequirementRow(r));
  }

  async getRequirementById(id: string): Promise<Requirement | null> {
    await this.ensureReady();
    const row = this.db
      .prepare('SELECT * FROM requirements WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    return row ? this.mapRequirementRow(row) : null;
  }

  async createRequirement(
    seeker: User,
    input: CreateRequirementInput
  ): Promise<Requirement> {
    await this.ensureReady();
    if (seeker.role !== 'seeker') {
      throw new AppError('Only home seekers can post property requirements.', 403, 'FORBIDDEN');
    }

    const id = makeId('req');
    const now = new Date().toISOString();
    const seekerName = input.seekerName?.trim() || seeker.name;
    const seekerPhone = input.seekerPhone?.trim() || seeker.phone;
    const seekerEmail = input.seekerEmail?.trim() || seeker.email;

    this.withTransaction(() => {
      this.db
        .prepare(
          `INSERT INTO requirements (
            id, seeker_id, seeker_name, seeker_phone, seeker_email, intent,
            localities_json, budget_min, budget_max, property_type, bedrooms,
            furnishing, move_in_date, amenities_json, notes, status, is_demo, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?)`
        )
        .run(
          id,
          seeker.id,
          seekerName,
          seekerPhone,
          seekerEmail,
          input.intent,
          JSON.stringify(input.localities),
          input.budgetMin,
          input.budgetMax,
          input.propertyType,
          input.bedrooms,
          input.furnishing,
          input.moveInDate,
          JSON.stringify(input.amenities),
          input.notes,
          now
        );

      const brokers = this.db
        .prepare(
          `SELECT u.id, bp.operating_localities_json
           FROM users u
           LEFT JOIN broker_profiles bp ON bp.user_id = u.id
           WHERE u.role = 'broker'`
        )
        .all() as Array<{ id: string; operating_localities_json: string | null }>;

      for (const broker of brokers) {
        const areas = parseJson<string[]>(broker.operating_localities_json, []);
        const areaMatch =
          areas.length === 0 ||
          input.localities.some((loc) =>
            areas.some((a) => a.toLowerCase() === loc.toLowerCase())
          );
        if (areaMatch) {
          this.pushNotificationSync({
            userId: broker.id,
            type: 'matching_requirement',
            title: `New ${input.bedrooms} BHK ${input.propertyType} lead in ${input.localities[0]}`,
            body: `Customer looking to ${input.intent} · Move-in ${input.moveInDate}`,
            relatedId: id,
          });
        }
      }
    });

    const created = await this.getRequirementById(id);
    if (!created) throw new AppError('Failed to create requirement', 500, 'INTERNAL_ERROR');
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

    const next: Requirement = {
      ...existing,
      ...updates,
      localities: updates.localities ?? existing.localities,
      amenities: updates.amenities ?? existing.amenities,
    };

    this.db
      .prepare(
        `UPDATE requirements SET
          status = ?, localities_json = ?, budget_min = ?, budget_max = ?,
          furnishing = ?, move_in_date = ?, amenities_json = ?, notes = ?
        WHERE id = ?`
      )
      .run(
        next.status,
        JSON.stringify(next.localities),
        next.budgetMin,
        next.budgetMax,
        next.furnishing,
        next.moveInDate,
        JSON.stringify(next.amenities),
        next.notes,
        id
      );

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
    this.db.prepare('DELETE FROM requirements WHERE id = ?').run(id);
    return true;
  }

  async getLeadsForBroker(
    filters: LeadQueryFilters
  ): Promise<PaginatedResult<MatchedLeadItem>> {
    await this.ensureReady();
    const conditions = ["status = 'active'"];
    const params: Array<string | number> = [];

    if (filters.intent && filters.intent !== 'All') {
      conditions.push('intent = ?');
      params.push(filters.intent);
    }
    if (filters.propertyType && filters.propertyType !== 'All') {
      conditions.push('property_type = ?');
      params.push(filters.propertyType);
    }
    if (filters.bedrooms && filters.bedrooms !== 'All') {
      if (filters.bedrooms >= 4) {
        conditions.push('bedrooms >= 4');
      } else {
        conditions.push('bedrooms = ?');
        params.push(filters.bedrooms);
      }
    }

    const whereSql = `WHERE ${conditions.join(' AND ')}`;
    const allRows = this.db
      .prepare(`SELECT * FROM requirements ${whereSql} ORDER BY created_at DESC`)
      .all(...params) as Array<Record<string, unknown>>;

    const brokerInventory = (
      this.db
        .prepare("SELECT * FROM properties WHERE broker_id = ? AND availability = 'available'")
        .all(filters.brokerId) as Array<Record<string, unknown>>
    ).map((r) => this.mapPropertyRow(r));

    const brokerProposals = (
      this.db
        .prepare('SELECT requirement_id FROM proposals WHERE broker_id = ?')
        .all(filters.brokerId) as Array<{ requirement_id: string }>
    ).map((r) => r.requirement_id);
    const proposedSet = new Set(brokerProposals);

    let items: MatchedLeadItem[] = allRows
      .map((r) => this.mapRequirementRow(r))
      .map((req) => this.maskRequirementForViewer(req, filters.brokerId))
      .filter((req) => {
        if (filters.locality && filters.locality !== 'All') {
          const hasLoc = req.localities.some(
            (l) => l.toLowerCase() === filters.locality!.toLowerCase()
          );
          if (!hasLoc) return false;
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
        for (const prop of brokerInventory) {
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

  async listProposalsForSeeker(
    seekerId: string,
    requirementId?: string
  ): Promise<Proposal[]> {
    await this.ensureReady();
    const rows = requirementId
      ? (this.db
          .prepare(
            'SELECT * FROM proposals WHERE seeker_id = ? AND requirement_id = ? ORDER BY created_at DESC'
          )
          .all(seekerId, requirementId) as Array<Record<string, unknown>>)
      : (this.db
          .prepare('SELECT * FROM proposals WHERE seeker_id = ? ORDER BY created_at DESC')
          .all(seekerId) as Array<Record<string, unknown>>);
    return rows.map((r) => this.mapProposalRow(r));
  }

  async listProposalsForBroker(brokerId: string): Promise<Proposal[]> {
    await this.ensureReady();
    const rows = this.db
      .prepare('SELECT * FROM proposals WHERE broker_id = ? ORDER BY created_at DESC')
      .all(brokerId) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapProposalRow(r));
  }

  async getProposalById(id: string): Promise<Proposal | null> {
    await this.ensureReady();
    const row = this.db
      .prepare('SELECT * FROM proposals WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    return row ? this.mapProposalRow(row) : null;
  }

  async createProposal(broker: User, input: CreateProposalInput): Promise<Proposal> {
    await this.ensureReady();
    if (broker.role !== 'broker') {
      throw new AppError('Only brokers can submit property proposals.', 403, 'FORBIDDEN');
    }

    const requirement = await this.getRequirementById(input.requirementId);
    const property = await this.getPropertyById(input.propertyId);
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

    const duplicate = this.db
      .prepare(
        'SELECT 1 FROM proposals WHERE requirement_id = ? AND property_id = ? LIMIT 1'
      )
      .get(input.requirementId, input.propertyId);
    if (duplicate) {
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
    const now = new Date().toISOString();
    const whyMatches =
      input.whyMatches?.trim() || match.reasons.slice(0, 2).join(' · ') || null;
    const matchReasons = match.reasons.length > 0 ? match.reasons : match.warnings;

    this.withTransaction(() => {
      this.db
        .prepare(
          `INSERT INTO proposals (
            id, requirement_id, property_id, broker_id, seeker_id, proposed_price,
            brokerage_charge, message, why_matches, availability_confirmed, contact_shared,
            status, status_detail, viewed_at, match_score, match_reasons_json, is_demo, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending', 'Sent', NULL, ?, ?, 0, ?)`
        )
        .run(
          id,
          input.requirementId,
          input.propertyId,
          broker.id,
          requirement.seekerId,
          input.proposedPrice,
          input.brokerageCharge.trim(),
          input.message.trim(),
          whyMatches,
          input.availabilityConfirmed ? 1 : 0,
          match.score,
          JSON.stringify(matchReasons),
          now
        );

      this.pushNotificationSync({
        userId: requirement.seekerId,
        type: 'proposal_received',
        title: `New property proposal for ${requirement.bedrooms} BHK ${requirement.propertyType}`,
        body: `${property.brokerName} pitched "${property.title}" (${match.score}% match).`,
        relatedId: id,
      });
    });

    const created = await this.getProposalById(id);
    if (!created) throw new AppError('Failed to create proposal', 500, 'INTERNAL_ERROR');
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

    // Only seekers can shortlist/accept/decline/shareContact or markViewed
    if (
      actor.id !== existing.seekerId &&
      (updates.status !== undefined ||
        updates.contactShared !== undefined ||
        updates.markViewed !== undefined)
    ) {
      throw new AppError(
        'Only the home seeker can accept, shortlist, decline, or share contact on a proposal.',
        403,
        'FORBIDDEN'
      );
    }

    const next = { ...existing };

    this.withTransaction(() => {
      const prop = this.db
        .prepare('SELECT title FROM properties WHERE id = ?')
        .get(existing.propertyId) as { title: string } | undefined;

      if (updates.markViewed && !existing.viewedAt) {
        next.viewedAt = new Date().toISOString();
        if (!next.statusDetail || next.statusDetail === 'Sent') {
          next.statusDetail = 'Viewed';
        }
        this.pushNotificationSync({
          userId: existing.brokerId,
          type: 'proposal_viewed',
          title: `Proposal viewed${prop ? `: ${prop.title}` : ''}`,
          body: 'The home seeker opened your property proposal.',
          relatedId: existing.id,
        });
      }

      if (updates.status) {
        next.status = updates.status;
        if (updates.status === 'shortlisted') {
          next.statusDetail = 'Interested';
          this.pushNotificationSync({
            userId: existing.brokerId,
            type: 'customer_interested',
            title: `Customer interested in ${prop?.title || 'your property'}`,
            body: 'The seeker shortlisted your proposal.',
            relatedId: existing.id,
          });
        } else if (updates.status === 'accepted') {
          next.statusDetail = 'Interested';
          next.contactShared = true;
          this.pushNotificationSync({
            userId: existing.brokerId,
            type: 'contact_shared',
            title: 'Proposal accepted & contact shared',
            body: `Seeker accepted "${prop?.title || 'property'}" and shared private contact details.`,
            relatedId: existing.id,
          });
          if (existing.status !== 'accepted') {
            this.db
              .prepare(
                'UPDATE broker_profiles SET closed_deals_count = closed_deals_count + 1 WHERE user_id = ?'
              )
              .run(existing.brokerId);
          }
        } else if (updates.status === 'declined') {
          next.statusDetail = 'Rejected';
        }
      }

      if (updates.statusDetail) {
        next.statusDetail = updates.statusDetail;
      }

      if (typeof updates.contactShared === 'boolean') {
        next.contactShared = updates.contactShared;
        if (updates.contactShared && !existing.contactShared) {
          this.pushNotificationSync({
            userId: existing.brokerId,
            type: 'contact_shared',
            title: 'Seeker shared contact details',
            body: `Contact details unlocked for ${prop?.title || 'your proposal'}.`,
            relatedId: existing.id,
          });
        }
      }

      this.db
        .prepare(
          `UPDATE proposals SET
            status = ?, status_detail = ?, contact_shared = ?, viewed_at = ?
          WHERE id = ?`
        )
        .run(
          next.status,
          next.statusDetail ?? null,
          next.contactShared ? 1 : 0,
          next.viewedAt ?? null,
          id
        );
    });

    return this.getProposalById(id);
  }

  async listVisitsForUser(userId: string, role: UserRole): Promise<Visit[]> {
    await this.ensureReady();
    const col = role === 'broker' ? 'broker_id' : 'seeker_id';
    const rows = this.db
      .prepare(`SELECT * FROM visits WHERE ${col} = ? ORDER BY created_at DESC`)
      .all(userId) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapVisitRow(r));
  }

  async createVisit(seeker: User, input: CreateVisitInput): Promise<Visit> {
    await this.ensureReady();
    const prop = await this.getPropertyById(input.propertyId);
    if (!prop) throw new AppError('Property not found', 404, 'NOT_FOUND');

    const id = makeId('visit');
    const now = new Date().toISOString();

    this.withTransaction(() => {
      this.db
        .prepare(
          `INSERT INTO visits (id, property_id, proposal_id, seeker_id, seeker_name, broker_id, date, time_slot, notes, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?)`
        )
        .run(
          id,
          prop.id,
          input.proposalId ?? null,
          seeker.id,
          seeker.name,
          prop.brokerId,
          input.date,
          input.timeSlot,
          input.notes ?? null,
          now
        );

      this.db
        .prepare(
          `UPDATE proposals SET status_detail = 'Visit Requested' WHERE property_id = ? AND seeker_id = ?`
        )
        .run(prop.id, seeker.id);

      this.pushNotificationSync({
        userId: prop.brokerId,
        type: 'visit_requested',
        title: `Visit requested for ${prop.title}`,
        body: `${seeker.name} requested a viewing on ${input.date} at ${input.timeSlot}.`,
        relatedId: id,
      });
    });

    const row = this.db
      .prepare('SELECT * FROM visits WHERE id = ?')
      .get(id) as Record<string, unknown>;
    return this.mapVisitRow(row);
  }

  async updateVisitStatus(
    visitId: string,
    actor: User,
    status: VisitStatus
  ): Promise<Visit | null> {
    await this.ensureReady();
    const row = this.db
      .prepare('SELECT * FROM visits WHERE id = ?')
      .get(visitId) as Record<string, unknown> | undefined;
    if (!row) return null;
    const existing = this.mapVisitRow(row);

    if (actor.id !== existing.brokerId && actor.id !== existing.seekerId) {
      throw new AppError('Unauthorized visit update', 403, 'FORBIDDEN');
    }
    if ((status === 'confirmed' || status === 'completed') && actor.id !== existing.brokerId) {
      throw new AppError('Only the listing broker can confirm or complete a visit.', 403, 'FORBIDDEN');
    }

    this.withTransaction(() => {
      this.db.prepare('UPDATE visits SET status = ? WHERE id = ?').run(status, visitId);
      const prop = this.db
        .prepare('SELECT title FROM properties WHERE id = ?')
        .get(existing.propertyId) as { title: string } | undefined;

      if (status === 'confirmed') {
        this.db
          .prepare(
            `UPDATE proposals SET status_detail = 'Visit Scheduled' WHERE property_id = ? AND seeker_id = ?`
          )
          .run(existing.propertyId, existing.seekerId);
        this.pushNotificationSync({
          userId: existing.seekerId,
          type: 'visit_confirmed',
          title: `Visit confirmed for ${prop?.title || 'property'}`,
          body: `Broker confirmed your tour on ${existing.date} at ${existing.timeSlot}.`,
          relatedId: existing.id,
        });
      } else if (status === 'completed') {
        this.db
          .prepare(
            `UPDATE proposals SET status_detail = 'Closed' WHERE property_id = ? AND seeker_id = ?`
          )
          .run(existing.propertyId, existing.seekerId);
      }
    });

    const updated = this.db
      .prepare('SELECT * FROM visits WHERE id = ?')
      .get(visitId) as Record<string, unknown>;
    return this.mapVisitRow(updated);
  }

  async listMessagesForProperty(
    propertyId: string,
    viewerId?: string
  ): Promise<Message[]> {
    await this.ensureReady();
    if (!viewerId) return [];
    const rows = this.db
      .prepare(
        `SELECT * FROM messages
         WHERE property_id = ? AND (sender_id = ? OR recipient_id = ?)
         ORDER BY created_at ASC`
      )
      .all(propertyId, viewerId, viewerId) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapMessageRow(r));
  }

  async listMessagesForUser(userId: string): Promise<Message[]> {
    await this.ensureReady();
    const rows = this.db
      .prepare(
        `SELECT * FROM messages
         WHERE sender_id = ? OR recipient_id = ?
         ORDER BY created_at ASC`
      )
      .all(userId, userId) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapMessageRow(r));
  }

  async createMessage(sender: User, input: CreateMessageInput): Promise<Message> {
    await this.ensureReady();
    if (sender.id === input.recipientId) {
      throw new AppError('Cannot send a message to yourself', 400, 'BAD_REQUEST');
    }
    const id = makeId('msg');
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO messages (id, proposal_id, property_id, sender_id, sender_name, sender_role, recipient_id, body, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.proposalId ?? null,
        input.propertyId,
        sender.id,
        sender.name,
        sender.role,
        input.recipientId,
        input.body.trim(),
        now
      );
    const row = this.db
      .prepare('SELECT * FROM messages WHERE id = ?')
      .get(id) as Record<string, unknown>;
    return this.mapMessageRow(row);
  }

  async getSavedPropertyIds(userId: string): Promise<string[]> {
    await this.ensureReady();
    const rows = this.db
      .prepare(
        'SELECT property_id FROM saved_properties WHERE user_id = ? ORDER BY created_at DESC'
      )
      .all(userId) as Array<{ property_id: string }>;
    return rows.map((r) => r.property_id);
  }

  async listSavedProperties(userId: string): Promise<Property[]> {
    await this.ensureReady();
    const rows = this.db
      .prepare(
        `SELECT p.* FROM properties p
         INNER JOIN saved_properties sp ON sp.property_id = p.id
         WHERE sp.user_id = ?
         ORDER BY sp.created_at DESC`
      )
      .all(userId) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapPropertyRow(r));
  }

  async toggleSavedProperty(userId: string, propertyId: string): Promise<string[]> {
    await this.ensureReady();
    const prop = await this.getPropertyById(propertyId);
    if (!prop) throw new AppError('Property not found', 404, 'NOT_FOUND');

    const existing = this.db
      .prepare(
        'SELECT 1 FROM saved_properties WHERE user_id = ? AND property_id = ?'
      )
      .get(userId, propertyId);

    if (existing) {
      this.db
        .prepare('DELETE FROM saved_properties WHERE user_id = ? AND property_id = ?')
        .run(userId, propertyId);
    } else {
      this.db
        .prepare(
          'INSERT INTO saved_properties (user_id, property_id, created_at) VALUES (?, ?, ?)'
        )
        .run(userId, propertyId, new Date().toISOString());
    }
    return this.getSavedPropertyIds(userId);
  }

  async listNotificationsForUser(userId: string): Promise<AppNotification[]> {
    await this.ensureReady();
    const rows = this.db
      .prepare(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
      )
      .all(userId) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapNotificationRow(r));
  }

  async markNotificationsRead(userId: string, notificationId?: string): Promise<void> {
    await this.ensureReady();
    if (notificationId) {
      this.db
        .prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
        .run(notificationId, userId);
    } else {
      this.db
        .prepare('UPDATE notifications SET read = 1 WHERE user_id = ?')
        .run(userId);
    }
  }

  async listReviewsForBroker(brokerId: string): Promise<BrokerReview[]> {
    await this.ensureReady();
    const rows = this.db
      .prepare(
        'SELECT * FROM broker_reviews WHERE broker_id = ? ORDER BY created_at DESC'
      )
      .all(brokerId) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapReviewRow(r));
  }

  async createReview(
    author: User,
    input: CreateReviewInput
  ): Promise<BrokerReview> {
    await this.ensureReady();
    if (author.id === input.brokerId) {
      throw new AppError('Brokers cannot leave reviews on their own profile.', 403, 'FORBIDDEN');
    }
    const broker = await this.getUserById(input.brokerId);
    if (!broker || broker.role !== 'broker') {
      throw new AppError('Broker not found', 404, 'NOT_FOUND');
    }

    const id = makeId('rev');
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO broker_reviews (id, broker_id, author_id, author_name, rating, comment, locality, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.brokerId,
        author.id,
        author.name,
        input.rating,
        input.comment.trim(),
        input.locality?.trim() || null,
        now
      );

    const row = this.db
      .prepare('SELECT * FROM broker_reviews WHERE id = ?')
      .get(id) as Record<string, unknown>;
    return this.mapReviewRow(row);
  }
}
