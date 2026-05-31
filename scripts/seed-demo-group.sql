-- Hive — demo group seed for testing / UI mockups
-- ----------------------------------------------------------------------------
-- Creates one sample housing group at UCLA, fills it with 5 fake roommates and
-- a spread of group listing votes (unanimous front-runners + split decisions),
-- and opens a join code so you can join with your own account.
--
-- Join code:  WESTWD   (enter on the Groups tab)
--
-- Safe to re-run: every insert is idempotent on a fixed UUID / natural key.
-- To remove everything this created, run scripts/unseed-demo-group.sql.
-- ----------------------------------------------------------------------------

begin;

-- Fixed identifiers so re-running upserts the same rows -----------------------
-- Fake roommates
--   maya   = a1111111-1111-4111-8111-111111111111  (owner)
--   diego  = a2222222-2222-4222-8222-222222222222
--   priya  = a3333333-3333-4333-8333-333333333333
--   jordan = a4444444-4444-4444-8444-444444444444
--   sofia  = a5555555-5555-4555-8555-555555555555
-- Group / invite
--   group  = 9b000000-0000-4000-8000-000000000001
--   invite = 9b000000-0000-4000-8000-000000000002

-- 1. Fake auth users (FK target for app_profiles) ----------------------------
insert into auth.users (instance_id, id, aud, role, is_anonymous, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', true, now() - interval '21 days', now()),
  ('00000000-0000-0000-0000-000000000000', 'a2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', true, now() - interval '20 days', now()),
  ('00000000-0000-0000-0000-000000000000', 'a3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', true, now() - interval '19 days', now()),
  ('00000000-0000-0000-0000-000000000000', 'a4444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', true, now() - interval '18 days', now()),
  ('00000000-0000-0000-0000-000000000000', 'a5555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', true, now() - interval '17 days', now())
on conflict (id) do nothing;

-- 2. App profiles (active_group_id set in step 7, after the group exists) -----
insert into public.app_profiles (id, username, campus_slug, created_at)
values
  ('a1111111-1111-4111-8111-111111111111', 'Maya',   'ucla', now() - interval '21 days'),
  ('a2222222-2222-4222-8222-222222222222', 'Diego',  'ucla', now() - interval '20 days'),
  ('a3333333-3333-4333-8333-333333333333', 'Priya',  'ucla', now() - interval '19 days'),
  ('a4444444-4444-4444-8444-444444444444', 'Jordan', 'ucla', now() - interval '18 days'),
  ('a5555555-5555-4555-8555-555555555555', 'Sofia',  'ucla', now() - interval '17 days')
on conflict (id) do update
  set username = excluded.username,
      campus_slug = excluded.campus_slug;

-- 3. The housing group (owned by Maya, at UCLA) ------------------------------
insert into public.housing_groups (id, campus_id, name, owner_id, is_active, created_at)
values (
  '9b000000-0000-4000-8000-000000000001',
  'b9f7f338-a317-4937-a995-378e3522ef7a',  -- UCLA
  'Westwood Crew',
  'a1111111-1111-4111-8111-111111111111',  -- Maya
  true,
  now() - interval '21 days'
)
on conflict (id) do update
  set name = excluded.name,
      campus_id = excluded.campus_id,
      owner_id = excluded.owner_id,
      is_active = true;

-- 4. Members (1 owner + 4 members, all active) -------------------------------
insert into public.group_members (group_id, user_id, role, status, display_name, joined_at)
values
  ('9b000000-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111', 'owner',  'active', 'Maya',   now() - interval '21 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a2222222-2222-4222-8222-222222222222', 'member', 'active', 'Diego',  now() - interval '20 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a3333333-3333-4333-8333-333333333333', 'member', 'active', 'Priya',  now() - interval '19 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a4444444-4444-4444-8444-444444444444', 'member', 'active', 'Jordan', now() - interval '18 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a5555555-5555-4555-8555-555555555555', 'member', 'active', 'Sofia',  now() - interval '17 days')
on conflict (group_id, user_id) do update
  set role = excluded.role,
      status = 'active',
      display_name = excluded.display_name,
      left_at = null;

-- 5. Join code: DEMO ----------------------------------------------------------
insert into public.group_invites (id, group_id, invite_code, created_by, active, created_at)
values (
  '9b000000-0000-4000-8000-000000000002',
  '9b000000-0000-4000-8000-000000000001',
  'WESTWD',
  'a1111111-1111-4111-8111-111111111111',
  true,
  now() - interval '21 days'
)
on conflict (id) do update
  set invite_code = 'WESTWD',
      active = true,
      expires_at = null;

-- 6. Group listing votes — real UCLA properties ------------------------------
-- Decision matrix across the 5 roommates (L = liked, P = passed):
--   433 Midvale     Maya L  Diego L  Priya L  Jordan L  Sofia L   (unanimous)
--   The Plaza       Maya L  Diego L  Priya L  Jordan L  Sofia L   (unanimous)
--   Comma Barrington Maya L Diego L  Priya L  Jordan L  Sofia P   (4 like / 1 pass)
--   Rochester       Maya L  Diego L  Priya L  Jordan P  Sofia L   (4 like / 1 pass)
--   747 Gayley      Maya L  Diego P  Priya L  Jordan P  Sofia L   (3 like / 2 pass)
--   Midvale Luxury  Maya L  Diego L  Priya P  Jordan L  Sofia P   (3 like / 2 pass)
--
-- Unanimous listings surface as "almost matched — waiting on you"; like them
-- after joining and they flip to a full match. The split listings show the
-- disagreement UI.
insert into public.group_listing_votes (group_id, user_id, property_id, decision, score, decided_at)
values
  -- 433 Midvale (unanimous)
  ('9b000000-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111', 'f0fcfb7d-fd51-43c7-b9e7-e9ff0173fbad', 'liked', 95, now() - interval '6 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a2222222-2222-4222-8222-222222222222', 'f0fcfb7d-fd51-43c7-b9e7-e9ff0173fbad', 'liked', 90, now() - interval '6 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a3333333-3333-4333-8333-333333333333', 'f0fcfb7d-fd51-43c7-b9e7-e9ff0173fbad', 'liked', 92, now() - interval '5 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a4444444-4444-4444-8444-444444444444', 'f0fcfb7d-fd51-43c7-b9e7-e9ff0173fbad', 'liked', 88, now() - interval '5 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a5555555-5555-4555-8555-555555555555', 'f0fcfb7d-fd51-43c7-b9e7-e9ff0173fbad', 'liked', 91, now() - interval '4 days'),
  -- The Plaza (unanimous)
  ('9b000000-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111', 'cfb679fe-f673-420d-9cf4-1823a44bdbfd', 'liked', 89, now() - interval '7 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a2222222-2222-4222-8222-222222222222', 'cfb679fe-f673-420d-9cf4-1823a44bdbfd', 'liked', 84, now() - interval '7 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a3333333-3333-4333-8333-333333333333', 'cfb679fe-f673-420d-9cf4-1823a44bdbfd', 'liked', 87, now() - interval '6 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a4444444-4444-4444-8444-444444444444', 'cfb679fe-f673-420d-9cf4-1823a44bdbfd', 'liked', 80, now() - interval '6 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a5555555-5555-4555-8555-555555555555', 'cfb679fe-f673-420d-9cf4-1823a44bdbfd', 'liked', 86, now() - interval '5 days'),
  -- Comma Barrington (4 like / 1 pass)
  ('9b000000-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111', 'f4e54fc0-d8d2-42cf-9dee-2ff8387c29d5', 'liked', 78, now() - interval '4 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a2222222-2222-4222-8222-222222222222', 'f4e54fc0-d8d2-42cf-9dee-2ff8387c29d5', 'liked', 75, now() - interval '4 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a3333333-3333-4333-8333-333333333333', 'f4e54fc0-d8d2-42cf-9dee-2ff8387c29d5', 'liked', 81, now() - interval '3 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a4444444-4444-4444-8444-444444444444', 'f4e54fc0-d8d2-42cf-9dee-2ff8387c29d5', 'liked', 70, now() - interval '3 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a5555555-5555-4555-8555-555555555555', 'f4e54fc0-d8d2-42cf-9dee-2ff8387c29d5', 'passed', null, now() - interval '3 days'),
  -- Rochester Luxury (4 like / 1 pass)
  ('9b000000-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111', 'f9f31eda-5e99-44cd-8bce-50d67eb0735c', 'liked', 72, now() - interval '5 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a2222222-2222-4222-8222-222222222222', 'f9f31eda-5e99-44cd-8bce-50d67eb0735c', 'liked', 68, now() - interval '5 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a3333333-3333-4333-8333-333333333333', 'f9f31eda-5e99-44cd-8bce-50d67eb0735c', 'liked', 74, now() - interval '4 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a4444444-4444-4444-8444-444444444444', 'f9f31eda-5e99-44cd-8bce-50d67eb0735c', 'passed', null, now() - interval '4 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a5555555-5555-4555-8555-555555555555', 'f9f31eda-5e99-44cd-8bce-50d67eb0735c', 'liked', 69, now() - interval '4 days'),
  -- 747 Gayley (3 like / 2 pass)
  ('9b000000-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111', '549b3bec-0dce-4e62-a081-a541ee90ab69', 'liked', 65, now() - interval '2 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a2222222-2222-4222-8222-222222222222', '549b3bec-0dce-4e62-a081-a541ee90ab69', 'passed', null, now() - interval '2 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a3333333-3333-4333-8333-333333333333', '549b3bec-0dce-4e62-a081-a541ee90ab69', 'liked', 67, now() - interval '2 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a4444444-4444-4444-8444-444444444444', '549b3bec-0dce-4e62-a081-a541ee90ab69', 'passed', null, now() - interval '1 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a5555555-5555-4555-8555-555555555555', '549b3bec-0dce-4e62-a081-a541ee90ab69', 'liked', 63, now() - interval '1 days'),
  -- Midvale Luxury (3 like / 2 pass)
  ('9b000000-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111', '53e757a1-f507-44d0-a5c9-d046462588a9', 'liked', 60, now() - interval '3 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a2222222-2222-4222-8222-222222222222', '53e757a1-f507-44d0-a5c9-d046462588a9', 'liked', 62, now() - interval '3 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a3333333-3333-4333-8333-333333333333', '53e757a1-f507-44d0-a5c9-d046462588a9', 'passed', null, now() - interval '2 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a4444444-4444-4444-8444-444444444444', '53e757a1-f507-44d0-a5c9-d046462588a9', 'liked', 58, now() - interval '2 days'),
  ('9b000000-0000-4000-8000-000000000001', 'a5555555-5555-4555-8555-555555555555', '53e757a1-f507-44d0-a5c9-d046462588a9', 'passed', null, now() - interval '2 days')
on conflict (group_id, user_id, property_id) do update
  set decision = excluded.decision,
      score = excluded.score,
      decided_at = excluded.decided_at;

-- 7. Point each roommate's profile at the group (FK now satisfiable) ----------
update public.app_profiles
set active_group_id = '9b000000-0000-4000-8000-000000000001'
where id in (
  'a1111111-1111-4111-8111-111111111111',
  'a2222222-2222-4222-8222-222222222222',
  'a3333333-3333-4333-8333-333333333333',
  'a4444444-4444-4444-8444-444444444444',
  'a5555555-5555-4555-8555-555555555555'
);

commit;

-- Summary --------------------------------------------------------------------
select hg.name as group_name,
       gi.invite_code as join_code,
       (select count(*) from public.group_members gm where gm.group_id = hg.id and gm.status = 'active') as members,
       (select count(distinct glv.property_id) from public.group_listing_votes glv where glv.group_id = hg.id) as listings_voted
from public.housing_groups hg
join public.group_invites gi on gi.group_id = hg.id
where hg.id = '9b000000-0000-4000-8000-000000000001';
