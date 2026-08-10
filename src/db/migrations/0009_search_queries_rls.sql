-- ─────────────────────────────────────────────────────────────────────
-- RLS for search_queries.
--
-- Same shape as team_match_page and feedback_submissions: NO anon policy
-- at all. Rows hold visitor questions plus the answers given about the
-- owner, so they must not be readable through the anon REST API. Writes
-- happen in the ask route over the direct connection, which bypasses
-- RLS; editors read them in admin through an authenticated client.
-- ─────────────────────────────────────────────────────────────────────

alter table public.search_queries enable row level security;--> statement-breakpoint

create policy "search_queries_editor_all" on public.search_queries
  for all to authenticated using (public.is_editor()) with check (public.is_editor());
