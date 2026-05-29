create or replace function hive_private.remove_group_member(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_group_id uuid;
  actor_member_role public.housing_group_member_role;
  target_member_role public.housing_group_member_role;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required' using errcode = '28000';
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
    raise exception 'Only the owner can remove members' using errcode = '42501';
  end if;

  if target_user_id = current_user_id then
    raise exception 'Use leave group instead' using errcode = '22023';
  end if;

  select gm.role into target_member_role
  from public.group_members gm
  where gm.group_id = target_group_id
    and gm.user_id = target_user_id
    and gm.status = 'active';

  if target_member_role is null then
    raise exception 'Member not found' using errcode = '22023';
  end if;

  if target_member_role = 'owner'::public.housing_group_member_role then
    raise exception 'Owner cannot be removed' using errcode = '42501';
  end if;

  update public.group_members
  set status = 'left',
      left_at = now(),
      updated_at = now()
  where group_id = target_group_id
    and user_id = target_user_id
    and status = 'active';

  update public.app_profiles
  set active_group_id = null,
      updated_at = now()
  where id = target_user_id
    and active_group_id = target_group_id;

  return hive_private.build_my_group_payload(target_group_id);
end;
$$;

revoke all on function hive_private.remove_group_member(uuid) from public;
grant execute on function hive_private.remove_group_member(uuid) to authenticated;
