import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Allowlist of Google-account emails permitted to edit the site. */
export const editors = pgTable("editors", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Singleton row: the About section. */
export const about = pgTable("about", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default(""),
  headline: text("headline").notNull().default(""),
  body: text("body").notNull().default(""),
  photoUrl: text("photo_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const experiences = pgTable("experiences", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").notNull(),
  companyDomain: text("company_domain"),
  companyLogoUrl: text("company_logo_url"),
  title: text("title").notNull(),
  /** One-line description shown on collapsed/preview cards. */
  headline: text("headline").notNull().default(""),
  startDate: date("start_date").notNull(),
  /** Null end date = current position. */
  endDate: date("end_date"),
  bullets: jsonb("bullets").$type<string[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** College coursework; projects can nest under a course. */
export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** e.g. "CS 4780". */
  courseNumber: text("course_number").notNull(),
  /** One-line description shown on collapsed/preview cards. */
  headline: text("headline").notNull().default(""),
  /** Free-form, e.g. "Fall 2024"; null = unspecified. */
  semester: text("semester"),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** One-line description shown on collapsed/preview cards. */
  headline: text("headline").notNull().default(""),
  /** When set, the project lists under this course, not under Projects. */
  courseId: uuid("course_id").references(() => courses.id, {
    onDelete: "cascade",
  }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  bullets: jsonb("bullets").$type<string[]>().notNull().default([]),
  repoUrl: text("repo_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Master list of languages/tools/frameworks with icon metadata. */
export const skills = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  iconSlug: text("icon_slug"),
  /** 'devicon' | 'simple-icons' | 'custom' */
  iconSource: text("icon_source").notNull().default("simple-icons"),
  iconVariant: text("icon_variant"),
  /** Brand hex color, e.g. "#3178C6". */
  color: text("color"),
  /** Storage URL when iconSource = 'custom'. */
  iconUrl: text("icon_url"),
});

export const experienceSkills = pgTable(
  "experience_skills",
  {
    experienceId: uuid("experience_id")
      .notNull()
      .references(() => experiences.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.experienceId, table.skillId] })],
);

export const projectSkills = pgTable(
  "project_skills",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.skillId] })],
);

export const pageSkills = pgTable(
  "page_skills",
  {
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.pageId, table.skillId] })],
);

/** Media/link attachments for experiences and projects. */
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** 'experience' | 'project' */
  ownerType: text("owner_type").notNull(),
  ownerId: uuid("owner_id").notNull(),
  /** 'image' | 'link' | 'video' */
  kind: text("kind").notNull(),
  url: text("url").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * Singleton row: the hidden Google team-matching page. No public RLS
 * read policy — the slug IS the access control, so the row must not be
 * queryable via the anon REST API. Server reads use the direct
 * connection (bypasses RLS).
 */
export const teamMatchPage = pgTable("team_match_page", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Unguessable URL slug; generated by scripts/seed-team-match.ts. */
  slug: text("slug").notNull().unique(),
  headline: text("headline").notNull().default(""),
  intro: text("intro").notNull().default(""),
  /**
   * The home page's results, in order: entries picked out of everything
   * the site already holds — a page, a project, a role, a course, a
   * skill — each optionally re-titled or re-described for this listing.
   *
   * Referenced by id rather than by name, so renaming a project doesn't
   * silently drop it off the home page. An entry that no longer exists
   * resolves to nothing and is skipped.
   */
  featured: jsonb("featured")
    .$type<
      {
        kind: string;
        id: string;
        title: string | null;
        snippet: string | null;
      }[]
    >()
    .notNull()
    .default([]),
  /** Google-specific résumé, separate from the public contact one. */
  resumeUrl: text("resume_url"),
  /** External scheduling link until Phase 3 booking lands. */
  meetingUrl: text("meeting_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * The written half of the team-matching site, and the background the AI
 * overview answers from.
 *
 * The public site is a résumé: it says what he built, not what he is
 * looking for, what he told an interviewer, or what a reference letter
 * says about him. These pages carry that. A private one reaches visitors
 * only through the overview's answers; a published one is also a page of
 * its own that answers can cite and the home page can feature.
 */
export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** 'page' — freeform prose; 'document' — an uploaded file's text. */
    kind: text("kind").notNull().default("page"),
    title: text("title").notNull(),
    /**
     * The text the model is grounded on. For a document this starts as
     * the extracted transcription and stays editable — extraction is a
     * first draft, not a source of truth.
     */
    body: text("body").notNull().default(""),
    /** Free-form labels, for the editor's own filing. Never shown. */
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    /**
     * 'draft'  — the model never sees it.
     * 'private'— grounds answers; has no URL and cannot be cited.
     * 'published' — also a readable page under the team-matching site.
     */
    visibility: text("visibility").notNull().default("private"),
    /**
     * When set, the page also renders the skill ranking derived from
     * what the profile is tagged with. A hand-kept list of favourite
     * languages goes stale; a count of the work using them doesn't.
     */
    showSkillRanking: boolean("show_skill_ranking").notNull().default(false),
    /** Storage path in the private `documents` bucket, for kind=document. */
    filePath: text("file_path"),
    fileName: text("file_name"),
    fileType: text("file_type"),
    fileSize: integer("file_size"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("pages_visibility_idx").on(table.visibility)],
);

/**
 * "People also ask": the questions a visitor is likely to have, answered
 * before they think to ask.
 *
 * These are authored, not generated. The AI overview already answers
 * whatever is typed; what this carries is the other half — the questions
 * a recruiter would never type into someone's profile ("does he need
 * sponsorship?", "when could he start?") but wants the answer to. The
 * point is to volunteer them.
 */
export const relatedQuestions = pgTable(
  "related_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    question: text("question").notNull(),
    /** Supports the same `[[kind:name]]` links the rest of the site uses. */
    answer: text("answer").notNull().default(""),
    /**
     * Searches this question belongs under. Empty means it is general
     * enough to show for anything, which is the common case.
     */
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("related_questions_active_sort_idx").on(table.active, table.sortOrder),
  ],
);

/** Exit-survey submissions from the team-matching page. */
export const feedbackSubmissions = pgTable("feedback_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  /**
   * Where the answer came from: 'exit_form' is the leaving dialog,
   * 'page_strip' the inline prompt at the foot of every page — which
   * writes its row on the first tap, so a row with a role and nothing
   * else is a reader who answered that much and no more.
   */
  source: text("source").notNull().default("exit_form"),
  /** 'recruiter' | 'hiring_manager' | 'googler' | 'other' */
  role: text("role"),
  /**
   * Free text, because a team name is not a list anyone could write
   * down in advance — "Search Quality", "Ads Privacy", a codename only
   * used internally. Only asked of hiring managers and Googlers.
   */
  team: text("team"),
  /**
   * One of `GOOGLE_PRODUCT_AREAS`, stored as its label rather than a
   * key. Google reorganises its product areas every couple of years,
   * and a stored label still reads correctly afterwards while a stored
   * key would point at a list entry that had moved.
   */
  productArea: text("product_area"),
  improvementNote: text("improvement_note"),
  wantsCall: boolean("wants_call").notNull().default(false),
  visitorEmail: text("visitor_email"),
  /**
   * Whatever they were willing to leave — an email, a LinkedIn URL, an
   * internal handle. Free text rather than an email column because the
   * ask is "any contact info", and refusing a LinkedIn profile for not
   * being an address would be the wrong trade.
   */
  contactInfo: text("contact_info"),
  /** Google Calendar event id once Phase 3 booking exists. */
  bookedEventId: text("booked_event_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Searches run against the team-matching page.
 *
 * Serves two jobs at once: it is the rate-limit ledger for the public
 * ask endpoint, and it is the record of what visitors actually wanted to
 * know — the most useful signal the search feature produces.
 *
 * No public RLS read policy: rows carry visitor questions and are only
 * ever written over the direct connection. Editors read them in admin.
 */
export const searchQueries = pgTable(
  "search_queries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    query: text("query").notNull(),
    /** Generated answer; null when the request never reached the model. */
    answer: text("answer"),
    /**
     * Salted SHA-256 of the client IP. Enough to rate-limit a repeat
     * caller, not enough to identify one — the raw address is never
     * written down.
     */
    ipHash: text("ip_hash").notNull(),
    /** 'search' | 'ok' | 'empty' | 'rate_limited' | 'unavailable' | 'error' */
    outcome: text("outcome").notNull().default("ok"),
    /**
     * How many results the keyword search returned, for rows logged by
     * the browser. Null for rows the ask endpoint wrote, which never saw
     * a result count. Zero is the interesting value: it is the record of
     * a visitor asking for something this profile doesn't answer.
     */
    resultCount: integer("result_count"),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    /** Cached prompt tokens, so cache effectiveness stays observable. */
    cachedTokens: integer("cached_tokens"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Per-IP window lookups and the global daily count both read this.
    index("search_queries_ip_created_idx").on(table.ipHash, table.createdAt),
    index("search_queries_created_idx").on(table.createdAt),
  ],
);

/**
 * Ads on the team-matching page: brands and pastimes the owner actually
 * likes, dressed as sponsored placements because the page is a pastiche
 * of Google. Nobody pays for these — the creative says so out loud.
 */
export const ads = pgTable(
  "ads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Advertiser name, e.g. "Burton". */
    brand: text("brand").notNull(),
    /** The blue link line. */
    headline: text("headline").notNull(),
    description: text("description").notNull().default(""),
    /** The grey line under the brand — cosmetic, e.g. "www.burton.com". */
    displayUrl: text("display_url").notNull().default(""),
    /** Where a click actually goes. */
    targetUrl: text("target_url").notNull(),
    /** Simple Icons slug; null falls back to an initial tile. */
    iconSlug: text("icon_slug"),
    /** Brand hex, used to tint the icon and the fallback tile. */
    color: text("color"),
    /** Overrides the Simple Icons URL when a brand isn't in the set. */
    iconUrl: text("icon_url"),
    /**
     * What the ⓘ behind "Sponsored" says about this ad. Empty falls back
     * to the site-wide disclosure — the joke is usually the same, but an
     * ad that needs its own explanation can carry one.
     */
    infoText: text("info_text").notNull().default(""),
    /** Query terms this ad wants to run against. Matching is case-fold. */
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    /** Which placements it is eligible for: 'sponsored' | 'rail' | 'banner'. */
    slots: jsonb("slots")
      .$type<string[]>()
      .notNull()
      .default(["sponsored", "rail", "banner"]),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("ads_active_sort_idx").on(table.active, table.sortOrder)],
);

/**
 * One impression or click, appended as it happens.
 *
 * Raw rows rather than counters on `ads`: a counter answers "how many"
 * and nothing else, while rows can still say *when* and *which slot* —
 * the two questions worth asking of an ad that nobody is paying for.
 *
 * No public RLS policy. Writes go through the events route over the
 * direct connection, the way the ask ledger does.
 */
export const adEvents = pgTable(
  "ad_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adId: uuid("ad_id")
      .notNull()
      .references(() => ads.id, { onDelete: "cascade" }),
    /** 'impression' | 'click' */
    kind: text("kind").notNull(),
    /** 'sponsored' | 'rail' | 'banner' */
    slot: text("slot").notNull(),
    /** Salted hash of the caller's IP — rate limiting only, as elsewhere. */
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // The stats view groups by ad; the write path counts by caller.
    index("ad_events_ad_kind_idx").on(table.adId, table.kind),
    index("ad_events_ip_created_idx").on(table.ipHash, table.createdAt),
  ],
);

/** Singleton row: contact links + resume. */
export const contact = pgTable("contact", {
  id: uuid("id").primaryKey().defaultRandom(),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  phone: text("phone"),
  email: text("email"),
  resumeUrl: text("resume_url"),
  showPhone: boolean("show_phone").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
