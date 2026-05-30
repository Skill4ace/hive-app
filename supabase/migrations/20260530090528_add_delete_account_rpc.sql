-- Self-service account deletion.
--
-- The app authenticates users anonymously, so the only durable identity is the
-- auth.users row. Every user-owned table cascades from public.app_profiles,
-- which itself cascades from auth.users (on delete cascade). Deleting the
-- auth.users row therefore removes the profile, group memberships, listing
-- decisions, group votes, lead requests, invite attempts, and any group the
-- user owns. The publishable/anon client cannot delete from the auth schema, so
-- we expose a security-definer RPC that only ever deletes the caller's own row.

create or replace function hive_private.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authenticated user required' using errcode = '28000';
  end if;

  -- Cascades through public.app_profiles to every user-owned table.
  delete from auth.users where id = current_user_id;
end;
$$;

create or replace function public.delete_account()
returns void
language sql
security invoker
set search_path = ''
as $$
  select hive_private.delete_account();
$$;

revoke all on function hive_private.delete_account() from public;
revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
