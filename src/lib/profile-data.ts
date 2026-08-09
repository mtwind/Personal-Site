import "server-only";

import { cache } from "react";

import { asc, desc, eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

import { db } from "@/db";
import {
  about,
  contact,
  courses,
  experienceSkills,
  experiences,
  media,
  projectSkills,
  projects,
  skills,
} from "@/db/schema";
import type { Skill } from "@/lib/skill-icon";

export type About = InferSelectModel<typeof about>;
export type Contact = InferSelectModel<typeof contact>;
export type Experience = InferSelectModel<typeof experiences>;
export type Project = InferSelectModel<typeof projects>;
export type Course = InferSelectModel<typeof courses>;
export type MediaItem = InferSelectModel<typeof media>;

export interface ExperienceWithRelations extends Experience {
  skills: Skill[];
  media: MediaItem[];
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
  experiences: ExperienceWithRelations[];
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
 * Load everything the profile page renders, in parallel.
 *
 * Reads go through Drizzle (direct Postgres) rather than the Supabase
 * client: this content is public, so RLS adds nothing on reads — RLS
 * protects writes, which go through authenticated Supabase clients.
 *
 * Wrapped in React cache() so generateMetadata + page share one load
 * per request.
 */
export const getProfileData = cache(async (): Promise<ProfileData> => {
  const [
    aboutRows,
    experienceRows,
    projectRows,
    courseRows,
    contactRows,
    expSkillRows,
    projSkillRows,
    mediaRows,
  ] = await Promise.all([
    db.select().from(about).limit(1),
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

  return {
    about: aboutRows[0] ?? null,
    contact: contactRows[0] ?? null,
    experiences: experienceRows.map((exp) => ({
      ...exp,
      skills: skillsFor(expSkillRows, exp.id),
      media: mediaFor(mediaRows, "experience", exp.id),
    })),
    projects: allProjects.filter((proj) => proj.courseId === null),
    courses: courseRows.map((course) => ({
      ...course,
      projects: allProjects.filter((proj) => proj.courseId === course.id),
    })),
  };
});
