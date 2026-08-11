-- ─────────────────────────────────────────────────────────────────────
-- Sections become pages; the home page becomes a list of results.
--
-- Sections were a second kind of content that behaved almost exactly
-- like a page — prose with a title, at a URL of its own — so they are
-- folded into `pages` and the column goes. What replaces them on the
-- home page is `featured`: an ordered list of *anything* the site
-- already holds, which is why it stores ids rather than prose.
--
-- The two run in one statement so the migration can't leave the home
-- page empty: every section it publishes as a page is featured back
-- onto the home page in the order it used to appear.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE "team_match_page" ADD COLUMN "featured" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "show_skill_ranking" boolean DEFAULT false NOT NULL;--> statement-breakpoint

WITH incoming AS (
  SELECT
    trim(section->>'title') AS title,
    COALESCE(section->>'body', '') AS body,
    ord
  FROM team_match_page,
       jsonb_array_elements(team_match_page.sections) WITH ORDINALITY AS s(section, ord)
  WHERE COALESCE(trim(section->>'title'), '') <> ''
), inserted AS (
  INSERT INTO pages (kind, title, body, visibility, sort_order, show_skill_ranking)
  SELECT
    'page',
    title,
    body,
    'published',
    -- Behind anything already written by hand, in their old order.
    100 + ord,
    -- The one section that carried the derived ranking keeps it.
    title = 'My Strongest Skills'
  FROM incoming
  RETURNING id, sort_order
)
UPDATE team_match_page
SET featured = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'kind', 'page',
        'id', id,
        'title', NULL,
        'snippet', NULL
      )
      ORDER BY sort_order
    )
    FROM inserted
  ),
  '[]'::jsonb
);--> statement-breakpoint

ALTER TABLE "team_match_page" DROP COLUMN "sections";
