-- =============================================================================
-- SewaSync — Platform Staff RLS Policies (DATABASE.md §12 Alignment)
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_policy where polrelid = 'public.disputes'::regclass and polname = 'disputes_update_staff') then
    create policy "disputes_update_staff" on public.disputes
      for update to authenticated
      using (private.is_platform_staff())
      with check (private.is_platform_staff());
  end if;

  if not exists (select 1 from pg_policy where polrelid = 'public.technician_profiles'::regclass and polname = 'technician_profiles_select_staff') then
    create policy "technician_profiles_select_staff" on public.technician_profiles
      for select to authenticated
      using (private.is_platform_staff());
  end if;

  if not exists (select 1 from pg_policy where polrelid = 'public.technician_profiles'::regclass and polname = 'technician_profiles_update_staff') then
    create policy "technician_profiles_update_staff" on public.technician_profiles
      for update to authenticated
      using (private.is_platform_staff())
      with check (private.is_platform_staff());
  end if;

  if not exists (select 1 from pg_policy where polrelid = 'public.request_status_events'::regclass and polname = 'request_status_events_select_staff') then
    create policy "request_status_events_select_staff" on public.request_status_events
      for select to authenticated
      using (private.is_platform_staff());
  end if;

  if not exists (select 1 from pg_policy where polrelid = 'public.request_attachments'::regclass and polname = 'request_attachments_select_staff') then
    create policy "request_attachments_select_staff" on public.request_attachments
      for select to authenticated
      using (private.is_platform_staff());
  end if;

  if not exists (select 1 from pg_policy where polrelid = 'public.notifications'::regclass and polname = 'notifications_insert_staff') then
    create policy "notifications_insert_staff" on public.notifications
      for insert to authenticated
      with check (private.is_platform_staff());
  end if;
end $$;
