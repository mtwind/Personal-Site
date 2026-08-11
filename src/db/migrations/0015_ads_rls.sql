-- ─────────────────────────────────────────────────────────────────────
-- RLS for ads and ad_events.
--
-- Neither table gets an anon policy. `ads` is public-facing content, but
-- it is only ever read on the server over the direct connection, so an
-- anon REST policy would widen the surface without serving any renderer
-- — and it would expose ads still switched off. `ad_events` follows
-- search_queries: appended by the events route over the direct
-- connection, read by editors through an authenticated client.
-- ─────────────────────────────────────────────────────────────────────

alter table public.ads enable row level security;--> statement-breakpoint

create policy "ads_editor_all" on public.ads
  for all to authenticated using (public.is_editor()) with check (public.is_editor());--> statement-breakpoint

alter table public.ad_events enable row level security;--> statement-breakpoint

create policy "ad_events_editor_all" on public.ad_events
  for all to authenticated using (public.is_editor()) with check (public.is_editor());
