-- =============================================================================
-- SewaSync — local demo seed: Greater Noida client ↔ technician loop
--
-- Applied by `supabase db reset` after all migrations. Local development only.
--
-- Logins (email + password):                                     password
--   Client      Abdullah Sheikh  abdullah@sewasync.in     +919876543210   Password@123
--   Technician  Amit Singh       amit.singh@sewasync.in   +919811223344   Password@123
--   Technician  Rahul Kumar      rahul.kumar@sewasync.in  +919822334455   Password@123
--   Technician  Vikram Sharma    vikram.sharma@sewasync.in +919876543213  Password@123
--
-- Vikram isn't a named persona in the current spec, but is kept (same domain
-- and password as everyone else) — he's the idle technician the security
-- test harness and the demo script's RLS check both rely on.
--
-- Admin           (super_admin)    admin@sewasync.in                        AdminPassword@123
--
-- Scenarios (all for Abdullah, Flat 402, Tower B, Gaur City 2):
--   A  pending   Plumbing SOS "Washroom pipe burst", high priority → Amit is the match
--   B  en_route  AC Repair, assigned to Rahul Kumar — "Request #2" in the task spec
--   C  completed Plumbing, Amit Singh, yesterday: photos, ₹648 settlement, 5★ review
--
-- Coordinates are approximate locality centroids.
-- =============================================================================

-- Demo database: pause the dispatch sweep so Scenario A stays pending instead
-- of expanding and turning unfulfilled ~10 minutes after reset. Resume with:
--   select cron.alter_job(jobid, active := true) from cron.job where jobname = 'dispatch-radius-sweep';
select cron.alter_job(jobid, active := false) from cron.job where jobname = 'dispatch-radius-sweep';


-- -----------------------------------------------------------------------------
-- Service catalogue (mirrors src/mocks/fixtures.ts)
-- -----------------------------------------------------------------------------

insert into public.service_categories (slug, name, icon, description, sos_base_price, sos_emergency_fee, default_duration_minutes, liability_tier) values
  ('electrical', 'Electrical', '⚡',  'Power failure, wiring, short circuit', 499, 149, 45, 'tier_2'),
  ('plumbing',   'Plumbing',   '💧', 'Leakage, blocked drains, burst pipes', 449, 149, 45, 'tier_1'),
  ('ac',         'AC Repair',  '❄️', 'No cooling, gas refill, service',      599, 199, 60, 'tier_2'),
  ('appliance',  'Appliance',  '🔧', 'Washing machine, fridge, microwave',   399,  99, 45, 'tier_1'),
  ('carpenter',  'Carpenter',  '🪚', 'Door, furniture, window repair',       399,  99, 60, 'tier_1');


-- -----------------------------------------------------------------------------
-- Accounts. Inserting into auth.users with a phone fires handle_new_auth_user,
-- which creates each public.users profile (as client) with a normalised phone.
-- -----------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  phone, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt('Password@123', extensions.gen_salt('bf')), now(),
       u.phone, now(), '{"provider": "email", "providers": ["email"]}'::jsonb,
       jsonb_build_object('name', u.name), now(), now(),
       '', '', '', '', '', '', '', ''
  from (values
    ('11111111-1111-4111-8111-111111111111'::uuid, 'abdullah@sewasync.in',      '919876543210', 'Abdullah Sheikh'),
    ('22222222-2222-4222-8222-222222222201'::uuid, 'amit.singh@sewasync.in',    '919811223344', 'Amit Singh'),
    ('22222222-2222-4222-8222-222222222202'::uuid, 'rahul.kumar@sewasync.in',   '919822334455', 'Rahul Kumar'),
    ('22222222-2222-4222-8222-222222222203'::uuid, 'vikram.sharma@sewasync.in', '919876543213', 'Vikram Sharma')
  ) u(id, email, phone, name);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
       'email', now(), now(), now()
  from auth.users u
 where u.email like '%@sewasync.in';

update public.users
   set preferred_language     = 'hi-IN',
       default_location       = st_point(77.4267, 28.6083, 4326)::geography,
       default_street_address = 'Flat 402, Tower B, Gaur City 2',
       default_unit_floor     = '4th floor'
 where id = '11111111-1111-4111-8111-111111111111';

insert into public.saved_addresses (id, user_id, label, icon, address_line, area, location, is_default)
values ('5a5a5a5a-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Home', '🏠',
        'Flat 402, Tower B, Gaur City 2', 'Greater Noida West, UP 201009',
        st_point(77.4267, 28.6083, 4326)::geography, true);

-- Family SOS beneficiaries. 20260913000011_seed_family_members.sql inserts the
-- same rows but skips them on a fresh database (owner not created yet).
insert into public.family_members (id, owner_id, name, relation, phone, emoji, address_line, area, location)
values
  ('f1111111-1111-4111-8111-111111111101', '11111111-1111-4111-8111-111111111111', 'Papa', 'Father',
   '+919811045678', '👨', 'A-47, Sector 62, Noida', 'Noida, Uttar Pradesh', st_point(77.3649, 28.6280, 4326)::geography),
  ('f1111111-1111-4111-8111-111111111102', '11111111-1111-4111-8111-111111111111', 'Mummy', 'Mother',
   '+919811045679', '👩', 'A-47, Sector 62, Noida', 'Noida, Uttar Pradesh', st_point(77.3649, 28.6280, 4326)::geography),
  ('f1111111-1111-4111-8111-111111111103', '11111111-1111-4111-8111-111111111111', 'Dadi', 'Grandmother',
   '+919711023456', '👵', 'H.No. 12, Lal Kuan, Delhi', 'Old Delhi, Delhi', st_point(77.2285, 28.6496, 4326)::geography)
on conflict (id) do nothing;


-- -----------------------------------------------------------------------------
-- Admin (platform_staff, super_admin). No phone: staff signups skip that
-- branch of handle_new_auth_user entirely (20260913000007_platform_staff.sql).
-- -----------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333301', 'authenticated', 'authenticated',
  'admin@sewasync.in', extensions.crypt('AdminPassword@123', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object('name', 'SewaSync Admin', 'staff_role', 'super_admin'), now(), now(),
  '', '', '', '', '', '', '', ''
);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
       'email', now(), now(), now()
  from auth.users u
 where u.id = '33333333-3333-4333-8333-333333333301';


-- -----------------------------------------------------------------------------
-- Verified cooperative technicians
-- -----------------------------------------------------------------------------

update public.users
   set role = 'technician', preferred_language = 'hi-IN'
 where id in ('22222222-2222-4222-8222-222222222201', '22222222-2222-4222-8222-222222222202', '22222222-2222-4222-8222-222222222203');

insert into public.technician_profiles
  (id, vehicle_type, vehicle_registration, experience_years, identity_verified, skill_verified, background_checked, rating, review_count, total_jobs, is_online)
values
  ('22222222-2222-4222-8222-222222222201', 'Motorcycle', 'UP16 BK 4821', 7.0, true, true, true, 4.8, 64, 212, true),
  ('22222222-2222-4222-8222-222222222202', 'Scooter',    'UP16 CT 1937', 5.5, true, true, true, 4.7, 41, 158, true),
  ('22222222-2222-4222-8222-222222222203', 'Motorcycle', 'UP16 AZ 7260', 9.0, true, true, true, 4.9, 88, 301, true);

insert into public.technician_categories (technician_id, category_id)
select t.id::uuid, c.id
  from (values
    -- Amit: Plumbing, Electrical (max 2 categories, per spec).
    ('22222222-2222-4222-8222-222222222201', 'plumbing'),
    ('22222222-2222-4222-8222-222222222201', 'electrical'),
    -- Rahul: Plumbing, AC Repair.
    ('22222222-2222-4222-8222-222222222202', 'plumbing'),
    ('22222222-2222-4222-8222-222222222202', 'ac'),
    ('22222222-2222-4222-8222-222222222203', 'electrical'),
    ('22222222-2222-4222-8222-222222222203', 'carpenter')
  ) t(id, slug)
  join public.service_categories c on c.slug = t.slug;

-- Current positions, fresh at seed time (the matching RPC requires < 90 s).
-- st_point(lng, lat, srid) — the spec states coordinates as (lat, lng).
insert into public.technician_locations (technician_id, location, heading, speed) values
  ('22222222-2222-4222-8222-222222222201', st_point(77.4320, 28.6105, 4326)::geography, null, null),  -- Near Gaur City 1, ~1.2 km from Abdullah
  ('22222222-2222-4222-8222-222222222202', st_point(77.4893, 28.4727, 4326)::geography, 340,  8.3),   -- Knowledge Park III
  ('22222222-2222-4222-8222-222222222203', st_point(77.5118, 28.4712, 4326)::geography, null, null);  -- Alpha 1 (unchanged)


-- -----------------------------------------------------------------------------
-- Scenario C — completed history (yesterday, 14:05 IST)
--
-- Walked through the real lifecycle RPCs as Amit, so the status timeline,
-- dispatch snapshot and job count are produced by the same code the app uses,
-- then backdated. Settlement is written directly rather than through
-- settle_job_payment() (20260913000004_settle_job_rpc.sql), since that
-- function timestamps and numbers the invoice at call time and this
-- scenario needs specific backdated values instead.
-- -----------------------------------------------------------------------------

do $$
declare
  c_client constant uuid := '11111111-1111-4111-8111-111111111111';
  c_amit   constant uuid := '22222222-2222-4222-8222-222222222201';
  c_req    constant uuid := 'cccccccc-0000-4000-8000-00000000000c';
  t0       constant timestamptz := date_trunc('day', now()) - interval '1 day' + interval '8 hours 35 minutes';
begin
  insert into public.requests
    (id, client_id, saved_address_id, category_id, priority, service_location, address_line, area,
     description, symptoms, estimated_total)
  values
    (c_req, c_client, '5a5a5a5a-0000-4000-8000-000000000001',
     (select id from public.service_categories where slug = 'plumbing'), 'medium',
     st_point(77.4267, 28.6083, 4326)::geography, 'Flat 402, Tower B, Gaur City 2', 'Greater Noida West, UP 201009',
     'Kitchen sink pipe leaking under the counter', array['Water leakage', 'Dripping joint'], 598);

  perform set_config('request.jwt.claims', json_build_object('sub', c_amit, 'role', 'authenticated')::text, true);
  perform public.accept_request(c_req, c_amit);
  perform public.advance_request_status(c_req, 'en_route');
  perform public.advance_request_status(c_req, 'arrived');
  perform public.advance_request_status(c_req, 'in_progress');

  -- ₹50 variance, approved by the client before completion.
  insert into public.request_cost_additions (request_id, reason, tags, amount, status, created_at, resolved_at)
  values (c_req, 'Corroded angle valve under the sink replaced with a brass valve', array['parts'], 50, 'approved',
          t0 + interval '48 minutes', t0 + interval '50 minutes');

  perform public.advance_request_status(c_req, 'completed');
  perform set_config('request.jwt.claims', '', true);

  update public.requests
     set final_price             = 648,
         price_adjustment_reason = 'additional_parts',
         price_adjustment_notes  = 'Angle valve was corroded and leaking; replaced (₹50 part, approved by client in app).'
   where id = c_req;

  -- Backdate. set_updated_at would otherwise stamp updated_at with seed time.
  alter table public.requests disable trigger set_updated_at;
  update public.requests
     set created_at   = t0,
         accepted_at  = t0 + interval '2 minutes',
         completed_at = t0 + interval '68 minutes',
         updated_at   = t0 + interval '70 minutes'
   where id = c_req;
  alter table public.requests enable trigger set_updated_at;

  update public.request_status_events
     set occurred_at = t0 + case status
                              when 'pending'     then interval '0 minutes'
                              when 'accepted'    then interval '2 minutes'
                              when 'en_route'    then interval '4 minutes'
                              when 'arrived'     then interval '31 minutes'
                              when 'in_progress' then interval '34 minutes'
                              when 'completed'   then interval '68 minutes'
                            end
   where request_id = c_req;

  -- ₹648 inclusive of 18% GST.
  insert into public.invoices (request_id, invoice_number, subtotal, tax, total, commission_rate_applied, issued_at)
  values (c_req, 'SWS-GN-2026-000184', 549.15, 98.85, 648.00, 12.00, t0 + interval '68 minutes');

  insert into public.payments (request_id, method, status, amount, upi_id, provider_reference, paid_at, created_at)
  values (c_req, 'upi', 'succeeded', 648.00, 'abdullah@okaxis', 'UPI/426013579842', t0 + interval '72 minutes', t0 + interval '70 minutes');

  insert into public.reviews (request_id, client_id, technician_id, rating, tags, review_text, tip_amount, created_at)
  values (c_req, c_client, c_amit, 5, array['On time', 'Clean work', 'Explained the fix'],
          'Amit reached in under 30 minutes, showed me the corroded valve and cleaned up afterwards. Very professional.',
          50, t0 + interval '80 minutes');

  insert into public.request_attachments
    (id, request_id, kind, phase, storage_path, file_name, exif_lat, exif_lng, captured_at, uploaded_by, created_at)
  values
    ('c0ffee00-0000-4000-8000-000000000001', c_req, 'image', 'pre_work',
     'cccccccc-0000-4000-8000-00000000000c/c0ffee00-0000-4000-8000-000000000001.png', 'sink-leak-before.png',
     28.6083, 77.4267, t0 - interval '2 minutes', c_client, t0),
    ('c0ffee00-0000-4000-8000-000000000002', c_req, 'image', 'post_work',
     'cccccccc-0000-4000-8000-00000000000c/c0ffee00-0000-4000-8000-000000000002.png', 'sink-fixed-after.png',
     28.6083, 77.4267, t0 + interval '66 minutes', c_amit, t0 + interval '67 minutes');
end;
$$;


-- -----------------------------------------------------------------------------
-- Scenario B — active in-transit job: AC Repair, Rahul Kumar en route
-- -----------------------------------------------------------------------------

do $$
declare
  c_client constant uuid := '11111111-1111-4111-8111-111111111111';
  c_rahul  constant uuid := '22222222-2222-4222-8222-222222222202';
  c_req    constant uuid := 'bbbbbbbb-0000-4000-8000-00000000000b';
begin
  insert into public.requests
    (id, client_id, saved_address_id, category_id, priority, service_location, address_line, area,
     description, symptoms, estimated_total)
  values
    (c_req, c_client, '5a5a5a5a-0000-4000-8000-000000000001',
     (select id from public.service_categories where slug = 'ac'), 'medium',
     st_point(77.4267, 28.6083, 4326)::geography, 'Flat 402, Tower B, Gaur City 2', 'Greater Noida West, UP 201009',
     'Bedroom split AC blowing warm air', array['Not cooling', 'Warm air'], 798);

  perform set_config('request.jwt.claims', json_build_object('sub', c_rahul, 'role', 'authenticated')::text, true);
  perform public.accept_request(c_req, c_rahul);
  perform public.advance_request_status(c_req, 'en_route');
  perform set_config('request.jwt.claims', '', true);

  alter table public.requests disable trigger set_updated_at;
  update public.requests
     set created_at  = now() - interval '25 minutes',
         accepted_at = now() - interval '22 minutes',
         updated_at  = now() - interval '18 minutes'
   where id = c_req;
  alter table public.requests enable trigger set_updated_at;

  update public.request_status_events
     set occurred_at = now() - case status
                                 when 'pending'  then interval '25 minutes'
                                 when 'accepted' then interval '22 minutes'
                                 when 'en_route' then interval '18 minutes'
                               end
   where request_id = c_req;
end;
$$;


-- -----------------------------------------------------------------------------
-- Scenario A — ready for live dispatch: Plumbing SOS, pending
-- -----------------------------------------------------------------------------

insert into public.requests
  (id, client_id, saved_address_id, category_id, priority, service_location, address_line, area,
   description, symptoms, estimated_total)
values
  ('aaaaaaaa-0000-4000-8000-00000000000a', '11111111-1111-4111-8111-111111111111', '5a5a5a5a-0000-4000-8000-000000000001',
   (select id from public.service_categories where slug = 'plumbing'), 'high',
   st_point(77.4267, 28.6083, 4326)::geography, 'Flat 402, Tower B, Gaur City 2', 'Greater Noida West, UP 201009',
   'Washroom pipe burst', array['Pipe burst', 'Water on floor'], 598);
