import {
  boolean,
  date,
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
  startDate: date("start_date").notNull(),
  /** Null end date = current position. */
  endDate: date("end_date"),
  bullets: jsonb("bullets").$type<string[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
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

/** Singleton row: contact links + resume. */
export const contact = pgTable("contact", {
  id: uuid("id").primaryKey().defaultRandom(),
  linkedinUrl: text("linkedin_url"),
  phone: text("phone"),
  email: text("email"),
  resumeUrl: text("resume_url"),
  showPhone: boolean("show_phone").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
