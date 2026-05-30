alter table public.group_invites
  drop constraint if exists group_invites_invite_code_check;

create or replace function hive_private.normalize_invite_code(raw_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(upper(regexp_replace(coalesce(raw_code, ''), '[^A-Za-z]', '', 'g')), 6);
$$;

create or replace function hive_private.generate_invite_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  bytes bytea;
  candidate text;
  attempts integer := 0;
begin
  loop
    attempts := attempts + 1;
    bytes := extensions.gen_random_bytes(6);
    candidate :=
      substr(alphabet, (get_byte(bytes, 0) % 26) + 1, 1) ||
      substr(alphabet, (get_byte(bytes, 1) % 26) + 1, 1) ||
      substr(alphabet, (get_byte(bytes, 2) % 26) + 1, 1) ||
      substr(alphabet, (get_byte(bytes, 3) % 26) + 1, 1) ||
      substr(alphabet, (get_byte(bytes, 4) % 26) + 1, 1) ||
      substr(alphabet, (get_byte(bytes, 5) % 26) + 1, 1);

    if not exists (
      select 1
      from public.group_invites gi
      where gi.invite_code = candidate
    ) then
      return candidate;
    end if;

    if attempts >= 50 then
      raise exception 'Unable to generate invite code' using errcode = '23505';
    end if;
  end loop;
end;
$$;

do $$
declare
  invite record;
  next_code text;
begin
  for invite in
    select id
    from public.group_invites
    order by created_at, id
  loop
    next_code := hive_private.generate_invite_code();

    update public.group_invites
    set invite_code = next_code,
        updated_at = now()
    where id = invite.id;
  end loop;
end $$;

alter table public.group_invites
  add constraint group_invites_invite_code_check
  check (invite_code ~ '^[A-Z]{6}$');

create table if not exists hive_private.group_invite_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null check (invite_code ~ '^[A-Z]{0,6}$'),
  valid boolean not null default false,
  attempted_at timestamptz not null default now()
);

alter table hive_private.group_invite_attempts
  drop constraint if exists group_invite_attempts_invite_code_check;

alter table hive_private.group_invite_attempts
  add constraint group_invite_attempts_invite_code_check
  check (invite_code ~ '^[A-Z]{0,6}$');

create index if not exists group_invite_attempts_user_attempted_at_idx
  on hive_private.group_invite_attempts (user_id, attempted_at desc);

create or replace function hive_private.check_group_invite_attempt_limit(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is null then
    raise exception 'Authenticated user required' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_user_id::text || ':group_invite_attempts', 0));

  if (
    select count(*)
    from hive_private.group_invite_attempts gia
    where gia.user_id = target_user_id
      and gia.attempted_at > now() - interval '15 minutes'
  ) >= 10 then
    raise exception 'Too many group code attempts. Please try again later.' using errcode = '22023';
  end if;

  if (
    select count(*)
    from hive_private.group_invite_attempts gia
    where gia.user_id = target_user_id
      and gia.attempted_at > now() - interval '1 day'
  ) >= 40 then
    raise exception 'Too many group code attempts. Please try again later.' using errcode = '22023';
  end if;
end;
$$;

create or replace function hive_private.record_group_invite_attempt(
  target_user_id uuid,
  normalized_code text,
  attempt_valid boolean
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into hive_private.group_invite_attempts (user_id, invite_code, valid)
  values (target_user_id, left(coalesce(normalized_code, ''), 6), attempt_valid);
$$;

create or replace function hive_private.validate_group_invite(raw_invite_code text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_code text := hive_private.normalize_invite_code(raw_invite_code);
  invite_exists boolean;
begin
  perform hive_private.check_group_invite_attempt_limit(current_user_id);

  select exists (
    select 1
    from public.group_invites gi
    join public.housing_groups hg on hg.id = gi.group_id
    where gi.invite_code = normalized_code
      and length(normalized_code) = 6
      and gi.active
      and (gi.expires_at is null or gi.expires_at > now())
      and hg.is_active
  )
  into invite_exists;

  perform hive_private.record_group_invite_attempt(current_user_id, normalized_code, invite_exists);
  return invite_exists;
end;
$$;

create or replace function hive_private.join_housing_group(
  invite_code text,
  profile_username text,
  profile_campus_slug text default 'ucla'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_code text := hive_private.normalize_invite_code(invite_code);
  profile_row public.app_profiles%rowtype;
  invite_row public.group_invites%rowtype;
begin
  perform hive_private.check_group_invite_attempt_limit(current_user_id);
  profile_row := hive_private.upsert_profile(profile_username, profile_campus_slug);

  select gi.* into invite_row
  from public.group_invites gi
    join public.housing_groups hg on hg.id = gi.group_id
  where gi.invite_code = normalized_code
    and length(normalized_code) = 6
    and gi.active
    and (gi.expires_at is null or gi.expires_at > now())
    and hg.is_active
  limit 1;

  if invite_row.id is null then
    perform hive_private.record_group_invite_attempt(current_user_id, normalized_code, false);
    raise exception 'Invalid group code' using errcode = '22023';
  end if;

  perform hive_private.record_group_invite_attempt(current_user_id, normalized_code, true);

  update public.group_members
  set status = 'left',
      left_at = now(),
      updated_at = now()
  where user_id = profile_row.id
    and status = 'active'
    and group_id <> invite_row.group_id;

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

revoke all on table hive_private.group_invite_attempts from public;
revoke all on function hive_private.check_group_invite_attempt_limit(uuid) from public;
revoke all on function hive_private.record_group_invite_attempt(uuid, text, boolean) from public;
revoke all on function hive_private.validate_group_invite(text) from public;
revoke all on function hive_private.join_housing_group(text, text, text) from public;

grant execute on function hive_private.validate_group_invite(text) to authenticated;
grant execute on function hive_private.join_housing_group(text, text, text) to authenticated;

drop policy if exists "Public can read active listing search index" on public.listing_search_index;
create policy "Public can read active listing search index"
on public.listing_search_index for select
using (
  active
  and exists (
    select 1
    from public.properties p
    where p.id = listing_search_index.property_id
      and p.is_active
      and p.is_quality_approved
  )
);

create or replace function hive_private.enforce_lead_request_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.submitted_by is null then
    raise exception 'Authenticated user required' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.submitted_by::text || ':lead_requests', 0));

  if (
    select count(*)
    from public.lead_requests lr
    where lr.submitted_by = new.submitted_by
      and lr.created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Too many requests. Please try again later.' using errcode = '22023';
  end if;

  if (
    select count(*)
    from public.lead_requests lr
    where lr.submitted_by = new.submitted_by
      and lr.created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'Too many requests. Please try again later.' using errcode = '22023';
  end if;

  return new;
end;
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

  perform pg_advisory_xact_lock(hashtextextended(profile_row.id::text || ':create_group', 0));

  if (
    select count(*)
    from public.housing_groups hg
    where hg.owner_id = profile_row.id
      and hg.created_at > now() - interval '1 hour'
  ) >= 3 then
    raise exception 'Too many groups created. Please try again later.' using errcode = '22023';
  end if;

  if (
    select count(*)
    from public.housing_groups hg
    where hg.owner_id = profile_row.id
      and hg.created_at > now() - interval '1 day'
  ) >= 10 then
    raise exception 'Too many groups created. Please try again later.' using errcode = '22023';
  end if;

  select * into campus_row
  from public.campuses c
  where c.slug = profile_row.campus_slug
  limit 1;

  if campus_row.id is null then
    raise exception 'Campus not found' using errcode = '22023';
  end if;

  update public.group_members
  set status = 'left',
      left_at = now(),
      updated_at = now()
  where user_id = profile_row.id
    and status = 'active';

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
