-- =============================================================================
-- Migration: 20260913000011_seed_family_members.sql
-- Description: Seeds initial family members for client Abdullah Sheikh into
--              public.family_members with valid PostGIS coordinates.
-- =============================================================================

insert into public.family_members (
  id,
  owner_id,
  name,
  relation,
  phone,
  emoji,
  address_line,
  area,
  location
)
values
  (
    'f1111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111111',
    'Papa',
    'Father',
    '+919811045678',
    '👨',
    'A-47, Sector 62, Noida',
    'Noida, Uttar Pradesh',
    extensions.st_setsrid(extensions.st_makepoint(77.3649, 28.6280), 4326)::extensions.geography
  ),
  (
    'f1111111-1111-4111-8111-111111111102',
    '11111111-1111-4111-8111-111111111111',
    'Mummy',
    'Mother',
    '+919811045679',
    '👩',
    'A-47, Sector 62, Noida',
    'Noida, Uttar Pradesh',
    extensions.st_setsrid(extensions.st_makepoint(77.3649, 28.6280), 4326)::extensions.geography
  ),
  (
    'f1111111-1111-4111-8111-111111111103',
    '11111111-1111-4111-8111-111111111111',
    'Dadi',
    'Grandmother',
    '+919711023456',
    '👵',
    'H.No. 12, Lal Kuan, Delhi',
    'Old Delhi, Delhi',
    extensions.st_setsrid(extensions.st_makepoint(77.2285, 28.6496), 4326)::extensions.geography
  )
on conflict (id) do update
set
  name = excluded.name,
  relation = excluded.relation,
  phone = excluded.phone,
  emoji = excluded.emoji,
  address_line = excluded.address_line,
  area = excluded.area,
  location = excluded.location;
