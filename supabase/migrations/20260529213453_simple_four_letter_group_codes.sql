alter table public.group_invites
  drop constraint if exists group_invites_invite_code_check;

create or replace function hive_private.normalize_invite_code(raw_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(upper(regexp_replace(coalesce(raw_code, ''), '[^A-Za-z]', '', 'g')), 4);
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
    bytes := extensions.gen_random_bytes(4);
    candidate :=
      substr(alphabet, (get_byte(bytes, 0) % 26) + 1, 1) ||
      substr(alphabet, (get_byte(bytes, 1) % 26) + 1, 1) ||
      substr(alphabet, (get_byte(bytes, 2) % 26) + 1, 1) ||
      substr(alphabet, (get_byte(bytes, 3) % 26) + 1, 1);

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
  check (invite_code ~ '^[A-Z]{4}$');
