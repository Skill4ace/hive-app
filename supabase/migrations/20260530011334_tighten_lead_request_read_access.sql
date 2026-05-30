revoke select on public.lead_requests from authenticated;
grant insert on public.lead_requests to authenticated;

drop policy if exists "Users can read their own lead requests" on public.lead_requests;
drop policy if exists "Group members can read group lead requests" on public.lead_requests;
