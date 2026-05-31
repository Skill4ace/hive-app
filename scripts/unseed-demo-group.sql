-- Hive — remove the demo group seeded by scripts/seed-demo-group.sql
-- Deleting the auth.users rows cascades to profiles, members, votes, invites.
begin;

delete from auth.users
where id in (
  'a1111111-1111-4111-8111-111111111111',
  'a2222222-2222-4222-8222-222222222222',
  'a3333333-3333-4333-8333-333333333333',
  'a4444444-4444-4444-8444-444444444444',
  'a5555555-5555-4555-8555-555555555555'
);

-- Owner cascade removes the group, but drop it explicitly in case you joined
-- and left your own account as a lingering member.
delete from public.housing_groups
where id = '9b000000-0000-4000-8000-000000000001';

commit;
