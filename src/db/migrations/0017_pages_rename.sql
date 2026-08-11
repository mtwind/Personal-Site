-- ─────────────────────────────────────────────────────────────────────
-- knowledge_notes → pages.
--
-- Hand-written rather than generated: drizzle-kit sees a table that
-- vanished and one that appeared, and would drop the rows to say so.
-- Every statement here is a rename, so the content, its skill tags and
-- its RLS survive untouched.
--
-- The concept moved as well as the name. These stopped being private
-- notes the model reads and became the written half of the site: a
-- published one is a page a reader can open, cite and be linked to.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE "knowledge_notes" RENAME TO "pages";--> statement-breakpoint
ALTER TABLE "knowledge_note_skills" RENAME TO "page_skills";--> statement-breakpoint
ALTER TABLE "page_skills" RENAME COLUMN "note_id" TO "page_id";--> statement-breakpoint

ALTER TABLE "page_skills" RENAME CONSTRAINT "knowledge_note_skills_note_id_knowledge_notes_id_fk" TO "page_skills_page_id_pages_id_fk";--> statement-breakpoint
ALTER TABLE "page_skills" RENAME CONSTRAINT "knowledge_note_skills_skill_id_skills_id_fk" TO "page_skills_skill_id_skills_id_fk";--> statement-breakpoint
ALTER TABLE "page_skills" RENAME CONSTRAINT "knowledge_note_skills_note_id_skill_id_pk" TO "page_skills_page_id_skill_id_pk";--> statement-breakpoint

ALTER INDEX "knowledge_notes_visibility_idx" RENAME TO "pages_visibility_idx";--> statement-breakpoint

-- 'note' was only ever the default kind for freeform prose.
ALTER TABLE "pages" ALTER COLUMN "kind" SET DEFAULT 'page';--> statement-breakpoint
UPDATE "pages" SET "kind" = 'page' WHERE "kind" = 'note';--> statement-breakpoint

-- Policies follow their table, so these are renames too: the rules
-- themselves (editors only, no anon read at all) are unchanged.
ALTER POLICY "knowledge_notes_editor_all" ON "pages" RENAME TO "pages_editor_all";--> statement-breakpoint
ALTER POLICY "knowledge_note_skills_editor_all" ON "page_skills" RENAME TO "page_skills_editor_all";
