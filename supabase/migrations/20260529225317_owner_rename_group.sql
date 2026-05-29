create or replace function hive_private.rename_active_group(new_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_group_id uuid;
  actor_member_role public.housing_group_member_role;
  normalized_name text := trim(regexp_replace(coalesce(new_name, ''), '\s+', ' ', 'g'));
begin
  if current_user_id is null then
    raise exception 'Authenticated user required' using errcode = '28000';
  end if;

  if char_length(normalized_name) < 2 or char_length(normalized_name) > 40 then
    raise exception 'Group name must be 2-40 characters' using errcode = '22023';
  end if;

  select ap.active_group_id into target_group_id
  from public.app_profiles ap
  where ap.id = current_user_id;

  if target_group_id is null then
    raise exception 'No active group' using errcode = '22023';
  end if;

  select gm.role into actor_member_role
  from public.group_members gm
  where gm.group_id = target_group_id
    and gm.user_id = current_user_id
    and gm.status = 'active';

  if actor_member_role is distinct from 'owner'::public.housing_group_member_role then
    raise exception 'Only the owner can rename this group' using errcode = '42501';
  end if;

  update public.housing_groups
  set name = normalized_name,
      updated_at = now()
  where id = target_group_id
    and is_active;

  if not found then
    raise exception 'Group not found' using errcode = '22023';
  end if;

  return hive_private.build_my_group_payload(target_group_id);
end;
$$;

create or replace function public.rename_active_group(new_name text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select hive_private.rename_active_group(new_name);
$$;

revoke all on function hive_private.rename_active_group(text) from public;
revoke all on function public.rename_active_group(text) from public;
grant execute on function hive_private.rename_active_group(text) to authenticated;
grant execute on function public.rename_active_group(text) to authenticated;
