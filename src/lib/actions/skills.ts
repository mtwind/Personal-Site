"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { experienceSkills, projectSkills, skills } from "@/db/schema";
import { runMutation } from "./mutation";
import { firstIssue, idSchema, type ActionResult } from "./validation";

const addSkillSchema = z.object({
  ownerType: z.enum(["experience", "project"]),
  ownerId: z.uuid(),
  name: z.string().trim().min(1, "Skill name is required").max(100),
  slug: z.string().max(100).nullable(),
  source: z.enum(["devicon", "simple-icons", "custom"]),
  color: z.string().max(20).nullable(),
  variant: z.string().max(40).nullable(),
});

export type AddSkillInput = z.infer<typeof addSkillSchema>;

/**
 * Attach a skill (from the catalog, or custom by name) to an experience
 * or project. Skill rows are shared: upserted by unique name, so "React"
 * on two jobs is one row with two links.
 */
export async function addSkill(input: AddSkillInput): Promise<ActionResult> {
  const parsed = addSkillSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { ownerType, ownerId, name, slug, source, color, variant } =
    parsed.data;

  return runMutation(async () => {
    const inserted = await db
      .insert(skills)
      .values({
        name,
        iconSlug: slug,
        iconSource: source,
        iconVariant: variant,
        color,
      })
      .onConflictDoNothing({ target: skills.name })
      .returning({ id: skills.id });

    const skillId =
      inserted[0]?.id ??
      (
        await db
          .select({ id: skills.id })
          .from(skills)
          .where(eq(skills.name, name))
      )[0]?.id;
    if (!skillId) throw new Error("Skill upsert failed");

    if (ownerType === "experience") {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(experienceSkills)
        .where(eq(experienceSkills.experienceId, ownerId));
      await db
        .insert(experienceSkills)
        .values({ experienceId: ownerId, skillId, sortOrder: count })
        .onConflictDoNothing();
    } else {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projectSkills)
        .where(eq(projectSkills.projectId, ownerId));
      await db
        .insert(projectSkills)
        .values({ projectId: ownerId, skillId, sortOrder: count })
        .onConflictDoNothing();
    }
  });
}

const removeSkillSchema = z.object({
  ownerType: z.enum(["experience", "project"]),
  ownerId: z.uuid(),
  skillId: idSchema,
});

/** Detach a skill from one entry. The shared skill row remains. */
export async function removeSkill(
  input: z.infer<typeof removeSkillSchema>,
): Promise<ActionResult> {
  const parsed = removeSkillSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { ownerType, ownerId, skillId } = parsed.data;

  return runMutation(async () => {
    if (ownerType === "experience") {
      await db
        .delete(experienceSkills)
        .where(
          and(
            eq(experienceSkills.experienceId, ownerId),
            eq(experienceSkills.skillId, skillId),
          ),
        );
    } else {
      await db
        .delete(projectSkills)
        .where(
          and(
            eq(projectSkills.projectId, ownerId),
            eq(projectSkills.skillId, skillId),
          ),
        );
    }
  });
}
