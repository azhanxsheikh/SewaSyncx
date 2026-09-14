-- -----------------------------------------------------------------------------
-- Migration: 20260914000003_technician_post_work_attachments.sql
-- Enables technician post-work attachment uploads to storage and public.request_attachments
-- as specified in docs/DATABASE.md §12 RLS Matrix and §13 Storage Buckets.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('request-attachments', 'request-attachments', false, 52428800, array['image/*', 'video/*'])
on conflict (id) do nothing;

drop policy if exists sos_media_insert_tech_request on storage.objects;
create policy sos_media_insert_tech_request
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('sos-media', 'request-attachments')
    and exists (
      select 1 from public.requests r
       where r.id::text = (storage.foldername(name))[1]
         and r.technician_id = (select auth.uid())
    )
  );

drop policy if exists sos_media_select_request_attachments on storage.objects;
create policy sos_media_select_request_attachments
  on storage.objects for select to authenticated
  using (
    bucket_id in ('sos-media', 'request-attachments')
    and exists (
      select 1 from public.requests r
       where r.id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists request_attachments_insert_tech_post_work on public.request_attachments;
create policy request_attachments_insert_tech_post_work
  on public.request_attachments for insert to authenticated
  with check (
    phase = 'post_work'
    and uploaded_by = (select auth.uid())
    and exists (
      select 1 from public.requests r
       where r.id = request_attachments.request_id
         and r.technician_id = (select auth.uid())
    )
  );
