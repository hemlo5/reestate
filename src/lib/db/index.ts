import type { User, UserRole } from '@/types';
import { readCookieSession, sanitizeUser } from '@/lib/auth/session';
import { AppError } from './errors';
import type { DbAdapter } from './types';
import type { SupabaseRestDbAdapter } from './supabase-rest-adapter';

export interface DbBackendInfo {
  backend: 'supabase-postgres' | 'supabase-rest' | 'sqlite-awaiting-schema' | 'sqlite';
  supabaseConfigured: boolean;
  supabaseProjectId: string | null;
  supabaseSchemaReady: boolean;
  supabaseStorageReady: boolean;
}

abstract class BaseDelegatingAdapter implements DbAdapter {
  abstract resolve(): Promise<DbAdapter>;

  async getUserById(id: string) {
    return (await this.resolve()).getUserById(id);
  }
  async getUserByEmail(email: string) {
    return (await this.resolve()).getUserByEmail(email);
  }
  async listDemoUsers() {
    return (await this.resolve()).listDemoUsers();
  }
  async listPublicBrokers() {
    return (await this.resolve()).listPublicBrokers();
  }
  async createUser(input: Parameters<DbAdapter['createUser']>[0]) {
    return (await this.resolve()).createUser(input);
  }
  async updateUserProfile(userId: string, updates: Parameters<DbAdapter['updateUserProfile']>[1]) {
    return (await this.resolve()).updateUserProfile(userId, updates);
  }
  async createSession(userId: string, expiresAtIso: string) {
    return (await this.resolve()).createSession(userId, expiresAtIso);
  }
  async getSession(sessionId: string) {
    return (await this.resolve()).getSession(sessionId);
  }
  async deleteSession(sessionId: string) {
    return (await this.resolve()).deleteSession(sessionId);
  }
  async listProperties(filters?: Parameters<DbAdapter['listProperties']>[0]) {
    return (await this.resolve()).listProperties(filters);
  }
  async getPropertyById(id: string) {
    return (await this.resolve()).getPropertyById(id);
  }
  async createProperty(broker: User, input: Parameters<DbAdapter['createProperty']>[1]) {
    return (await this.resolve()).createProperty(broker, input);
  }
  async updateProperty(
    id: string,
    brokerId: string,
    updates: Parameters<DbAdapter['updateProperty']>[2]
  ) {
    return (await this.resolve()).updateProperty(id, brokerId, updates);
  }
  async deleteProperty(id: string, brokerId: string) {
    return (await this.resolve()).deleteProperty(id, brokerId);
  }
  async listRequirementsBySeeker(seekerId: string) {
    return (await this.resolve()).listRequirementsBySeeker(seekerId);
  }
  async getRequirementById(id: string) {
    return (await this.resolve()).getRequirementById(id);
  }
  async createRequirement(seeker: User, input: Parameters<DbAdapter['createRequirement']>[1]) {
    return (await this.resolve()).createRequirement(seeker, input);
  }
  async updateRequirement(
    id: string,
    seekerId: string,
    updates: Parameters<DbAdapter['updateRequirement']>[2]
  ) {
    return (await this.resolve()).updateRequirement(id, seekerId, updates);
  }
  async deleteRequirement(id: string, seekerId: string) {
    return (await this.resolve()).deleteRequirement(id, seekerId);
  }
  async getLeadsForBroker(filters: Parameters<DbAdapter['getLeadsForBroker']>[0]) {
    return (await this.resolve()).getLeadsForBroker(filters);
  }
  async listProposalsForSeeker(seekerId: string, requirementId?: string) {
    return (await this.resolve()).listProposalsForSeeker(seekerId, requirementId);
  }
  async listProposalsForBroker(brokerId: string) {
    return (await this.resolve()).listProposalsForBroker(brokerId);
  }
  async getProposalById(id: string) {
    return (await this.resolve()).getProposalById(id);
  }
  async createProposal(broker: User, input: Parameters<DbAdapter['createProposal']>[1]) {
    return (await this.resolve()).createProposal(broker, input);
  }
  async updateProposal(
    id: string,
    actor: User,
    updates: Parameters<DbAdapter['updateProposal']>[2]
  ) {
    return (await this.resolve()).updateProposal(id, actor, updates);
  }
  async listVisitsForUser(userId: string, role: UserRole) {
    return (await this.resolve()).listVisitsForUser(userId, role);
  }
  async createVisit(seeker: User, input: Parameters<DbAdapter['createVisit']>[1]) {
    return (await this.resolve()).createVisit(seeker, input);
  }
  async updateVisitStatus(
    visitId: string,
    actor: User,
    status: Parameters<DbAdapter['updateVisitStatus']>[2]
  ) {
    return (await this.resolve()).updateVisitStatus(visitId, actor, status);
  }
  async listMessagesForProperty(propertyId: string, viewerId?: string) {
    return (await this.resolve()).listMessagesForProperty(propertyId, viewerId);
  }
  async listMessagesForUser(userId: string) {
    return (await this.resolve()).listMessagesForUser(userId);
  }
  async createMessage(sender: User, input: Parameters<DbAdapter['createMessage']>[1]) {
    return (await this.resolve()).createMessage(sender, input);
  }
  async getSavedPropertyIds(userId: string) {
    return (await this.resolve()).getSavedPropertyIds(userId);
  }
  async listSavedProperties(userId: string) {
    return (await this.resolve()).listSavedProperties(userId);
  }
  async toggleSavedProperty(userId: string, propertyId: string) {
    return (await this.resolve()).toggleSavedProperty(userId, propertyId);
  }
  async listNotificationsForUser(userId: string) {
    return (await this.resolve()).listNotificationsForUser(userId);
  }
  async markNotificationsRead(userId: string, notificationId?: string) {
    return (await this.resolve()).markNotificationsRead(userId, notificationId);
  }
  async listReviewsForBroker(brokerId: string) {
    return (await this.resolve()).listReviewsForBroker(brokerId);
  }
  async createReview(author: User, input: Parameters<DbAdapter['createReview']>[1]) {
    return (await this.resolve()).createReview(author, input);
  }
}

class LazyDbAdapter extends BaseDelegatingAdapter {
  private instancePromise: Promise<DbAdapter> | null = null;
  private readonly loader: () => Promise<DbAdapter>;

  constructor(loader: () => Promise<DbAdapter>) {
    super();
    this.loader = loader;
  }

  override async resolve(): Promise<DbAdapter> {
    if (!this.instancePromise) {
      this.instancePromise = this.loader().catch((err) => {
        this.instancePromise = null;
        throw err;
      });
    }
    return this.instancePromise;
  }
}

class DelegatingSupabaseRestAdapter extends BaseDelegatingAdapter {
  readonly adapterKind = 'delegating-supabase-rest' as const;
  private readonly url: string;
  private readonly serviceKey: string;
  private restPromise: Promise<SupabaseRestDbAdapter> | null = null;
  private sqlitePromise: Promise<DbAdapter> | null = null;
  private schemaReady: boolean | null = null;
  private lastProbeAt = 0;

  constructor(url: string, serviceKey: string) {
    super();
    this.url = url;
    this.serviceKey = serviceKey;
  }

  private async getRest(): Promise<SupabaseRestDbAdapter> {
    if (!this.restPromise) {
      this.restPromise = import('./supabase-rest-adapter')
        .then(({ SupabaseRestDbAdapter }) => new SupabaseRestDbAdapter(this.url, this.serviceKey))
        .catch((err) => {
          this.restPromise = null;
          throw err;
        });
    }
    return this.restPromise;
  }

  private async getSqlite(): Promise<DbAdapter> {
    if (!this.sqlitePromise) {
      this.sqlitePromise = import('./sqlite-adapter')
        .then(({ SqliteDbAdapter }) => new SqliteDbAdapter())
        .catch((err) => {
          this.sqlitePromise = null;
          throw err;
        });
    }
    return this.sqlitePromise;
  }

  override async resolve(): Promise<DbAdapter> {
    const rest = await this.getRest();
    if (this.schemaReady === true) return rest;
    const now = Date.now();
    if (this.schemaReady === false && now - this.lastProbeAt < 10_000) {
      return this.getSqlite();
    }
    this.lastProbeAt = now;
    try {
      const ok = await rest.probeSchema();
      this.schemaReady = ok;
      return ok ? rest : this.getSqlite();
    } catch {
      this.schemaReady = false;
      return this.getSqlite();
    }
  }

  isSchemaReady(): boolean {
    return this.schemaReady === true;
  }
}

declare global {
  var __housedDbInstance: DbAdapter | undefined;
}

export function getDb(): DbAdapter {
  if (!globalThis.__housedDbInstance) {
    const dbUrl = process.env.DATABASE_URL?.trim();
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (dbUrl) {
      globalThis.__housedDbInstance = new LazyDbAdapter(async () => {
        const { SupabaseDbAdapter } = await import('./supabase-adapter');
        return new SupabaseDbAdapter(dbUrl);
      });
    } else if (sbUrl && sbKey) {
      globalThis.__housedDbInstance = new DelegatingSupabaseRestAdapter(sbUrl, sbKey);
    } else {
      globalThis.__housedDbInstance = new LazyDbAdapter(async () => {
        const { SqliteDbAdapter } = await import('./sqlite-adapter');
        return new SqliteDbAdapter();
      });
    }
  }
  return globalThis.__housedDbInstance;
}

export async function getDbBackendInfo(): Promise<DbBackendInfo> {
  const dbUrl = process.env.DATABASE_URL?.trim();
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseStorageReady = Boolean(sbUrl && sbKey);

  let supabaseProjectId: string | null = null;
  if (sbUrl) {
    try {
      const host = new URL(sbUrl).hostname;
      supabaseProjectId = host.split('.')[0] || null;
    } catch {
      supabaseProjectId = null;
    }
  }

  if (dbUrl) {
    return {
      backend: 'supabase-postgres',
      supabaseConfigured: true,
      supabaseProjectId,
      supabaseSchemaReady: true,
      supabaseStorageReady,
    };
  }

  const db = getDb() as DbAdapter & {
    adapterKind?: string;
    resolve?: () => Promise<DbAdapter>;
    isSchemaReady?: () => boolean;
  };
  if (db.adapterKind === 'delegating-supabase-rest' && db.resolve && db.isSchemaReady) {
    await db.resolve();
    const ready = db.isSchemaReady();
    return {
      backend: ready ? 'supabase-rest' : 'sqlite-awaiting-schema',
      supabaseConfigured: true,
      supabaseProjectId,
      supabaseSchemaReady: ready,
      supabaseStorageReady,
    };
  }

  return {
    backend: 'sqlite',
    supabaseConfigured: false,
    supabaseProjectId,
    supabaseSchemaReady: false,
    supabaseStorageReady,
  };
}

export async function getSessionUser(): Promise<User | null> {
  const tokenData = await readCookieSession();
  if (!tokenData) return null;

  const db = getDb();
  const session = await db.getSession(tokenData.sessionId);
  if (!session || session.userId !== tokenData.userId) {
    return null;
  }

  const user = await db.getUserById(session.userId);
  if (!user) return null;
  return sanitizeUser(user);
}

export async function requireAuth(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    throw new AppError(
      'Authentication required. Please sign in to continue.',
      401,
      'UNAUTHORIZED'
    );
  }
  return user;
}

export async function requireRole(role: UserRole): Promise<User> {
  const user = await requireAuth();
  if (user.role !== role) {
    throw new AppError(
      `This action requires a ${role === 'broker' ? 'Property Broker' : 'Home Seeker'} account.`,
      403,
      'FORBIDDEN'
    );
  }
  return user;
}

export { AppError };
