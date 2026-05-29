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
