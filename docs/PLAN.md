# Personal Site — Implementation Plan

> Full-stack personal website: public profile (about / experience / projects / contact),
> owner-only editing via Google auth, and a hidden Google team-matching page with an exit
> survey and meeting booking. Optimized for **free / near-free hosting with no cold starts**.

---

## 1. Tech Stack (final)

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Full-stack in one Vercel deploy — API/server actions colocated with UI |
| Hosting | **Vercel (Hobby / free)** | Serverless functions, ~50–300ms cold start (no always-on server) |
| Database | **Supabase Postgres (free)** | Scales to zero; no cold-start tax |
| Auth | **Supabase Auth — Google provider only** | Email allowlist; no signup page |
| File storage | **Supabase Storage** | Media, logos, resume PDF |
| Email | **Resend (free tier)** | Notifies owner on form submissions |
| Company search | **External API (Brandfetch / logo.dev)** | LinkedIn-style autocomplete + logos |
| Skill icons | **Devicon + Simple Icons** (bundled) + custom upload | ~3,000+ searchable icons, no runtime API (see §4.4) |
| Scheduling | **Google Calendar API (direct)** | Owner authorizes once; visitors pick a free slot |
| Domain | **Custom domain** (owned) → point at Vercel | Clean secret-page URL |
| ORM / DB access | **Drizzle ORM** (or Supabase client) | Type-safe schema + migrations |
| Styling | **Tailwind CSS** + shadcn/ui | Fast, consistent; Google-styled secret page |
| Validation | **Zod** at every boundary | Forms, API inputs, external API responses |

### Why this is genuinely cheap
- No always-on backend → nothing to keep warm.
- Serverless functions + serverless Postgres are billed on usage; a personal site sits
  comfortably inside both free tiers.
- The only potential paid item is the company API above its free quota (low volume here).

---

## 2. Architecture

```
                          ┌─────────────────────────────┐
        Visitor  ───────► │      Next.js on Vercel       │
        (public,          │  - Public profile (SSR/ISR)  │
         read-only)       │  - Secret page (noindex)     │
                          │  - Server actions / API      │
        Owner    ───────► │  - Edit mode (auth-gated)    │
        (Google sign-in)  └───────┬───────────┬──────────┘
                                  │           │
                    ┌─────────────┘           └───────────────┐
                    ▼                                          ▼
        ┌───────────────────────┐              ┌──────────────────────────┐
        │  Supabase             │              │  External services        │
        │  - Postgres (data)    │              │  - Resend (email)         │
        │  - Auth (Google)      │              │  - Brandfetch (companies) │
        │  - Storage (media)    │              │  - Google Calendar API    │
        └───────────────────────┘              └──────────────────────────┘
```

### Two distinct Google OAuth roles (important)
1. **Owner sign-in** (Supabase Auth, Google provider) → lets *you* edit the site.
2. **Calendar booking** (Google Calendar API) → app stores *your* refresh token (or a
   service account) to read free/busy and create events. **Visitors never sign in** — they
   just choose an open slot and enter their email to receive the invite.

Both live under **one Google Cloud project**: OAuth consent screen + Calendar API enabled.

---

## 3. Data Model (Postgres / Supabase)

```
editors                 -- allowlist of who may edit (Google email)
  id                pk
  email             text unique
  created_at        timestamptz

about
  id                pk (singleton row)
  headline          text
  body              text (markdown)
  photo_url         text
  updated_at        timestamptz

experiences
  id                pk
  company_name      text
  company_domain    text          -- from company API, drives logo
  company_logo_url  text
  title             text
  start_date        date
  end_date          date null      -- null = present
  bullets           text[]         -- or jsonb ordered list
  sort_order        int
  updated_at        timestamptz

projects
  id                pk
  name              text
  start_date        date
  end_date          date null
  bullets           text[]
  repo_url          text null
  sort_order        int
  updated_at        timestamptz

skills                              -- master list of tech/tools/languages
  id                pk
  name              text unique
  icon_slug         text            -- Simple Icons / Devicon slug
  icon_source       text            -- 'devicon' | 'simple-icons' | 'custom'
  icon_variant      text null       -- devicon variant: 'plain' | 'original' | 'colored' ...
  color             text null       -- brand hex (from Simple Icons / Devicon)
  icon_url          text null       -- Storage URL when icon_source = 'custom'

experience_skills   (experience_id, skill_id)   -- many-to-many
project_skills      (project_id, skill_id)      -- many-to-many

media                               -- attachments for experiences/projects
  id                pk
  owner_type        text            -- 'experience' | 'project'
  owner_id          uuid
  kind              text            -- 'image' | 'link' | 'video'
  url               text
  caption           text null
  sort_order        int

contact
  id                pk (singleton)
  linkedin_url      text
  phone             text
  email             text
  resume_url        text            -- Supabase Storage

team_match_page                     -- the secret page content
  id                pk (singleton)
  slug              text unique     -- unguessable
  content           jsonb           -- flexible blocks (extensible)
  updated_at        timestamptz

feedback_submissions                -- secret-page exit form + contact form
  id                pk
  source            text            -- 'exit_form' | 'contact'
  role              text null       -- recruiter | hiring_manager | googler | other
  improvement_note  text null
  wants_call        bool
  visitor_email     text null
  booked_event_id   text null       -- Google Calendar event id if they booked
  created_at        timestamptz
```

**Row-Level Security:** public read on display tables; writes restricted to authenticated
users whose email is in `editors`. `feedback_submissions` = insert-only for anon, read for
editors.

---

## 4. Feature Specs

### 4.1 Public profile (one page)
- Sections: **About**, **Work Experience**, **Projects**, **Contact**.
- SSR/ISR for fast loads + SEO on the public parts.
- Skill icons render as a row of logos on each experience/project card.

### 4.2 Auth + editing
- Supabase Auth, **Google only**. Accounts added manually by inserting into `editors`
  (no signup UI).
- When signed in as an editor: inline "edit mode" with forms for each section.
- Everyone else: read-only.

### 4.3 Company search (LinkedIn-style)
- Autocomplete input → hits our API route → proxies Brandfetch/logo.dev search.
- Selecting a result stores `company_name`, `company_domain`, `company_logo_url`.
- API key kept server-side (never in the client).

### 4.4 Skill / tech search with icons
**Sources (all bundled locally — no runtime API):**
1. **Devicon** (~150–200 dev technologies) — *primary.* Full-color, official brand colors,
   variants (plain/original/colored/wordmark). MIT. Ships `devicon.json` manifest.
2. **Simple Icons** (3,000+ brands) — *fallback for broad coverage.* Monochrome single-path +
   brand hex. CC0. Ships a JSON metadata index.
3. **Custom upload** — anything in neither → SVG/PNG to Supabase Storage (`icon_source='custom'`).

**Build the searchable catalog:** at build time, merge the Devicon + Simple Icons manifests
into one normalized catalog `{name, slug, source, color, variants, tags}` and seed a
`skills_catalog` table (or ship as static JSON). Autocomplete searches this **locally** →
fast, free, offline-capable.

**Search order:** Devicon (colored/official/dev-focused) → Simple Icons (broad) →
"add custom". Picking one stores `name`, `icon_slug`, `icon_source` (+ `icon_variant`,
`color`) in `skills`.

**Rendering by source:** Simple Icons → pull SVG path from the `simple-icons` npm package and
apply color (brand hex, or theme-adjusted for dark mode); Devicon → full-color SVG via CDN or
icon-font class. The `icon_source` field selects the render path.

> Contrast: *company* logos (§4.3) need a **live** external API because they're not a fixed,
> bundleable set. Skill icons are a fixed catalog, so we bundle instead of calling out.

### 4.5 Contact section
- LinkedIn, phone, email, resume download (from Storage).
- Optional inline contact form → `feedback_submissions(source='contact')` → email owner.

### 4.6 Secret team-matching page
- **Access:** unguessable slug only. `noindex, nofollow` headers, excluded from
  `sitemap.xml` and `robots.txt`, zero internal links.
- **Look:** Google-styled UI (Material-ish: Google Sans/Roboto, Google color accents).
- **Content:** richer team-matching profile (extensible `jsonb` blocks).
- **Book a meeting:** custom UI over Google Calendar free/busy → create event.
- **Exit form** (triggered by a "leave" button): very short —
  1. Are you a recruiter / hiring manager / Googler / other?
  2. Anything about my profile you'd improve?
  3. Would you be up for a call? → if yes, show slot picker + email field.
  - Submission → stored in DB **and** emailed to owner via Resend.

---

## 5. Phased Delivery

### Phase 1 — Public profile + auth + editing  *(ships first)*
- [ ] Scaffold Next.js + Tailwind + shadcn/ui; connect Supabase.
- [ ] Schema + migrations (Drizzle): editors, about, experiences, projects, skills,
      join tables, media, contact.
- [ ] Supabase Auth (Google) + editor allowlist + RLS.
- [ ] Public one-page profile (about / experience / projects / contact), read-only.
- [ ] Edit mode: CRUD forms for each section.
- [ ] Company search (external API proxy) + skill icons (Simple Icons/Devicon).
- [ ] Media/link attachments + resume upload to Storage.
- [ ] Deploy to Vercel, wire custom domain.

### Phase 2 — Secret page + exit form + email
- [ ] `team_match_page` with unguessable slug; noindex + sitemap exclusion.
- [ ] Google-styled layout + editable content blocks.
- [ ] Exit survey form → `feedback_submissions`.
- [ ] Resend integration → email owner on submit.
- [ ] Optional inline contact form reusing the same pipeline.

### Phase 3 — Google Calendar booking
- [ ] Google Cloud project: consent screen + Calendar API.
- [ ] Owner one-time authorization; store refresh token securely.
- [ ] Availability endpoint (freeBusy) → slot picker UI.
- [ ] Create event + email invite to visitor; link back to `feedback_submissions`.

---

## 6. External Setup Checklist
- [ ] Supabase project (DB + Auth + Storage buckets: `media`, `resume`).
- [ ] Google Cloud project → OAuth consent + credentials (Supabase Auth redirect).
- [ ] Google Calendar API enabled (Phase 3).
- [ ] Resend account + verified sending domain.
- [ ] Brandfetch / logo.dev API key.
- [ ] Vercel project + custom domain DNS.
- [ ] `.env`: Supabase URL/keys, Resend key, company API key, Google client id/secret,
      Calendar refresh token, secret-page slug.

## 7. Cost Snapshot (expected: $0/mo + domain)
- Vercel Hobby: free · Supabase free tier: free · Resend free tier: free
- Company API: free tier (low volume) · Google Calendar API: free · Domain: ~$12/yr

## 8. Open / Deferred
- Analytics (Vercel Analytics free tier) — optional later.
- Rate-limiting on public form endpoints (spam protection) — add in Phase 2.
- Backup/export of `feedback_submissions`.
```
