-- =============================================================================
-- SewaSync — platform_staff read policies for users and invoices
-- Design authority: docs/DATABASE.md §12 (RLS Matrix: users, invoices SELECT: all for staff)
-- =============================================================================

drop policy if exists users_select_staff on public.users;
create policy users_select_staff
  on public.users for select to authenticated
  using (private.is_platform_staff());

drop policy if exists invoices_select_staff on public.invoices;
create policy invoices_select_staff
  on public.invoices for select to authenticated
  using (private.is_platform_staff());
