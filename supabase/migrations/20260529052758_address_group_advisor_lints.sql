create index if not exists group_invites_created_by_idx
  on public.group_invites (created_by);

create index if not exists group_listing_votes_user_id_idx
  on public.group_listing_votes (user_id);

create index if not exists user_listing_decisions_property_id_idx
  on public.user_listing_decisions (property_id);

drop policy if exists "No direct group invite access" on public.group_invites;
create policy "No direct group invite access"
on public.group_invites for all
to public
using (false)
with check (false);
