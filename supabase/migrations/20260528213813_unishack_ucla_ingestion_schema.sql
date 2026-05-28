create schema if not exists extensions;

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
begin
  create type public.ingestion_run_status as enum ('running', 'succeeded', 'failed', 'partial');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.availability_status as enum ('available_now', 'available_on', 'not_available', 'unknown');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.image_download_status as enum ('pending', 'mirrored', 'failed', 'skipped');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.data_sources (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name text not null,
  source_type text not null,
  base_url text not null,
  terms_url text,
  robots_url text,
  allowed_use text,
  attribution_text text,
  rate_limit_per_minute integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingestion_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  source_id uuid not null references public.data_sources(id) on delete restrict,
  campus_slug text not null,
  run_type text not null,
  status public.ingestion_run_status not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_seen integer not null default 0,
  records_created integer not null default 0,
  records_updated integer not null default 0,
  records_failed integer not null default 0,
  error_summary text,
  manifest_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.campuses (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text,
  address text,
  latitude double precision,
  longitude double precision,
  location extensions.geography(point, 4326),
  timezone text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete restrict,
  source_id uuid not null references public.data_sources(id) on delete restrict,
  source_external_id text not null,
  source_url text not null,
  name text not null,
  slug text not null,
  property_type text,
  description text,
  address text,
  latitude double precision,
  longitude double precision,
  location extensions.geography(point, 4326),
  manager_display_name text,
  is_active boolean not null default true,
  is_quality_approved boolean not null default true,
  data_quality_warnings jsonb not null default '[]'::jsonb,
  source_last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, source_external_id),
  unique (source_id, slug)
);

create table if not exists public.source_listing_records (
  id uuid primary key default extensions.gen_random_uuid(),
  source_id uuid not null references public.data_sources(id) on delete restrict,
  external_id text not null,
  source_url text not null,
  property_id uuid references public.properties(id) on delete set null,
  raw_hash text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_status text,
  payload_summary jsonb not null default '{}'::jsonb,
  unique (source_id, external_id)
);

create table if not exists public.property_units (
  id uuid primary key default extensions.gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  source_unit_id text not null,
  listing_type text,
  title text,
  rent_monthly integer,
  bedrooms numeric(5, 2),
  bathrooms numeric(5, 2),
  max_occupants integer,
  available boolean,
  availability_status public.availability_status not null default 'unknown',
  move_in date,
  lease_term_months integer,
  security_deposit integer,
  parking_spots integer,
  description text,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, source_unit_id)
);

create table if not exists public.listing_photos (
  id uuid primary key default extensions.gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  source_url text not null,
  storage_bucket text not null default 'listing-media',
  storage_path text,
  display_order integer not null,
  content_type text,
  byte_size integer,
  sha256 text,
  download_status public.image_download_status not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, source_url),
  unique (storage_bucket, storage_path)
);

create table if not exists public.property_promotions (
  property_id uuid primary key references public.properties(id) on delete cascade,
  badge text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  reviewer_name text,
  years_text text,
  rating numeric(3, 2),
  body text,
  would_recommend boolean,
  source_hash text not null,
  created_at timestamptz not null default now(),
  unique (property_id, source_hash)
);

create table if not exists public.property_faqs (
  id uuid primary key default extensions.gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  question text not null,
  answer text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (property_id, question)
);

create table if not exists public.points_of_interest (
  id uuid primary key default extensions.gen_random_uuid(),
  source_external_id text,
  name text not null,
  address text,
  latitude double precision,
  longitude double precision,
  location extensions.geography(point, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, address)
);

create table if not exists public.property_poi_metrics (
  property_id uuid not null references public.properties(id) on delete cascade,
  poi_id uuid not null references public.points_of_interest(id) on delete cascade,
  distance_meters integer,
  distance_miles numeric(8, 3),
  walk_seconds integer,
  bike_seconds integer,
  drive_seconds integer,
  transit_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (property_id, poi_id)
);

create table if not exists public.listing_campus_metrics (
  property_id uuid not null references public.properties(id) on delete cascade,
  campus_id uuid not null references public.campuses(id) on delete cascade,
  distance_meters integer,
  distance_miles numeric(8, 3),
  walk_seconds integer,
  bike_seconds integer,
  drive_seconds integer,
  transit_seconds integer,
  computed_at timestamptz not null default now(),
  primary key (property_id, campus_id)
);

create table if not exists public.listing_search_index (
  property_id uuid primary key references public.properties(id) on delete cascade,
  campus_id uuid not null references public.campuses(id) on delete cascade,
  source_id uuid not null references public.data_sources(id) on delete restrict,
  source_url text not null,
  title text not null,
  slug text not null,
  address text,
  latitude double precision,
  longitude double precision,
  location extensions.geography(point, 4326),
  primary_photo_url text,
  storage_photo_path text,
  min_rent integer,
  max_rent integer,
  min_beds numeric(5, 2),
  max_beds numeric(5, 2),
  min_baths numeric(5, 2),
  max_baths numeric(5, 2),
  available_unit_count integer not null default 0,
  total_unit_count integer not null default 0,
  earliest_move_in date,
  walk_seconds integer,
  bike_seconds integer,
  drive_seconds integer,
  transit_seconds integer,
  distance_meters integer,
  promotion_badge text,
  manager_display_name text,
  active boolean not null default true,
  quality_score integer not null default 100,
  updated_at timestamptz not null default now()
);

create index if not exists campuses_location_gix on public.campuses using gist (location);
create index if not exists properties_location_gix on public.properties using gist (location);
create index if not exists properties_source_idx on public.properties (source_id, source_external_id);
create index if not exists property_units_property_idx on public.property_units (property_id, availability_status, rent_monthly);
create index if not exists listing_search_location_gix on public.listing_search_index using gist (location);
create index if not exists listing_search_campus_active_idx
  on public.listing_search_index (campus_id, active, min_rent, earliest_move_in);

drop trigger if exists set_data_sources_updated_at on public.data_sources;
create trigger set_data_sources_updated_at
before update on public.data_sources
for each row execute function public.set_updated_at();

drop trigger if exists set_campuses_updated_at on public.campuses;
create trigger set_campuses_updated_at
before update on public.campuses
for each row execute function public.set_updated_at();

drop trigger if exists set_properties_updated_at on public.properties;
create trigger set_properties_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

drop trigger if exists set_property_units_updated_at on public.property_units;
create trigger set_property_units_updated_at
before update on public.property_units
for each row execute function public.set_updated_at();

drop trigger if exists set_listing_photos_updated_at on public.listing_photos;
create trigger set_listing_photos_updated_at
before update on public.listing_photos
for each row execute function public.set_updated_at();

drop trigger if exists set_property_promotions_updated_at on public.property_promotions;
create trigger set_property_promotions_updated_at
before update on public.property_promotions
for each row execute function public.set_updated_at();

drop trigger if exists set_points_of_interest_updated_at on public.points_of_interest;
create trigger set_points_of_interest_updated_at
before update on public.points_of_interest
for each row execute function public.set_updated_at();

drop trigger if exists set_property_poi_metrics_updated_at on public.property_poi_metrics;
create trigger set_property_poi_metrics_updated_at
before update on public.property_poi_metrics
for each row execute function public.set_updated_at();

alter table public.data_sources enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.campuses enable row level security;
alter table public.properties enable row level security;
alter table public.source_listing_records enable row level security;
alter table public.property_units enable row level security;
alter table public.listing_photos enable row level security;
alter table public.property_promotions enable row level security;
alter table public.property_reviews enable row level security;
alter table public.property_faqs enable row level security;
alter table public.points_of_interest enable row level security;
alter table public.property_poi_metrics enable row level security;
alter table public.listing_campus_metrics enable row level security;
alter table public.listing_search_index enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.data_sources to anon, authenticated;
grant select on public.campuses to anon, authenticated;
grant select on public.properties to anon, authenticated;
grant select on public.property_units to anon, authenticated;
grant select on public.listing_photos to anon, authenticated;
grant select on public.property_promotions to anon, authenticated;
grant select on public.property_reviews to anon, authenticated;
grant select on public.property_faqs to anon, authenticated;
grant select on public.points_of_interest to anon, authenticated;
grant select on public.property_poi_metrics to anon, authenticated;
grant select on public.listing_campus_metrics to anon, authenticated;
grant select on public.listing_search_index to anon, authenticated;

drop policy if exists "Public can read active data sources" on public.data_sources;
create policy "Public can read active data sources"
on public.data_sources for select
to anon, authenticated
using (active);

drop policy if exists "Public can read campuses" on public.campuses;
create policy "Public can read campuses"
on public.campuses for select
to anon, authenticated
using (true);

drop policy if exists "Public can read approved properties" on public.properties;
create policy "Public can read approved properties"
on public.properties for select
to anon, authenticated
using (is_active and is_quality_approved);

drop policy if exists "Public can read units for approved properties" on public.property_units;
create policy "Public can read units for approved properties"
on public.property_units for select
to anon, authenticated
using (
  exists (
    select 1
    from public.properties p
    where p.id = property_units.property_id
      and p.is_active
      and p.is_quality_approved
  )
);

drop policy if exists "Public can read photos for approved properties" on public.listing_photos;
create policy "Public can read photos for approved properties"
on public.listing_photos for select
to anon, authenticated
using (
  exists (
    select 1
    from public.properties p
    where p.id = listing_photos.property_id
      and p.is_active
      and p.is_quality_approved
  )
);

drop policy if exists "Public can read promotions for approved properties" on public.property_promotions;
create policy "Public can read promotions for approved properties"
on public.property_promotions for select
to anon, authenticated
using (
  exists (
    select 1
    from public.properties p
    where p.id = property_promotions.property_id
      and p.is_active
      and p.is_quality_approved
  )
);

drop policy if exists "Public can read reviews for approved properties" on public.property_reviews;
create policy "Public can read reviews for approved properties"
on public.property_reviews for select
to anon, authenticated
using (
  exists (
    select 1
    from public.properties p
    where p.id = property_reviews.property_id
      and p.is_active
      and p.is_quality_approved
  )
);

drop policy if exists "Public can read faqs for approved properties" on public.property_faqs;
create policy "Public can read faqs for approved properties"
on public.property_faqs for select
to anon, authenticated
using (
  exists (
    select 1
    from public.properties p
    where p.id = property_faqs.property_id
      and p.is_active
      and p.is_quality_approved
  )
);

drop policy if exists "Public can read points of interest" on public.points_of_interest;
create policy "Public can read points of interest"
on public.points_of_interest for select
to anon, authenticated
using (true);

drop policy if exists "Public can read poi metrics for approved properties" on public.property_poi_metrics;
create policy "Public can read poi metrics for approved properties"
on public.property_poi_metrics for select
to anon, authenticated
using (
  exists (
    select 1
    from public.properties p
    where p.id = property_poi_metrics.property_id
      and p.is_active
      and p.is_quality_approved
  )
);

drop policy if exists "Public can read campus metrics for approved properties" on public.listing_campus_metrics;
create policy "Public can read campus metrics for approved properties"
on public.listing_campus_metrics for select
to anon, authenticated
using (
  exists (
    select 1
    from public.properties p
    where p.id = listing_campus_metrics.property_id
      and p.is_active
      and p.is_quality_approved
  )
);

drop policy if exists "Public can read active listing search index" on public.listing_search_index;
create policy "Public can read active listing search index"
on public.listing_search_index for select
to anon, authenticated
using (active);
