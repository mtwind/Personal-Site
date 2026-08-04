-- ─────────────────────────────────────────────────────────────────────
-- Row-Level Security: public read on display tables, writes restricted
-- to authenticated users whose email is in `editors`.
-- ─────────────────────────────────────────────────────────────────────

-- Helper: is the current authenticated user an editor?
-- SECURITY DEFINER so it can read `editors` even though that table is
-- not publicly readable.
create or replace function public.is_editor()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.editors e
    where e.email = coalesce(auth.jwt() ->> 'email', '')
  );
$$;
--> statement-breakpoint

-- Enable RLS on every table.
alter table public.editors enable row level security;--> statement-breakpoint
alter table public.about enable row level security;--> statement-breakpoint
alter table public.experiences enable row level security;--> statement-breakpoint
alter table public.projects enable row level security;--> statement-breakpoint
alter table public.skills enable row level security;--> statement-breakpoint
alter table public.experience_skills enable row level security;--> statement-breakpoint
alter table public.project_skills enable row level security;--> statement-breakpoint
alter table public.media enable row level security;--> statement-breakpoint
alter table public.contact enable row level security;--> statement-breakpoint

-- editors: only editors may see the allowlist; nobody may modify it via
-- the API (rows are inserted manually in the Supabase dashboard / SQL).
create policy "editors_select_self" on public.editors
  for select to authenticated using (public.is_editor());--> statement-breakpoint

-- Public-read display tables.
create policy "about_public_read" on public.about
  for select to anon, authenticated using (true);--> statement-breakpoint
create policy "experiences_public_read" on public.experiences
  for select to anon, authenticated using (true);--> statement-breakpoint
create policy "projects_public_read" on public.projects
  for select to anon, authenticated using (true);--> statement-breakpoint
create policy "skills_public_read" on public.skills
  for select to anon, authenticated using (true);--> statement-breakpoint
create policy "experience_skills_public_read" on public.experience_skills
  for select to anon, authenticated using (true);--> statement-breakpoint
create policy "project_skills_public_read" on public.project_skills
  for select to anon, authenticated using (true);--> statement-breakpoint
create policy "media_public_read" on public.media
  for select to anon, authenticated using (true);--> statement-breakpoint
create policy "contact_public_read" on public.contact
  for select to anon, authenticated using (true);--> statement-breakpoint

-- Editor-only writes (insert / update / delete) on display tables.
create policy "about_editor_write" on public.about
  for all to authenticated using (public.is_editor()) with check (public.is_editor());--> statement-breakpoint
create policy "experiences_editor_write" on public.experiences
  for all to authenticated using (public.is_editor()) with check (public.is_editor());--> statement-breakpoint
create policy "projects_editor_write" on public.projects
  for all to authenticated using (public.is_editor()) with check (public.is_editor());--> statement-breakpoint
create policy "skills_editor_write" on public.skills
  for all to authenticated using (public.is_editor()) with check (public.is_editor());--> statement-breakpoint
create policy "experience_skills_editor_write" on public.experience_skills
  for all to authenticated using (public.is_editor()) with check (public.is_editor());--> statement-breakpoint
create policy "project_skills_editor_write" on public.project_skills
  for all to authenticated using (public.is_editor()) with check (public.is_editor());--> statement-breakpoint
create policy "media_editor_write" on public.media
  for all to authenticated using (public.is_editor()) with check (public.is_editor());--> statement-breakpoint
create policy "contact_editor_write" on public.contact
  for all to authenticated using (public.is_editor()) with check (public.is_editor());
