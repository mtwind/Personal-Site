-- ─────────────────────────────────────────────────────────────────────
-- RLS for location_pins.
--
-- Follows `ads`: the rows are public-facing content, but they are only
-- ever read on the server over the direct connection, so an anon REST
-- policy would widen the surface without serving any renderer — and it
-- would hand out pins that are currently switched off. Editors reach
-- them through an authenticated client.
-- ─────────────────────────────────────────────────────────────────────

alter table public.location_pins enable row level security;--> statement-breakpoint

create policy "location_pins_editor_all" on public.location_pins
  for all to authenticated using (public.is_editor()) with check (public.is_editor());
