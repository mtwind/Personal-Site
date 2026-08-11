-- ─────────────────────────────────────────────────────────────────────
-- RLS for knowledge_notes.
--
-- Same shape as team_match_page: NO anon policy at all. These rows are
-- private background about the owner — interview notes, reference
-- letters, anything he'd tell a recruiter but not publish — so they
-- must not be readable through the anon REST API, published ones
-- included. Every read the site performs is server-side over the direct
-- connection, which bypasses RLS; editors manage them in admin through
-- an authenticated client.
-- ─────────────────────────────────────────────────────────────────────

alter table public.knowledge_notes enable row level security;--> statement-breakpoint

create policy "knowledge_notes_editor_all" on public.knowledge_notes
  for all to authenticated using (public.is_editor()) with check (public.is_editor());
