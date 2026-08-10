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
  /** Flexible content blocks rendered as cards. */
  sections: jsonb("sections")
    .$type<{ title: string; body: string }[]>()
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

/** Exit-survey submissions from the team-matching page. */
export const feedbackSubmissions = pgTable("feedback_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** 'exit_form' for now; 'contact' reserved for a future contact form. */
  source: text("source").notNull().default("exit_form"),
  /** 'recruiter' | 'hiring_manager' | 'googler' | 'other' */
  role: text("role"),
  improvementNote: text("improvement_note"),
  wantsCall: boolean("wants_call").notNull().default(false),
  visitorEmail: text("visitor_email"),
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
    /** 'ok' | 'rate_limited' | 'unavailable' | 'error' */
    outcome: text("outcome").notNull().default("ok"),
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
