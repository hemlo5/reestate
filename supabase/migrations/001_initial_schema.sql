-- Housed Reverse Real Estate Marketplace — Initial PostgreSQL / Supabase Migration
-- Run in Supabase SQL Editor or via `supabase db push` once credentials are configured.

create extension if not exists pg_trgm;

-- 1. USERS & SESSIONS
create table if not exists public.users (
  id text primary key,
  name text not null,
  email text not null,
  phone text not null default '',
  role text not null check (role in ('seeker', 'broker')),
  city text not null default 'Bengaluru',
  avatar_url text,
  auth_method text not null default 'password' check (auth_method in ('password', 'otp')),
  password_hash text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists users_email_lower_idx on public.users (lower(email));

create table if not exists public.sessions (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on public.sessions (user_id);

-- 2. BROKER PROFILES
create table if not exists public.broker_profiles (
  user_id text primary key references public.users(id) on delete cascade,
  is_independent boolean not null default false,
  agency_name text not null default '',
  agency_address text not null default '',
  phone text not null default '',
  operating_localities text[] not null default '{}',
  property_categories text[] not null default '{}',
  specializations text[] not null default '{}',
  years_experience integer not null default 1,
  properties_managed_count integer not null default 0,
  website text,
  rera_id text,
  avatar_url text,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  verified boolean not null default false,
  bio text not null default '',
  closed_deals_count integer not null default 0,
  verification_docs jsonb
);

-- 3. PROPERTIES INVENTORY
create table if not exists public.properties (
  id text primary key,
  broker_id text not null references public.users(id) on delete cascade,
  broker_name text not null,
  broker_agency text,
  broker_phone text not null default '',
  broker_verified boolean not null default false,
  title text not null,
  intent text not null check (intent in ('rent', 'buy')),
  transaction_type text,
  listing_category text,
  locality text not null,
  city text not null default 'Bengaluru',
  pincode text,
  landmark text,
  address text not null,
  price bigint not null check (price > 0),
  security_deposit bigint,
  maintenance_charges integer,
  price_per_sqft integer,
  brokerage_amount numeric,
  brokerage_type text check (brokerage_type in ('fixed', 'percentage')),
  deposit_or_maintenance text,
  brokerage_fee text not null default '',
  property_type text not null check (property_type in ('Flat', 'House', 'Room')),
  bedrooms integer not null default 2,
  bathrooms integer not null default 2,
  area_sqft integer not null default 1000,
  carpet_area_sqft integer,
  built_up_area_sqft integer,
  floor_info text not null default '',
  floor_number integer,
  total_floors integer,
  furnishing text not null check (furnishing in ('Furnished', 'Semi-furnished', 'Unfurnished')),
  parking text,
  balconies integer,
  property_age text,
  available_from text not null default 'Immediate',
  amenities text[] not null default '{}',
  description text not null default '',
  additional_info text,
  selling_points text[] not null default '{}',
  video_tour_url text,
  images text[] not null default '{}',
  availability text not null default 'available' check (availability in ('available', 'draft', 'rented', 'sold', 'inactive')),
  is_demo boolean not null default false,
  map_x double precision not null default 50,
  map_y double precision not null default 50,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

create index if not exists properties_search_idx
  on public.properties (availability, intent, locality, price, bedrooms);
create index if not exists properties_broker_idx
  on public.properties (broker_id, created_at desc);
create index if not exists properties_amenities_gin_idx
  on public.properties using gin (amenities);
create index if not exists properties_title_trgm_idx
  on public.properties using gin (title gin_trgm_ops);

-- 4. CUSTOMER REQUIREMENTS
create table if not exists public.requirements (
  id text primary key,
  seeker_id text not null references public.users(id) on delete cascade,
  seeker_name text not null,
  seeker_phone text not null default '',
  seeker_email text not null default '',
  intent text not null check (intent in ('rent', 'buy')),
  localities text[] not null default '{}',
  budget_min bigint not null check (budget_min >= 0),
  budget_max bigint not null check (budget_max > 0),
  property_type text not null check (property_type in ('Flat', 'House', 'Room')),
  bedrooms integer not null default 2,
  furnishing text not null default 'Any' check (furnishing in ('Furnished', 'Semi-furnished', 'Unfurnished', 'Any')),
  move_in_date text not null default '',
  amenities text[] not null default '{}',
  notes text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'fulfilled')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists requirements_seeker_idx on public.requirements (seeker_id, created_at desc);
create index if not exists requirements_status_intent_idx on public.requirements (status, intent);
create index if not exists requirements_localities_gin_idx on public.requirements using gin (localities);

-- 5. PROPOSALS
create table if not exists public.proposals (
  id text primary key,
  requirement_id text not null references public.requirements(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  broker_id text not null references public.users(id) on delete cascade,
  seeker_id text not null references public.users(id) on delete cascade,
  proposed_price bigint not null check (proposed_price > 0),
  brokerage_charge text not null default '',
  message text not null default '',
  why_matches text,
  availability_confirmed boolean not null default true,
  contact_shared boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'shortlisted', 'accepted', 'declined')),
  status_detail text default 'Sent',
  viewed_at timestamptz,
  match_score integer not null default 0,
  match_reasons text[] not null default '{}',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (requirement_id, property_id)
);

create index if not exists proposals_seeker_idx on public.proposals (seeker_id, status, created_at desc);
create index if not exists proposals_broker_idx on public.proposals (broker_id, created_at desc);

-- 6. VISITS
create table if not exists public.visits (
  id text primary key,
  property_id text not null references public.properties(id) on delete cascade,
  proposal_id text references public.proposals(id) on delete set null,
  seeker_id text not null references public.users(id) on delete cascade,
  seeker_name text not null,
  broker_id text not null references public.users(id) on delete cascade,
  date text not null,
  time_slot text not null,
  notes text,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists visits_seeker_idx on public.visits (seeker_id, created_at desc);
create index if not exists visits_broker_idx on public.visits (broker_id, created_at desc);

-- 7. MESSAGES
create table if not exists public.messages (
  id text primary key,
  proposal_id text references public.proposals(id) on delete set null,
  property_id text not null references public.properties(id) on delete cascade,
  sender_id text not null references public.users(id) on delete cascade,
  sender_name text not null,
  sender_role text not null check (sender_role in ('seeker', 'broker')),
  recipient_id text not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_property_idx on public.messages (property_id, created_at asc);

-- 8. NOTIFICATIONS
create table if not exists public.notifications (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  related_id text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, read, created_at desc);

-- 9. BROKER REVIEWS
create table if not exists public.broker_reviews (
  id text primary key,
  broker_id text not null references public.users(id) on delete cascade,
  author_id text not null references public.users(id) on delete cascade,
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  locality text,
  created_at timestamptz not null default now()
);

create index if not exists broker_reviews_broker_idx on public.broker_reviews (broker_id, created_at desc);

-- 10. SAVED PROPERTIES
create table if not exists public.saved_properties (
  user_id text not null references public.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

-- 11. ROW LEVEL SECURITY (Defense-in-depth when direct Supabase access is enabled; server uses service-role / pg Pool)
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.broker_profiles enable row level security;
alter table public.properties enable row level security;
alter table public.requirements enable row level security;
alter table public.proposals enable row level security;
alter table public.visits enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.broker_reviews enable row level security;
alter table public.saved_properties enable row level security;

drop policy if exists "public_read_available_properties" on public.properties;
create policy "public_read_available_properties"
  on public.properties for select
  using (availability = 'available');

drop policy if exists "public_read_broker_profiles" on public.broker_profiles;
create policy "public_read_broker_profiles"
  on public.broker_profiles for select
  using (true);

drop policy if exists "public_read_broker_reviews" on public.broker_reviews;
create policy "public_read_broker_reviews"
  on public.broker_reviews for select
  using (true);

-- 12. STORAGE BUCKETS (Public property/avatar media vs private KYC verification documents)
insert into storage.buckets (id, name, public)
values ('public-media', 'public-media', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('private-verification', 'private-verification', false)
on conflict (id) do nothing;
