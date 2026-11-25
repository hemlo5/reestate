import type {
  AppNotification,
  BrokerReview,
  MatchedLeadItem,
  Message,
  PaginatedResult,
  Property,
  PropertyAvailability,
  Proposal,
  ProposalLifecycleStatus,
  ProposalStatus,
  Requirement,
  SearchFilters,
  User,
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
} from '@/lib/validation/schemas';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
    };
    throw new ApiError(
      payload.error || `Request failed (${res.status})`,
      res.status,
      payload.code
    );
  }

  return (await res.json()) as T;
}

export const apiClient = {
  // Auth & Session
  getMe() {
    return apiFetch<{ user: User | null; demoUsers: User[] }>('/api/auth/me', {
      cache: 'no-store',
    });
  },

  login(email: string, password: string) {
    return apiFetch<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register(payload: RegisterInput) {
    return apiFetch<{ user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  logout() {
    return apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
  },

  switchDemo(userId: string) {
    return apiFetch<{ user: User }>('/api/auth/switch-demo', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  updateProfile(updates: UpdateProfileInput) {
    return apiFetch<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  submitBrokerVerification(input: {
    reraId: string;
    verificationDocs: {
      reraAuthority: string;
      govtIdType: string;
      govtIdNumber: string;
      govtIdFileName?: string;
      govtIdFileKey?: string;
      submittedAt?: string;
    };
  }) {
    return apiFetch<{ user: User }>('/api/broker/verification', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  // Properties
  listProperties(
    params: Partial<SearchFilters> & {
      brokerId?: string;
      includeUnavailable?: boolean;
      cursor?: string | null;
      limit?: number;
    } = {}
  ) {
    const qs = new URLSearchParams();
    if (params.intent) qs.set('intent', params.intent);
    if (params.locality && params.locality !== 'All') qs.set('locality', params.locality);
    if (params.propertyType && params.propertyType !== 'All') {
      qs.set('propertyType', params.propertyType);
    }
    if (params.bedrooms && params.bedrooms !== 'All') {
      qs.set('bedrooms', String(params.bedrooms));
    }
    if (params.budgetMax) qs.set('budgetMax', String(params.budgetMax));
    if (params.furnishing && params.furnishing !== 'Any') {
      qs.set('furnishing', params.furnishing);
    }
    if (params.query?.trim()) qs.set('query', params.query.trim());
    if (params.brokerId) qs.set('brokerId', params.brokerId);
    if (params.includeUnavailable) qs.set('includeUnavailable', 'true');
    if (params.cursor) qs.set('cursor', params.cursor);
    if (params.limit) qs.set('limit', String(params.limit));

    const queryStr = qs.toString();
    return apiFetch<PaginatedResult<Property>>(
      `/api/properties${queryStr ? `?${queryStr}` : ''}`
    );
  },

  getProperty(id: string) {
    return apiFetch<{ property: Property }>(`/api/properties/${encodeURIComponent(id)}`);
  },

  createProperty(payload: CreatePropertyInput) {
    return apiFetch<{ property: Property }>('/api/properties', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateProperty(
    id: string,
    updates: UpdatePropertyInput & { availability?: PropertyAvailability }
  ) {
    return apiFetch<{ property: Property }>(
      `/api/properties/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
  },

  deleteProperty(id: string) {
    return apiFetch<{ ok: boolean }>(`/api/properties/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Requirements & Leads
  listRequirements() {
    return apiFetch<{ requirements: Requirement[] }>('/api/requirements');
  },

  createRequirement(payload: CreateRequirementInput) {
    return apiFetch<{ requirement: Requirement }>('/api/requirements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateRequirement(
    id: string,
    updates: { status?: Requirement['status']; notes?: string }
  ) {
    return apiFetch<{ requirement: Requirement }>(
      `/api/requirements/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
  },

  deleteRequirement(id: string) {
    return apiFetch<{ ok: boolean }>(
      `/api/requirements/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
  },

  listBrokerLeads(params: {
    intent?: 'All' | 'rent' | 'buy';
    locality?: string;
    propertyType?: 'All' | 'Flat' | 'House' | 'Room';
    bedrooms?: 'All' | number;
    query?: string;
    onlyMatching?: boolean;
    cursor?: string | null;
    limit?: number;
  } = {}) {
    const qs = new URLSearchParams();
    if (params.intent && params.intent !== 'All') qs.set('intent', params.intent);
    if (params.locality && params.locality !== 'All') qs.set('locality', params.locality);
    if (params.propertyType && params.propertyType !== 'All') {
      qs.set('propertyType', params.propertyType);
    }
    if (params.bedrooms && params.bedrooms !== 'All') {
      qs.set('bedrooms', String(params.bedrooms));
    }
    if (params.query?.trim()) qs.set('query', params.query.trim());
    if (params.onlyMatching) qs.set('onlyMatching', 'true');
    if (params.cursor) qs.set('cursor', params.cursor);
    if (params.limit) qs.set('limit', String(params.limit));

    const queryStr = qs.toString();
    return apiFetch<PaginatedResult<MatchedLeadItem>>(
      `/api/leads${queryStr ? `?${queryStr}` : ''}`
    );
  },

  // Proposals
  listProposals(requirementId?: string) {
    const qs = requirementId ? `?requirementId=${encodeURIComponent(requirementId)}` : '';
    return apiFetch<{ proposals: Proposal[] }>(`/api/proposals${qs}`);
  },

  createProposal(payload: CreateProposalInput) {
    return apiFetch<{ proposal: Proposal }>('/api/proposals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateProposal(
    id: string,
    updates: {
      status?: ProposalStatus;
      statusDetail?: ProposalLifecycleStatus;
      contactShared?: boolean;
      markViewed?: boolean;
    }
  ) {
    return apiFetch<{ proposal: Proposal }>(
      `/api/proposals/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
  },

  // Visits
  listVisits() {
    return apiFetch<{ visits: Visit[] }>('/api/visits');
  },

  createVisit(payload: CreateVisitInput) {
    return apiFetch<{ visit: Visit }>('/api/visits', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateVisitStatus(id: string, status: VisitStatus) {
    return apiFetch<{ visit: Visit }>(`/api/visits/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Messages
  listMessages(propertyId?: string) {
    const qs = propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : '';
    return apiFetch<{ messages: Message[] }>(`/api/messages${qs}`);
  },

  createMessage(payload: CreateMessageInput) {
    return apiFetch<{ message: Message }>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Saved
  listSaved() {
    return apiFetch<{ savedIds: string[]; properties: Property[] }>('/api/saved');
  },

  toggleSaved(propertyId: string) {
    return apiFetch<{ savedIds: string[] }>('/api/saved/toggle', {
      method: 'POST',
      body: JSON.stringify({ propertyId }),
    });
  },

  // Notifications
  listNotifications() {
    return apiFetch<{ notifications: AppNotification[] }>('/api/notifications');
  },

  markNotificationsRead(notificationId?: string) {
    return apiFetch<{ ok: boolean }>('/api/notifications/read', {
      method: 'PATCH',
      body: JSON.stringify({ notificationId }),
    });
  },

  // Reviews
  listReviews(brokerId: string) {
    return apiFetch<{ reviews: BrokerReview[] }>(
      `/api/reviews?brokerId=${encodeURIComponent(brokerId)}`
    );
  },

  createReview(payload: CreateReviewInput) {
    return apiFetch<{ review: BrokerReview }>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
