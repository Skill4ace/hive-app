create schema if not exists hive_private;
revoke all on schema hive_private from public;
grant usage on schema hive_private to authenticated;

do $$
begin
  create type public.housing_group_member_role as enum ('owner', 'member');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.housing_group_member_status as enum ('active', 'left');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.hive_listing_decision as enum ('liked', 'passed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.app_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(trim(username)) between 2 and 32),
  campus_slug text not null default 'ucla',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.housing_groups (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 80),
  owner_id uuid not null references public.app_profiles(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_profiles
  add column if not exists active_group_id uuid references public.housing_groups(id) on delete set null;

create table if not exists public.group_invites (
  id uuid primary key default extensions.gen_random_uuid(),
  group_id uuid not null references public.housing_groups(id) on delete cascade,
  invite_code text not null unique,
  created_by uuid not null references public.app_profiles(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  check (invite_code ~ '^HIVE-[A-F0-9]{6}$')
);

create table if not exists public.group_members (
  group_id uuid not null references public.housing_groups(id) on delete cascade,
  user_id uuid not null references public.app_profiles(id) on delete cascade,
  role public.housing_group_member_role not null default 'member',
  status public.housing_group_member_status not null default 'active',
  display_name text not null check (char_length(trim(display_name)) between 2 and 32),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.user_listing_decisions (
  user_id uuid not null references public.app_profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  decision public.hive_listing_decision not null,
  score integer check (score is null or score between 0 and 100),
  decided_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table if not exists public.group_listing_votes (
  group_id uuid not null references public.housing_groups(id) on delete cascade,
  user_id uuid not null references public.app_profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  decision public.hive_listing_decision not null,
  score integer check (score is null or score between 0 and 100),
  decided_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id, property_id),
  foreign key (group_id, user_id) references public.group_members(group_id, user_id) on delete cascade
);

create index if not exists app_profiles_active_group_id_idx
  on public.app_profiles (active_group_id);

create index if not exists housing_groups_campus_id_idx
  on public.housing_groups (campus_id);

create index if not exists housing_groups_owner_id_idx
  on public.housing_groups (owner_id);

create index if not exists group_invites_group_id_idx
  on public.group_invites (group_id);

create index if not exists group_invites_active_code_idx
  on public.group_invites (invite_code)
  where active;

create index if not exists group_members_user_id_status_idx
  on public.group_members (user_id, status);

create index if not exists group_listing_votes_property_id_idx
  on public.group_listing_votes (property_id);

create index if not exists group_listing_votes_group_decision_idx
  on public.group_listing_votes (group_id, decision, decided_at desc);

drop trigger if exists set_app_profiles_updated_at on public.app_profiles;
create trigger set_app_profiles_updated_at
before update on public.app_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_housing_groups_updated_at on public.housing_groups;
create trigger set_housing_groups_updated_at
before update on public.housing_groups
for each row execute function public.set_updated_at();

drop trigger if exists set_group_invites_updated_at on public.group_invites;
create trigger set_group_invites_updated_at
before update on public.group_invites
for each row execute function public.set_updated_at();

drop trigger if exists set_group_members_updated_at on public.group_members;
create trigger set_group_members_updated_at
before update on public.group_members
for each row execute function public.set_updated_at();

drop trigger if exists set_user_listing_decisions_updated_at on public.user_listing_decisions;
create trigger set_user_listing_decisions_updated_at
before update on public.user_listing_decisions
for each row execute function public.set_updated_at();

drop trigger if exists set_group_listing_votes_updated_at on public.group_listing_votes;
create trigger set_group_listing_votes_updated_at
before update on public.group_listing_votes
for each row execute function public.set_updated_at();

alter table public.app_profiles enable row level security;
alter table public.housing_groups enable row level security;
alter table public.group_invites enable row level security;
alter table public.group_members enable row level security;
alter table public.user_listing_decisions enable row level security;
alter table public.group_listing_votes enable row level security;

grant select, insert, update on public.app_profiles to authenticated;
grant select on public.housing_groups to authenticated;
grant select on public.group_members to authenticated;
grant select, insert, update, delete on public.user_listing_decisions to authenticated;
grant select, insert, update, delete on public.group_listing_votes to authenticated;
revoke all on public.group_invites from anon, authenticated;

create or replace function hive_private.is_active_group_member(target_group_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members gm
    join public.housing_groups hg on hg.id = gm.group_id
    where gm.group_id = target_group_id
      and gm.user_id = target_user_id
      and gm.status = 'active'
      and hg.is_active
  );
$$;

create or replace function hive_private.normalize_invite_code(raw_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  with cleaned as (
    select upper(regexp_replace(coalesce(raw_code, ''), '[^A-Za-z0-9]', '', 'g')) as value
  )
  select case
    when value = '' then ''
    when left(value, 4) = 'HIVE' then 'HIVE-' || substring(value from 5 for 6)
    else 'HIVE-' || substring(value from 1 for 6)
  end
  from cleaned;
$$;

create or replace function hive_private.generate_invite_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  candidate text;
  attempts integer := 0;
begin
  loop
    attempts := attempts + 1;
    candidate := 'HIVE-' || upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6));

    if not exists (
      select 1
      from public.group_invites gi
      where gi.invite_code = candidate
    ) then
      return candidate;
    end if;

    if attempts >= 20 then
      raise exception 'Unable to generate invite code' using errcode = '23505';
    end if;
  end loop;
end;
$$;

create or replace function hive_private.upsert_profile(profile_username text, profile_campus_slug text)
returns public.app_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_username text := left(nullif(trim(coalesce(profile_username, '')), ''), 32);
  normalized_campus_slug text := lower(nullif(trim(coalesce(profile_campus_slug, '')), ''));
  profile_row public.app_profiles%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required' using errcode = '28000';
  end if;

  if normalized_username is null or char_length(normalized_username) < 2 then
    normalized_username := 'Hive user';
  end if;

  if normalized_campus_slug is null then
    normalized_campus_slug := 'ucla';
  end if;

  insert into public.app_profiles (id, username, campus_slug)
  values (current_user_id, normalized_username, normalized_campus_slug)
  on conflict (id) do update
    set username = excluded.username,
        campus_slug = excluded.campus_slug,
        updated_at = now()
  returning * into profile_row;

  update public.group_members
  set display_name = normalized_username,
      updated_at = now()
  where user_id = current_user_id
    and status = 'active'
    and display_name is distinct from normalized_username;

  return profile_row;
end;
$$;

create or replace function hive_private.build_my_group_payload(target_group_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'group',
    jsonb_build_object(
      'id', hg.id,
      'name', hg.name,
      'campusId', hg.campus_id,
      'campusSlug', c.slug,
      'campusName', coalesce(c.short_name, c.name),
      'ownerId', hg.owner_id,
      'createdAt', hg.created_at
    ),
    'inviteCode',
    (
      select gi.invite_code
      from public.group_invites gi
      where gi.group_id = hg.id
        and gi.active
        and (gi.expires_at is null or gi.expires_at > now())
      order by gi.created_at desc
      limit 1
    ),
    'members',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'userId', gm.user_id,
            'name', gm.display_name,
            'role', gm.role,
            'joinedAt', gm.joined_at
          )
          order by case when gm.role = 'owner' then 0 else 1 end, gm.joined_at
        )
        from public.group_members gm
        where gm.group_id = hg.id
          and gm.status = 'active'
      ),
      '[]'::jsonb
    )
  )
  from public.housing_groups hg
  join public.campuses c on c.id = hg.campus_id
  where hg.id = target_group_id
    and hg.is_active;
$$;

create or replace function hive_private.create_housing_group(profile_username text, profile_campus_slug text default 'ucla')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_row public.app_profiles%rowtype;
  campus_row public.campuses%rowtype;
  group_row public.housing_groups%rowtype;
  code text;
begin
  profile_row := hive_private.upsert_profile(profile_username, profile_campus_slug);

  select * into campus_row
  from public.campuses c
  where c.slug = profile_row.campus_slug
  limit 1;

  if campus_row.id is null then
    raise exception 'Campus not found' using errcode = '22023';
  end if;

  insert into public.housing_groups (campus_id, name, owner_id)
  values (campus_row.id, profile_row.username || '''s group', profile_row.id)
  returning * into group_row;

  insert into public.group_members (group_id, user_id, role, status, display_name)
  values (group_row.id, profile_row.id, 'owner', 'active', profile_row.username);

  code := hive_private.generate_invite_code();

  insert into public.group_invites (group_id, invite_code, created_by)
  values (group_row.id, code, profile_row.id);

  update public.app_profiles
  set active_group_id = group_row.id,
      updated_at = now()
  where id = profile_row.id;

  return hive_private.build_my_group_payload(group_row.id);
end;
$$;

create or replace function hive_private.join_housing_group(invite_code text, profile_username text, profile_campus_slug text default 'ucla')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_code text := hive_private.normalize_invite_code(invite_code);
  profile_row public.app_profiles%rowtype;
  invite_row public.group_invites%rowtype;
begin
  profile_row := hive_private.upsert_profile(profile_username, profile_campus_slug);

  select gi.* into invite_row
  from public.group_invites gi
  join public.housing_groups hg on hg.id = gi.group_id
  where gi.invite_code = normalized_code
    and gi.active
    and (gi.expires_at is null or gi.expires_at > now())
    and hg.is_active
  limit 1;

  if invite_row.id is null then
    raise exception 'Invalid group code' using errcode = '22023';
  end if;

  insert into public.group_members (group_id, user_id, role, status, display_name, left_at)
  values (invite_row.group_id, profile_row.id, 'member', 'active', profile_row.username, null)
  on conflict (group_id, user_id) do update
    set status = 'active',
        display_name = excluded.display_name,
        left_at = null,
        updated_at = now();

  update public.app_profiles
  set active_group_id = invite_row.group_id,
      updated_at = now()
  where id = profile_row.id;

  return hive_private.build_my_group_payload(invite_row.group_id);
end;
$$;

create or replace function hive_private.get_my_group()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_group_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required' using errcode = '28000';
  end if;

  select ap.active_group_id into target_group_id
  from public.app_profiles ap
  where ap.id = current_user_id;

  if target_group_id is null then
    return null;
  end if;

  if not hive_private.is_active_group_member(target_group_id, current_user_id) then
    return null;
  end if;

  return hive_private.build_my_group_payload(target_group_id);
end;
$$;

create or replace function hive_private.leave_active_group()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_group_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required' using errcode = '28000';
  end if;

  select active_group_id into target_group_id
  from public.app_profiles
  where id = current_user_id;

  if target_group_id is null then
    return;
  end if;

  update public.group_members
  set status = 'left',
      left_at = now(),
      updated_at = now()
  where group_id = target_group_id
    and user_id = current_user_id;

  update public.app_profiles
  set active_group_id = null,
      updated_at = now()
  where id = current_user_id;
end;
$$;

create or replace function public.create_housing_group(profile_username text, profile_campus_slug text default 'ucla')
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select hive_private.create_housing_group(profile_username, profile_campus_slug);
$$;

create or replace function public.join_housing_group(invite_code text, profile_username text, profile_campus_slug text default 'ucla')
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select hive_private.join_housing_group(invite_code, profile_username, profile_campus_slug);
$$;

create or replace function public.get_my_group()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select hive_private.get_my_group();
$$;

create or replace function public.leave_active_group()
returns void
language sql
security invoker
set search_path = ''
as $$
  select hive_private.leave_active_group();
$$;

revoke all on function hive_private.is_active_group_member(uuid, uuid) from public;
revoke all on function hive_private.normalize_invite_code(text) from public;
revoke all on function hive_private.generate_invite_code() from public;
revoke all on function hive_private.upsert_profile(text, text) from public;
revoke all on function hive_private.build_my_group_payload(uuid) from public;
revoke all on function hive_private.create_housing_group(text, text) from public;
revoke all on function hive_private.join_housing_group(text, text, text) from public;
revoke all on function hive_private.get_my_group() from public;
revoke all on function hive_private.leave_active_group() from public;
revoke all on function public.create_housing_group(text, text) from public;
revoke all on function public.join_housing_group(text, text, text) from public;
revoke all on function public.get_my_group() from public;
revoke all on function public.leave_active_group() from public;

grant execute on function hive_private.is_active_group_member(uuid, uuid) to authenticated;
grant execute on function hive_private.create_housing_group(text, text) to authenticated;
grant execute on function hive_private.join_housing_group(text, text, text) to authenticated;
grant execute on function hive_private.get_my_group() to authenticated;
grant execute on function hive_private.leave_active_group() to authenticated;
grant execute on function public.create_housing_group(text, text) to authenticated;
grant execute on function public.join_housing_group(text, text, text) to authenticated;
grant execute on function public.get_my_group() to authenticated;
grant execute on function public.leave_active_group() to authenticated;

drop policy if exists "Users can read their own profile" on public.app_profiles;
create policy "Users can read their own profile"
on public.app_profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can create their own profile" on public.app_profiles;
create policy "Users can create their own profile"
on public.app_profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.app_profiles;
create policy "Users can update their own profile"
on public.app_profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Group members can read their groups" on public.housing_groups;
create policy "Group members can read their groups"
on public.housing_groups for select
to authenticated
using (hive_private.is_active_group_member(id, (select auth.uid())));

drop policy if exists "Group members can read active members" on public.group_members;
create policy "Group members can read active members"
on public.group_members for select
to authenticated
using (hive_private.is_active_group_member(group_id, (select auth.uid())));

drop policy if exists "Users can read their own listing decisions" on public.user_listing_decisions;
create policy "Users can read their own listing decisions"
on public.user_listing_decisions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own listing decisions" on public.user_listing_decisions;
create policy "Users can create their own listing decisions"
on public.user_listing_decisions for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own listing decisions" on public.user_listing_decisions;
create policy "Users can update their own listing decisions"
on public.user_listing_decisions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own listing decisions" on public.user_listing_decisions;
create policy "Users can delete their own listing decisions"
on public.user_listing_decisions for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Group members can read group votes" on public.group_listing_votes;
create policy "Group members can read group votes"
on public.group_listing_votes for select
to authenticated
using (hive_private.is_active_group_member(group_id, (select auth.uid())));

drop policy if exists "Users can create their own group votes" on public.group_listing_votes;
create policy "Users can create their own group votes"
on public.group_listing_votes for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and hive_private.is_active_group_member(group_id, (select auth.uid()))
);

drop policy if exists "Users can update their own group votes" on public.group_listing_votes;
create policy "Users can update their own group votes"
on public.group_listing_votes for update
to authenticated
using (
  (select auth.uid()) = user_id
  and hive_private.is_active_group_member(group_id, (select auth.uid()))
)
with check (
  (select auth.uid()) = user_id
  and hive_private.is_active_group_member(group_id, (select auth.uid()))
);

drop policy if exists "Users can delete their own group votes" on public.group_listing_votes;
create policy "Users can delete their own group votes"
on public.group_listing_votes for delete
to authenticated
using ((select auth.uid()) = user_id);
