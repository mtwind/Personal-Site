CREATE TABLE "feedback_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text DEFAULT 'exit_form' NOT NULL,
	"role" text,
	"improvement_note" text,
	"wants_call" boolean DEFAULT false NOT NULL,
	"visitor_email" text,
	"booked_event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_match_page" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resume_url" text,
	"meeting_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_match_page_slug_unique" UNIQUE("slug")
);
