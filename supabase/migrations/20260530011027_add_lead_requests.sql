do $$
begin
  create type public.lead_request_type as enum ('listing_info');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.lead_request_status as enum ('new', 'contacted', 'waiting_on_partner', 'closed', 'spam');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.lead_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  submitted_by uuid not null references public.app_profiles(id) on delete cascade,
  group_id uuid references public.housing_groups(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  campus_id uuid references public.campuses(id) on delete set null,
  lead_type public.lead_request_type not null default 'listing_info',
  status public.lead_request_status not null default 'new',
  contact_name text check (
    contact_name is null
    or char_length(trim(contact_name)) between 1 and 80
  ),
  contact_email text not null check (
    char_length(contact_email) <= 254
    and contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  message text not null check (char_length(trim(message)) between 1 and 1200),
  partner_share_consent boolean not null default false,
  partner_share_consented_at timestamptz,
  source_screen text not null default 'listing_detail',
  preferences_snapshot jsonb not null default '{}'::jsonb,
  listing_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    partner_share_consent
    and partner_share_consented_at is not null
  ),
  check (jsonb_typeof(preferences_snapshot) = 'object'),
  check (jsonb_typeof(listing_snapshot) = 'object'),
  check (jsonb_typeof(metadata) = 'object')
);

create index if not exists lead_requests_submitted_by_created_at_idx
  on public.lead_requests (submitted_by, created_at desc);

create index if not exists lead_requests_group_id_created_at_idx
  on public.lead_requests (group_id, created_at desc)
  where group_id is not null;

create index if not exists lead_requests_property_id_created_at_idx
  on public.lead_requests (property_id, created_at desc)
  where property_id is not null;

create index if not exists lead_requests_status_created_at_idx
  on public.lead_requests (status, created_at desc);

drop trigger if exists set_lead_requests_updated_at on public.lead_requests;
create trigger set_lead_requests_updated_at
before update on public.lead_requests
for each row execute function public.set_updated_at();

alter table public.lead_requests enable row level security;

revoke all on public.lead_requests from anon;
grant select, insert on public.lead_requests to authenticated;

drop policy if exists "Users can create their own lead requests" on public.lead_requests;
create policy "Users can create their own lead requests"
on public.lead_requests for insert
to authenticated
with check (
  (select auth.uid()) = submitted_by
  and (
    group_id is null
    or hive_private.is_active_group_member(group_id, (select auth.uid()))
  )
  and (
    property_id is null
    or exists (
      select 1
      from public.properties p
      where p.id = lead_requests.property_id
        and p.is_active
        and p.is_quality_approved
    )
  )
);

drop policy if exists "Users can read their own lead requests" on public.lead_requests;
create policy "Users can read their own lead requests"
on public.lead_requests for select
to authenticated
using ((select auth.uid()) = submitted_by);

drop policy if exists "Group members can read group lead requests" on public.lead_requests;
create policy "Group members can read group lead requests"
on public.lead_requests for select
to authenticated
using (
  group_id is not null
  and hive_private.is_active_group_member(group_id, (select auth.uid()))
);
