import "server-only";

import { cache } from "react";

import { asc, desc, eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

import { db } from "@/db";
import {
  about,
  companies,
  contact,
  courses,
  experienceSkills,
  experiences,
  media,
  projectSkills,
  projects,
  skills,
} from "@/db/schema";
import { cachedContent } from "@/lib/content-cache";
import type { Serialized } from "@/lib/serialized";
import type { Skill } from "@/lib/skill-icon";

// Row types as they come back from the content cache: timestamps may be
// the strings they were serialized to (see `Serialized`).
export type About = Serialized<InferSelectModel<typeof about>>;
export type Contact = Serialized<InferSelectModel<typeof contact>>;
export type Company = Serialized<InferSelectModel<typeof companies>>;
/** One role at a company. */
export type Experience = Serialized<InferSelectModel<typeof experiences>>;
export type Project = Serialized<InferSelectModel<typeof projects>>;
export type Course = Serialized<InferSelectModel<typeof courses>>;
export type MediaItem = Serialized<InferSelectModel<typeof media>>;

export interface ExperienceWithRelations extends Experience {
  skills: Skill[];
  media: MediaItem[];
}

/** A company with every role held there, most recent first. */
export interface CompanyWithRoles extends Company {
  roles: ExperienceWithRelations[];
}

export interface ProjectWithRelations extends Project {
  skills: Skill[];
  media: MediaItem[];
}

export interface CourseWithProjects extends Course {
  projects: ProjectWithRelations[];
}

export interface ProfileData {
  about: About | null;
  /** Employers in display order, each carrying its roles. */
  companies: CompanyWithRoles[];
  /** Standalone projects only — course projects live under `courses`. */
  projects: ProjectWithRelations[];
  courses: CourseWithProjects[];
  contact: Contact | null;
}

interface SkillLink {
  ownerId: string;
  skill: Skill;
  sortOrder: number;
}

function skillsFor(links: SkillLink[], ownerId: string): Skill[] {
  return links
    .filter((link) => link.ownerId === ownerId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((link) => link.skill);
}

function mediaFor(items: MediaItem[], ownerType: string, ownerId: string) {
  return items
    .filter((m) => m.ownerType === ownerType && m.ownerId === ownerId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Companies read like a résumé: the one holding the most recent role
 * first, with an explicit sort order winning where the editor set one.
 * A company with no roles yet sorts last — it is still being filled in.
 */
function orderCompanies(list: CompanyWithRoles[]): CompanyWithRoles[] {
  const latestStart = (company: CompanyWithRoles) =>
    company.roles.reduce(
      (latest, role) => (role.startDate > latest ? role.startDate : latest),
      "",
    );
  return [...list].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      latestStart(b).localeCompare(latestStart(a)) ||
      a.name.localeCompare(b.name),
  );
}

/**
 * Load everything the profile page renders, in parallel.
 *
 * Reads go through Drizzle (direct Postgres) rather than the Supabase
 * client: this content is public, so RLS adds nothing on reads — RLS
 * protects writes, which go through authenticated Supabase clients.
 *
 * Cached across requests — the profile is read by every route under the
 * team-matching page and changes only when the owner edits it — and in
 * React cache() so generateMetadata + page share one load per request.
 */
const loadProfileData = cachedContent(
  "profile",
  async (): Promise<ProfileData> => {
    const [
      aboutRows,
      companyRows,
      experienceRows,
      projectRows,
      courseRows,
      contactRows,
      expSkillRows,
      projSkillRows,
      mediaRows,
    ] = await Promise.all([
      db.select().from(about).limit(1),
      db.select().from(companies).orderBy(asc(companies.sortOrder)),
      db
        .select()
        .from(experiences)
        .orderBy(asc(experiences.sortOrder), desc(experiences.startDate)),
      db
        .select()
        .from(projects)
        .orderBy(asc(projects.sortOrder), desc(projects.startDate)),
      db
        .select()
        .from(courses)
        .orderBy(asc(courses.sortOrder), asc(courses.courseNumber)),
      db.select().from(contact).limit(1),
      db
        .select({
          ownerId: experienceSkills.experienceId,
          sortOrder: experienceSkills.sortOrder,
          skill: skills,
        })
        .from(experienceSkills)
        .innerJoin(skills, eq(experienceSkills.skillId, skills.id)),
      db
        .select({
          ownerId: projectSkills.projectId,
          sortOrder: projectSkills.sortOrder,
          skill: skills,
        })
        .from(projectSkills)
        .innerJoin(skills, eq(projectSkills.skillId, skills.id)),
      db.select().from(media),
    ]);

    const allProjects = projectRows.map((proj) => ({
      ...proj,
      skills: skillsFor(projSkillRows, proj.id),
      media: mediaFor(mediaRows, "project", proj.id),
    }));

    const roles = experienceRows.map((exp) => ({
      ...exp,
      skills: skillsFor(expSkillRows, exp.id),
      media: mediaFor(mediaRows, "experience", exp.id),
    }));

    return {
      about: aboutRows[0] ?? null,
      contact: contactRows[0] ?? null,
      companies: orderCompanies(
        companyRows.map((company) => ({
          ...company,
          roles: roles.filter((role) => role.companyId === company.id),
        })),
      ),
      projects: allProjects.filter((proj) => proj.courseId === null),
      courses: courseRows.map((course) => ({
        ...course,
        projects: allProjects.filter((proj) => proj.courseId === course.id),
      })),
    };
  },
);

export const getProfileData = cache(
  (): Promise<ProfileData> => loadProfileData(),
);
