-- ─────────────────────────────────────────────────────────────────────
-- Put "This Website" on the team-matching home page.
--
-- A project nobody links to is only reachable by searching for it, and
-- a reader has to already know it exists to search. The home listing is
-- where the page says what to read, so this one goes on it — last,
-- behind the two authored pages, since those answer the question the
-- reader arrived with and this answers the one they have while reading.
--
-- Separate from 0023 so the row is seeded whether or not the listing is
-- the shape it is today; guarded on the id being absent, so an editor
-- who removes it from the home page keeps it removed.
-- ─────────────────────────────────────────────────────────────────────

update public.team_match_page as page
set featured = page.featured || jsonb_build_array(
  jsonb_build_object(
    'kind', 'project',
    'id', project.id,
    'title', null,
    'snippet', null
  )
)
from public.projects as project
where project.name = 'This Website'
  and not exists (
    select 1
    from jsonb_array_elements(page.featured) as entry
    where entry->>'id' = project.id::text
  );
