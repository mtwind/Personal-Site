# Session Handoff — Continuing on Another Device

> Last updated: 2026-08-06. Written for resuming development on a fresh
> machine. This repo is PUBLIC — no secrets or the private page slug
> appear here; see "Secrets to transfer" for what to carry over manually.

## Where the project stands

**Phase 1 (public profile) and Phase 2 (hidden team-matching page) are
complete and working.** The full plan lives in [PLAN.md](./PLAN.md); the
delivery status is:

- ✅ Next.js 16 + Supabase (Postgres/Auth/Storage) + Drizzle, RLS on all tables
- ✅ Google-only auth with manual editor allowlist (`editors` table)
- ✅ One-page profile in the "Editorial Noir" design (E3): masthead About,
  experience rows, project cards, contact — all DB-driven
- ✅ Light/dark theme (next-themes, class strategy, 0.6s cross-fade),
  ghost "MW" monogram animation, sticky section-nav header
- ✅ Edit mode (header switch, cookie-persisted): full CRUD for every
  section with Zod-validated server actions
- ✅ Company autocomplete (Brandfetch, editor-gated proxy) + manual
  domain/favicon fallback + custom logo upload; companies link to their
  domain
- ✅ Skill picker (bundled Devicon + Simple Icons catalog, 3,672 entries,
  searched server-side at `/api/skills/search`)
- ✅ Image uploads (media bucket) for experience/project media + about
  photo; résumé PDF uploads (resume bucket) for contact section
- ✅ Hidden Google-styled page at `/match/[slug]`: Roboto, animated
  Google-color orbs, editable sections, separate team-matching résumé,
  meeting link, exit survey → `feedback_submissions` + optional Resend
  email. Editor-only "Google" pill in the homepage header links to it.
- ✅ Month/year date pickers; dates stored pinned to the 1st
- 🔲 **Phase 3 (not started): Google Calendar booking** — real slot
  picker for the meeting card and the exit-survey "open to a call" flow
- 🔲 **Vercel deploy (deliberately last)** — nothing deployed yet
- 🔲 Design exploration remnants: `/designs/*` preview pages (B2–F3)
  still exist, noindex'd; delete once the design is final

## New-device setup

1. Clone and install:

```bash
git clone https://github.com/mtwind/Personal-Site.git && cd Personal-Site && npm install
```

2. Create `.env.local` from [.env.example](../.env.example) and fill it
   (see "Secrets to transfer" below).
3. No migrations/seeds needed — the Supabase database is shared and
   already migrated (4 migrations applied). To verify connectivity:

```bash
npm run db:verify
```

4. Run the site:

```bash
npm run dev
```

## Secrets to transfer (never commit these)

Copy the values from the old machine's `.env.local`, or re-fetch them:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page — modern "Publishable key" (`sb_publishable_...`), NOT the legacy anon key |
| `SUPABASE_SECRET_KEY` | Same page — "Secret key" (`sb_secret_...`) |
| `DATABASE_URL` | Dashboard → Connect → **Session pooler** URI (port 5432). MUST be a `*.pooler.supabase.com` host — the direct `db.<ref>.supabase.co` host is IPv6-only and hangs on IPv4 networks |
| `BRANDFETCH_CLIENT_ID` | brandfetch.com developer portal (company autocomplete; optional — manual entry works without it) |
| `RESEND_API_KEY` / `RESEND_FROM` / `NOTIFY_EMAIL` | resend.com (optional — feedback emails; submissions store in DB regardless) |

**The secret team-matching page URL** is intentionally not written here.
Find it by signing in on the homepage — a four-dot "Google" pill appears
in the header (editor-only) — or run `npx tsx scripts/seed-team-match.ts`,
which prints the existing URL.

## Repo map (what lives where)

- `src/app/page.tsx` — homepage (server): data load, edit-mode cookie, ghost, header
- `src/app/match/[slug]/page.tsx` — hidden page route (404s wrong slugs, noindex)
- `src/app/designs/*` — throwaway design previews (B2–F3)
- `src/app/api/skills/search` + `src/app/api/companies/search` — autocomplete endpoints
- `src/components/profile/*` — public view components (E3 styled)
- `src/components/edit/*` — edit-mode forms, pickers, uploaders
- `src/components/match/*` — Google page shell, editor form, exit dialog
- `src/lib/actions/*` — server actions (Zod-validated; `runMutation` = editor gate + revalidate)
- `src/lib/storage.ts` — Supabase Storage helpers (media + resume buckets)
- `src/db/schema.ts` + `src/db/migrations/` — Drizzle schema, SQL migrations incl. RLS
- `scripts/` — `setup-storage`, `seed-team-match`, `verify-db`, `build-skill-catalog`
- `docs/PLAN.md` — original architecture/plan document

## Design-system conventions

- Colors come from CSS variables in `src/app/globals.css` (`--bg`,
  `--title`, `--accent`, `--line`, …) — ivory in `:root`, noir under
  `.dark`. Never hardcode palette colors in profile/edit components;
  Tailwind var shorthand is used everywhere: `text-(--accent)`.
- The match page overrides those variables locally to a Google-light
  palette, so shared form components restyle themselves there.
- Site body font is Georgia (serif); `font-sans` (Geist) for meta
  labels/UI; the match page loads Roboto via `next/font`, scoped.

## Gotchas worth remembering

- **DB pooling**: `src/db/index.ts` caps postgres-js at `max: 1` and
  caches the client on `globalThis` — the Supabase session pooler allows
  only 15 clients and dev hot-reload leaks pools otherwise (EMAXCONNSESSION).
- **Server-action body limit** is 6 MB (`next.config.ts`) to fit 5 MB
  uploads; raise both together if upload caps change.
- **RLS asymmetry**: `team_match_page` and `feedback_submissions` have
  NO public-read policies on purpose (the slug is the secret). Server
  reads use the direct Drizzle connection, which bypasses RLS.
- **Skill catalog** (`src/data/skill-catalog.json`) is generated and
  committed; regenerate with `npm run build:catalog` only if
  devicon/simple-icons deps are updated.
- `.claude/launch.json` expects the dev server on port 3000 ("attach"
  config assumes you started `npm run dev` yourself).

## Suggested next steps (in order)

1. **Phase 3 — Google Calendar booking**: Google Cloud project already
   exists (used for Supabase auth). Enable the Calendar API, store an
   owner refresh token server-side, build a freeBusy-based slot picker,
   wire it into the match page's meeting card + exit-survey call flow,
   and record `booked_event_id` on `feedback_submissions`.
2. **Feedback admin view** (small): editor-only list of
   `feedback_submissions` — currently readable only via SQL.
3. **Cleanup before deploy**: delete `/designs/*` once the design is
   final; consider restyling `/login` to match E3.
4. **Deploy to Vercel** (task the user wants LAST): connect repo, set
   all env vars (switch `DATABASE_URL` to the transaction pooler, port
   6543 — the driver already sets `prepare: false`), add the production
   URL to Supabase auth redirect allowlist and Google OAuth authorized
   origins, point the custom domain, verify sign-in + uploads + the
   match page in production.
