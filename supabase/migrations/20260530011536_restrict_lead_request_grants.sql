revoke all on public.lead_requests from anon;
revoke all on public.lead_requests from authenticated;
grant insert on public.lead_requests to authenticated;
