import "server-only";

import { cache } from "react";

import { asc, desc, eq, ne } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

import { db } from "@/db";
import { knowledgeNoteSkills, knowledgeNotes, skills } from "@/db/schema";
import type { Skill } from "@/lib/skill-icon";

type KnowledgeNoteRow = InferSelectModel<typeof knowledgeNotes>;

/** A note plus the skills tagged on it, in the order they were arranged. */
export interface KnowledgeNote extends KnowledgeNoteRow {
  skills: Skill[];
}

export type { NoteVisibility } from "@/lib/knowledge-visibility";

/** Attach each note's skills in one extra query rather than N. */
async function withSkills(rows: KnowledgeNoteRow[]): Promise<KnowledgeNote[]> {
  if (rows.length === 0) return [];

  const links = await db
    .select({
      noteId: knowledgeNoteSkills.noteId,
      sortOrder: knowledgeNoteSkills.sortOrder,
      skill: skills,
    })
    .from(knowledgeNoteSkills)
    .innerJoin(skills, eq(knowledgeNoteSkills.skillId, skills.id));

  return rows.map((row) => ({
    ...row,
    skills: links
      .filter((link) => link.noteId === row.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((link) => link.skill),
  }));
}

/** Everything, in the order the admin page lists it. */
export const getKnowledgeNotes = cache(async (): Promise<KnowledgeNote[]> => {
  const rows = await db
    .select()
    .from(knowledgeNotes)
    .orderBy(asc(knowledgeNotes.sortOrder), desc(knowledgeNotes.createdAt));
  return withSkills(rows);
});

/**
 * The notes the model is grounded on — everything except drafts. Kept
 * separate from the admin query so a draft can never reach the prompt
 * by way of someone reusing the wrong helper.
 */
export const getGroundingNotes = cache(async (): Promise<KnowledgeNote[]> => {
  const rows = await db
    .select()
    .from(knowledgeNotes)
    .where(ne(knowledgeNotes.visibility, "draft"))
    .orderBy(asc(knowledgeNotes.sortOrder), desc(knowledgeNotes.createdAt));
  return withSkills(rows);
});
