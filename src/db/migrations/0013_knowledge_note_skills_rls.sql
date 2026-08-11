-- ─────────────────────────────────────────────────────────────────────
-- RLS for knowledge_note_skills.
--
-- The join follows its parent, not the skills table: a skill row is
-- public, but *which* private note is tagged with it is not. So no anon
-- policy, matching knowledge_notes — unlike project_skills and
-- experience_skills, whose parents are public and which therefore do
-- carry a public read policy.
-- ─────────────────────────────────────────────────────────────────────

alter table public.knowledge_note_skills enable row level security;--> statement-breakpoint

create policy "knowledge_note_skills_editor_all" on public.knowledge_note_skills
  for all to authenticated using (public.is_editor()) with check (public.is_editor());
