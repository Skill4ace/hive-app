drop function if exists public.validate_group_invite(text);
drop function if exists hive_private.validate_group_invite(text);

create or replace function hive_private.validate_group_invite(raw_invite_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_invites gi
    join public.housing_groups hg on hg.id = gi.group_id
    where gi.invite_code = hive_private.normalize_invite_code(raw_invite_code)
      and length(hive_private.normalize_invite_code(raw_invite_code)) = 4
      and gi.active
      and (gi.expires_at is null or gi.expires_at > now())
      and hg.is_active
  );
$$;

create or replace function public.validate_group_invite(raw_invite_code text)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select hive_private.validate_group_invite(raw_invite_code);
$$;

revoke all on function hive_private.validate_group_invite(text) from public;
revoke all on function public.validate_group_invite(text) from public;

grant execute on function hive_private.validate_group_invite(text) to authenticated;
grant execute on function public.validate_group_invite(text) to authenticated;
