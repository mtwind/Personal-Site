import "server-only";

import { cache } from "react";

import { asc, desc, eq, ne } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

import { db } from "@/db";
import { pageSkills, pages, skills } from "@/db/schema";
import type { Skill } from "@/lib/skill-icon";

type PageRow = InferSelectModel<typeof pages>;

/** A page plus the skills tagged on it, in the order they were arranged. */
export interface SitePage extends PageRow {
  skills: Skill[];
}

export type { PageVisibility } from "@/lib/page-visibility";

/** Attach each page's skills in one extra query rather than N. */
async function withSkills(rows: PageRow[]): Promise<SitePage[]> {
  if (rows.length === 0) return [];

  const links = await db
    .select({
      pageId: pageSkills.pageId,
      sortOrder: pageSkills.sortOrder,
      skill: skills,
    })
    .from(pageSkills)
    .innerJoin(skills, eq(pageSkills.skillId, skills.id));

  return rows.map((row) => ({
    ...row,
    skills: links
      .filter((link) => link.pageId === row.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((link) => link.skill),
  }));
}

/** Everything, in the order the admin page lists it. */
export const getSitePages = cache(async (): Promise<SitePage[]> => {
  const rows = await db
    .select()
    .from(pages)
    .orderBy(asc(pages.sortOrder), desc(pages.createdAt));
  return withSkills(rows);
});

/**
 * The pages the model is grounded on — everything except drafts. Kept
 * separate from the admin query so a draft can never reach the prompt
 * by way of someone reusing the wrong helper.
 */
export const getGroundingPages = cache(async (): Promise<SitePage[]> => {
  const rows = await db
    .select()
    .from(pages)
    .where(ne(pages.visibility, "draft"))
    .orderBy(asc(pages.sortOrder), desc(pages.createdAt));
  return withSkills(rows);
});
