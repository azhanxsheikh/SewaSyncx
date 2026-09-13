-- -----------------------------------------------------------------------------
-- Migration: 20260913000012_address_precision_and_technician_instructions.sql
-- Description: Adds structured door-level address fields, technician entry
--              instructions, and dual geocoding fields to saved_addresses
--              and requests. Adds client INSERT policy for requests.
-- -----------------------------------------------------------------------------

-- 1. Structured address fields on saved_addresses
alter table public.saved_addresses
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists landmark text,
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7);

-- Trigger function to keep legacy and structured address columns synced
create or replace function public.sync_saved_address_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Fill legacy address_line if not provided
  if new.address_line is null or new.address_line = '' then
    new.address_line := coalesce(nullif(trim(new.address_line1), ''), '') ||
      case
        when new.address_line2 is not null and trim(new.address_line2) <> ''
        then case when new.address_line1 is not null and trim(new.address_line1) <> '' then ', ' else '' end || trim(new.address_line2)
        else ''
      end;
  end if;

  -- Fallback if still empty
  if new.address_line is null or new.address_line = '' then
    new.address_line := 'Saved Address';
  end if;

  -- Fill legacy area if not provided
  if new.area is null or new.area = '' then
    new.area := coalesce(nullif(trim(new.city), ''), '') ||
      case
        when new.postal_code is not null and trim(new.postal_code) <> ''
        then case when new.city is not null and trim(new.city) <> '' then ' - ' else '' end || trim(new.postal_code)
        else ''
      end;
  end if;

  -- Fallback if still empty
  if new.area is null or new.area = '' then
    new.area := 'Delhi NCR';
  end if;

  -- Sync structured fields from legacy fields if structured fields were omitted
  if new.address_line1 is null and new.address_line is not null then
    new.address_line1 := new.address_line;
  end if;
  if new.city is null and new.area is not null then
    new.city := new.area;
  end if;

  -- Sync spatial location from latitude / longitude
  if new.location is null and new.latitude is not null and new.longitude is not null then
    new.location := extensions.st_setsrid(extensions.st_makepoint(new.longitude, new.latitude), 4326)::extensions.geography;
  elsif new.location is not null and (new.latitude is null or new.longitude is null) then
    new.latitude := extensions.st_y(new.location::extensions.geometry);
    new.longitude := extensions.st_x(new.location::extensions.geometry);
  end if;

  return new;
end;
$$;

drop trigger if exists sync_saved_address_fields on public.saved_addresses;
create trigger sync_saved_address_fields
  before insert or update on public.saved_addresses
  for each row execute function public.sync_saved_address_fields();


-- 2. Structured address and instructions on requests
alter table public.requests
  add column if not exists user_id uuid references public.users(id) on delete restrict,
  add column if not exists address_text text,
  add column if not exists address_notes text;

-- Trigger function to handle dual client_id / user_id and address_text / address_line
create or replace function public.sync_request_address_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Harmonise client_id and user_id
  if new.client_id is null and new.user_id is not null then
    new.client_id := new.user_id;
  elsif new.user_id is null and new.client_id is not null then
    new.user_id := new.client_id;
  end if;

  -- Harmonise address_line and address_text
  if new.address_line is null and new.address_text is not null then
    new.address_line := new.address_text;
  elsif new.address_text is null and new.address_line is not null then
    new.address_text := new.address_line;
  end if;

  if new.address_line is null or new.address_line = '' then
    new.address_line := 'Service Address';
  end if;

  if new.area is null then
    new.area := '';
  end if;

  if new.estimated_total is null then
    new.estimated_total := 499.00;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_request_address_fields on public.requests;
create trigger sync_request_address_fields
  before insert on public.requests
  for each row execute function public.sync_request_address_fields();


-- 3. RLS: Allow authenticated clients to insert their own requests
drop policy if exists requests_insert_client on public.requests;
create policy requests_insert_client
  on public.requests for insert to authenticated
  with check (
    client_id = (select auth.uid())
    or user_id = (select auth.uid())
  );
