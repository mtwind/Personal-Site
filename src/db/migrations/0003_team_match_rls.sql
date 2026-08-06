-- ─────────────────────────────────────────────────────────────────────
-- RLS for the hidden team-matching page + feedback submissions.
--
-- team_match_page: NO public read policy on purpose. The unguessable
-- slug is the access control, so the row (containing that slug and the
-- private content) must not be readable through the anon REST API.
-- The page itself is server-rendered over the direct connection, which
-- bypasses RLS.
--
-- feedback_submissions: visitors submit via a server action (direct
-- connection), so no anon policies are needed either. Editors may read
-- and manage submissions through the API.
-- ─────────────────────────────────────────────────────────────────────

alter table public.team_match_page enable row level security;--> statement-breakpoint
alter table public.feedback_submissions enable row level security;--> statement-breakpoint

create policy "team_match_page_editor_all" on public.team_match_page
  for all to authenticated using (public.is_editor()) with check (public.is_editor());--> statement-breakpoint

create policy "feedback_submissions_editor_all" on public.feedback_submissions
  for all to authenticated using (public.is_editor()) with check (public.is_editor());
