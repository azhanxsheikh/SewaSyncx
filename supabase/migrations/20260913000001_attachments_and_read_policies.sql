-- =============================================================================
-- SewaSync — request attachments, evidence bucket, participant read policies
--
-- Design authority: docs/DATABASE.md §5.4 (request_attachments), §12 (RLS
-- matrix), §13 (storage buckets).
--
-- Adds evidence media storage and the SELECT policies a participant needs to
-- read a job's history: timeline, cost additions, invoice, payment, review and
-- photos. Write paths (uploads, reviews, payments) remain deferred to their RPCs.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. request_attachments (DATABASE §5.4)
-- -----------------------------------------------------------------------------

create type public.attachment_kind as enum ('image', 'video');
create type public.attachment_phase as enum ('pre_work', 'post_work');

create table public.request_attachments (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.requests (id) on delete cascade,
  kind         public.attachment_kind not null,
  phase        public.attachment_phase not null,
  -- {request_id}/{uuid}.{ext}. The leading segment is the storage access key
  -- (§13), so it must name the owning request.
  storage_path text not null,
  file_name    text,
  exif_lat     double precision,
  exif_lng     double precision,
  captured_at  timestamptz,
  phash        bit(64),
  uploaded_by  uuid not null references public.users (id) on delete restrict,
  created_at   timestamptz not null default now(),
  constraint storage_path_under_request check (storage_path like request_id::text || '/%')
);

create index request_attachments_request_idx on public.request_attachments (request_id, phase);

alter table public.request_attachments enable row level security;


-- -----------------------------------------------------------------------------
-- 2. Participant read policies (DATABASE §12)
-- -----------------------------------------------------------------------------

-- Caller is the request's client or assigned technician. SECURITY DEFINER so
-- the check does not depend on which requests policies admit the row.
create function private.is_request_participant(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.requests r
     where r.id = p_request_id
       and (r.client_id = auth.uid() or r.technician_id = auth.uid())
  );
$$;

revoke execute on function private.is_request_participant(uuid) from public;
grant execute on function private.is_request_participant(uuid) to authenticated;

create policy request_status_events_select_participant
  on public.request_status_events for select to authenticated
  using (private.is_request_participant(request_id));

create policy request_cost_additions_select_participant
  on public.request_cost_additions for select to authenticated
  using (private.is_request_participant(request_id));

create policy invoices_select_participant
  on public.invoices for select to authenticated
  using (private.is_request_participant(request_id));

create policy payments_select_participant
  on public.payments for select to authenticated
  using (private.is_request_participant(request_id));

-- Reviews are public to signed-in users (§12: SELECT all).
create policy reviews_select_authenticated
  on public.reviews for select to authenticated
  using (true);

-- Evidence follows request visibility: participants, plus eligible technicians
-- inspecting a pending request before acceptance (NFR-SEC-005). The subquery
-- runs under the caller's requests policies, which is exactly that rule.
create policy request_attachments_select_visible_request
  on public.request_attachments for select to authenticated
  using (exists (select 1 from public.requests r where r.id = request_attachments.request_id));


-- -----------------------------------------------------------------------------
-- 3. Evidence bucket (DATABASE §13)
--
-- Storage RLS cannot join to the attachment row, so the path convention is the
-- access key: the first folder must be a request the caller can see.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sos-media', 'sos-media', false, 52428800, array['image/*', 'video/*'])
on conflict (id) do nothing;

create policy sos_media_select_visible_request
  on storage.objects for select to authenticated
  using (
    bucket_id = 'sos-media'
    and exists (
      select 1
        from public.requests r
       where r.id::text = (storage.foldername(name))[1]
    )
  );
