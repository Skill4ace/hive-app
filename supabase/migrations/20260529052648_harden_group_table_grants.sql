revoke all on table public.app_profiles from public, anon, authenticated;
revoke all on table public.housing_groups from public, anon, authenticated;
revoke all on table public.group_invites from public, anon, authenticated;
revoke all on table public.group_members from public, anon, authenticated;
revoke all on table public.user_listing_decisions from public, anon, authenticated;
revoke all on table public.group_listing_votes from public, anon, authenticated;

grant select, insert, update on table public.app_profiles to authenticated;
grant select on table public.housing_groups to authenticated;
grant select on table public.group_members to authenticated;
grant select, insert, update, delete on table public.user_listing_decisions to authenticated;
grant select, insert, update, delete on table public.group_listing_votes to authenticated;
