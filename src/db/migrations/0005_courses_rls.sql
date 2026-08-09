-- ─────────────────────────────────────────────────────────────────────
-- RLS for coursework: same shape as the other display tables — public
-- read, editor-only writes.
-- ─────────────────────────────────────────────────────────────────────

alter table public.courses enable row level security;--> statement-breakpoint

create policy "courses_public_read" on public.courses
  for select to anon, authenticated using (true);--> statement-breakpoint

create policy "courses_editor_write" on public.courses
  for all to authenticated using (public.is_editor()) with check (public.is_editor());
