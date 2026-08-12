-- ─────────────────────────────────────────────────────────────────────
-- The site, as one of its own projects — team-matching page only.
--
-- It is the piece of work the reader is standing inside, which is
-- exactly why it belongs here and not on the public profile: listing
-- "this website" on the website is a curiosity, while showing it to
-- someone deciding what team to put me on is the strongest thing on the
-- page. `match_only` (0022) is what keeps it to the one surface.
--
-- Seeded rather than authored so a fresh database comes up with it. Both
-- halves are guarded on absence, so re-running changes nothing and an
-- edit made later in the admin UI is never overwritten.
-- ─────────────────────────────────────────────────────────────────────

-- The stack's own icons. Everything else it is tagged with is already in
-- the skills table; these four are new, and named to match the catalog
-- so they render as real logos rather than initial tiles.
insert into public.skills (name, icon_slug, icon_source, icon_variant, color)
values
  ('Supabase', 'supabase', 'devicon', 'original', '#3ecf8e'),
  ('Drizzle', 'drizzle', 'simple-icons', null, '#C5F74F'),
  ('Resend', 'resend', 'simple-icons', null, '#000000'),
  ('Claude', 'claude', 'simple-icons', null, '#D97757')
on conflict (name) do nothing;--> statement-breakpoint

insert into public.projects
  (name, headline, bullets, repo_url, match_only, sort_order)
select
  'This Website',
  'The page you are reading: a Next.js profile with a hidden, Google-styled team-matching site — search, a grounded AI overview, ads, and a CMS of its own.',
  jsonb_build_array(
    'The site this page belongs to: a Next.js 16 / React 19 app on TypeScript, Tailwind CSS v4 and Postgres, pairing a public profile with a hidden, Google-styled team-matching page reachable only by an unguessable slug.',
    'Built the data layer on Supabase Postgres with Drizzle ORM for reads — direct and RLS-free, since the content is public — and authenticated Supabase clients for writes, so row-level security guards every mutation; each server action parses its form through Zod before anything reaches the database.',
    'Made the team-matching page a real site rather than a widget: every project, experience, course, skill and page is its own route, and a Chrome-style tab strip holds the ones a visit has opened, so back and forward, cmd-click and copied links all behave the way a browser reader expects.',
    'Wrote search as a ranked keyword index shipped with the page and run in the browser — instant, no round trip — sitting beside an AI overview that streams grounded answers from Claude Sonnet 5 over the whole profile corpus, with follow-up turns, inline citations resolved back to real entries, and a time-paced reveal rather than visible network chunks.',
    'Capped the public model endpoint with per-IP hourly and global daily limits over hashed addresses, a query-length ceiling, and a conversation history rebuilt server-side into strict alternating turns, so a leaked link cannot become an unbounded bill or put words in the assistant''s mouth.',
    'Built the ad system end to end: three placements, keyword-targeted in the browser from one list shipped with the page, with impression and click logging behind per-IP and per-request caps, and an admin console that writes the copy and reports each ad''s counts.',
    'Added an exit-intent feedback flow that asks who the reader is, branches its follow-ups on the answer, stores the submission and notifies me over the Resend API — scoped to the visit so an answered prompt never asks twice, and best-effort on send so a failed email still keeps the response.',
    'Kept the page hidden without stranding the people entitled to it: middleware notes the visit in an httpOnly cookie on any route beneath it, and the public site offers the way back only when that cookie matches the real slug — so a forged cookie learns nothing and the slug stays out of everyone else''s HTML.',
    'Wrote the CMS behind all of it: inline edit mode on the public profile, a page editor with draft / private / published reach, private-bucket document uploads transcribed by Claude Opus 5 into grounding text, an authored "people also ask" set, and a featured list that arranges anything the site holds onto the home page.',
    'Added a search console that logs what visitors searched for separately from what the overview was asked — they mean different things — and surfaces the zero-result searches, which are the questions this profile cannot yet answer.',
    'Finished the Google impression in the details: date-aware doodles over the four dots, Web Speech voice search, an "I''m feeling lucky" jump to the top hit, frequently-visited tiles derived from the visit''s own history, a skill ranking counted from the work each language actually appears in, and the personal site itself framed in a tab.'
  ),
  'https://github.com/mtwind/Personal-Site',
  true,
  -- Ahead of the rest: on the one surface that shows it, it is the most
  -- relevant thing in the list.
  -1
where not exists (
  select 1 from public.projects where name = 'This Website'
);--> statement-breakpoint

-- The full stack, in the order it is worth reading.
insert into public.project_skills (project_id, skill_id, sort_order)
select project.id, skill.id, ordering.sort_order
from public.projects as project
join (
  values
    ('TypeScript', 0), ('Nextjs', 1), ('React', 2), ('Tailwind CSS', 3),
    ('PostgreSQL', 4), ('Supabase', 5), ('Drizzle', 6), ('Zod', 7),
    ('Claude', 8), ('Vercel', 9), ('Resend', 10), ('Claude Code', 11)
) as ordering(skill_name, sort_order) on true
join public.skills as skill on skill.name = ordering.skill_name
where project.name = 'This Website'
  and not exists (
    select 1
    from public.project_skills as existing
    where existing.project_id = project.id
      and existing.skill_id = skill.id
  );
