-- ─────────────────────────────────────────────────────────────────────
-- Companies as their own rows, with roles nested under them.
--
-- An internship and the full-time job that followed it used to be two
-- experience rows that each carried the same company name, domain and
-- logo. Now the company is one row and each role points at it, so the
-- page can show the employer once with the roles beneath.
--
-- `experiences` keeps its name and its ids: a role is still the unit
-- that media, skill links, the team-matching page's tokens and its
-- `/experience/…` routes all point at, and none of those have to move.
--
-- Backfill: one company per distinct employer name (matched without
-- regard to case or surrounding whitespace, since the same company
-- typed twice is the case this migration exists for). The domain, logo
-- and sort order come from the role that listed first, then every role
-- is pointed at its company before the old columns go.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"logo_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "company_id" uuid;--> statement-breakpoint

INSERT INTO "companies" ("name", "domain", "logo_url", "sort_order")
SELECT DISTINCT ON (lower(trim("company_name")))
  trim("company_name"),
  "company_domain",
  "company_logo_url",
  "sort_order"
FROM "experiences"
ORDER BY lower(trim("company_name")), "sort_order" ASC, "start_date" DESC;
--> statement-breakpoint

UPDATE "experiences" AS role
SET "company_id" = company."id"
FROM "companies" AS company
WHERE lower(company."name") = lower(trim(role."company_name"));
--> statement-breakpoint

ALTER TABLE "experiences" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "experiences_company_idx" ON "experiences" USING btree ("company_id");--> statement-breakpoint
ALTER TABLE "experiences" DROP COLUMN "company_name";--> statement-breakpoint
ALTER TABLE "experiences" DROP COLUMN "company_domain";--> statement-breakpoint
ALTER TABLE "experiences" DROP COLUMN "company_logo_url";
