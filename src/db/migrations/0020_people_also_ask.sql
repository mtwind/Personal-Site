-- ─────────────────────────────────────────────────────────────────────
-- "People also ask", and a result count on logged searches.
--
-- The questions are authored rather than generated: the overview already
-- answers what a visitor types, and this carries what they wouldn't type
-- but want to know. Keywords attach a question to the searches it
-- belongs under; an empty list means it is general enough for any.
--
-- `result_count` is what turns the query log into something worth
-- reading. A row with zero results is a visitor asking this profile for
-- something it doesn't answer — the one search worth acting on.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE "related_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "question" text NOT NULL,
  "answer" text DEFAULT '' NOT NULL,
  "keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX "related_questions_active_sort_idx"
  ON "related_questions" ("active", "sort_order");--> statement-breakpoint

-- Answers are public to anyone holding the page's link, and are read
-- over the direct connection like the rest of the page's content.
ALTER TABLE "related_questions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

ALTER TABLE "search_queries" ADD COLUMN "result_count" integer;
