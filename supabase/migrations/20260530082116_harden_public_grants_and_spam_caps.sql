-- Keep SQL grants aligned with the RLS policy surface. RLS was already
-- denying public writes to catalog tables, but the role grants were broader
-- than the app needs.
revoke all on table
  public.data_sources,
  public.campuses,
  public.properties,
  public.property_units,
  public.listing_photos,
  public.property_promotions,
  public.property_reviews,
  public.property_faqs,
  public.points_of_interest,
  public.property_poi_metrics,
  public.listing_campus_metrics,
  public.listing_search_index
from anon, authenticated;

grant select on table
  public.data_sources,
  public.campuses,
  public.properties,
  public.property_units,
  public.listing_photos,
  public.property_promotions,
  public.property_reviews,
  public.property_faqs,
  public.points_of_interest,
  public.property_poi_metrics,
  public.listing_campus_metrics,
  public.listing_search_index
to anon, authenticated;

revoke all on table
  public.ingestion_runs,
  public.source_listing_records
from anon, authenticated;

revoke execute on function public.create_housing_group(text, text) from public, anon;
revoke execute on function public.join_housing_group(text, text, text) from public, anon;
revoke execute on function public.get_my_group() from public, anon;
revoke execute on function public.leave_active_group() from public, anon;
revoke execute on function public.remove_group_member(uuid) from public, anon;
revoke execute on function public.rename_active_group(text) from public, anon;
revoke execute on function public.validate_group_invite(text) from public, anon;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

grant execute on function public.create_housing_group(text, text) to authenticated;
grant execute on function public.join_housing_group(text, text, text) to authenticated;
grant execute on function public.get_my_group() to authenticated;
grant execute on function public.leave_active_group() to authenticated;
grant execute on function public.remove_group_member(uuid) to authenticated;
grant execute on function public.rename_active_group(text) to authenticated;
grant execute on function public.validate_group_invite(text) to authenticated;

create or replace function hive_private.enforce_lead_request_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

drop trigger if exists enforce_lead_request_rate_limit on public.lead_requests;
create trigger enforce_lead_request_rate_limit
before insert on public.lead_requests
for each row execute function hive_private.enforce_lead_request_rate_limit();

revoke all on function hive_private.enforce_lead_request_rate_limit() from public;

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
