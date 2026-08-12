-- ─────────────────────────────────────────────────────────────────────
-- Location preferences, as pins on a map of the US.
--
-- Each pin carries its own note, because the reason is the part a list
-- of city names throws away — "family is an hour away", "the team I want
-- is there" — and that reason is what the map shows on hover.
--
-- `priority` is nullable and not unique: ranking is optional, and two
-- cities can be wanted equally. Lower is stronger; the levels and their
-- colours live in `lib/location-pins`, so the legend, the pins and the
-- admin form all read from one place.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE "location_pins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"priority" integer,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "location_pins_active_sort_idx" ON "location_pins" USING btree ("active","sort_order");
