-- ─────────────────────────────────────────────────────────────────────
-- RLS for companies: same shape as the other display tables — public
-- read, editor-only writes.
-- ─────────────────────────────────────────────────────────────────────

alter table public.companies enable row level security;--> statement-breakpoint

create policy "companies_public_read" on public.companies
  for select to anon, authenticated using (true);--> statement-breakpoint

create policy "companies_editor_write" on public.companies
  for all to authenticated using (public.is_editor()) with check (public.is_editor());
