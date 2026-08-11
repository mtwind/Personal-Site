CREATE TABLE "knowledge_note_skills" (
	"note_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "knowledge_note_skills_note_id_skill_id_pk" PRIMARY KEY("note_id","skill_id")
);
--> statement-breakpoint
ALTER TABLE "knowledge_note_skills" ADD CONSTRAINT "knowledge_note_skills_note_id_knowledge_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."knowledge_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_note_skills" ADD CONSTRAINT "knowledge_note_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;