import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { skills } from "@/db/schema";
import type { SkillSelection } from "./validation";

/**
 * Turn picker selections into skill ids, creating rows as needed.
 *
 * Skill rows are shared and keyed by unique name — "React" on a project
 * and on a background note is one row with two links — so this upserts
 * by name and hands back the ids in the order the editor arranged them.
 * Duplicates within one selection collapse to the first occurrence.
 */
export async function resolveSkillIds(
  selections: SkillSelection[],
): Promise<string[]> {
  const seen = new Set<string>();
  const deduped = selections.filter((selection) => {
    const key = selection.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const skillIds: string[] = [];
  for (const selection of deduped) {
    const inserted = await db
      .insert(skills)
      .values({
        name: selection.name,
        iconSlug: selection.slug,
        iconSource: selection.source,
        iconVariant: selection.variant,
        color: selection.color,
      })
      .onConflictDoNothing({ target: skills.name })
      .returning({ id: skills.id });
    const skillId =
      inserted[0]?.id ??
      (
        await db
          .select({ id: skills.id })
          .from(skills)
          .where(eq(skills.name, selection.name))
      )[0]?.id;
    if (skillId) skillIds.push(skillId);
  }

  return skillIds;
}
