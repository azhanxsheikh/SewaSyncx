-- =============================================================================
-- Migration: 20260913000010_technician_location_update_policy.sql
-- Description: Enables authenticated technicians to update their own row in
--              public.technician_locations for direct telemetry streaming.
-- =============================================================================

-- 1. Policy for updating own technician location
drop policy if exists technician_locations_update_self on public.technician_locations;
create policy technician_locations_update_self
  on public.technician_locations for update to authenticated
  using (technician_id = (select auth.uid()))
  with check (technician_id = (select auth.uid()));

-- 2. Grant update privilege to authenticated role
grant update on public.technician_locations to authenticated;
