"use server";

import { revalidatePath } from "next/cache";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { relatedQuestions, teamMatchPage } from "@/db/schema";
import { runMutation } from "./mutation";
import {
  firstIssue,
  idSchema,
  parseQuestionForm,
  type ActionResult,
} from "./validation";

/**
 * Editor-only writes for the "people also ask" block.
 *
 * The questions render inside the shell on every search, so a save
 * revalidates the whole team-matching subtree rather than one path.
 */
async function revalidateQuestions(): Promise<void> {
  const rows = await db
    .select({ slug: teamMatchPage.slug })
    .from(teamMatchPage)
    .limit(1);
  if (rows[0]) revalidatePath(`/match/${rows[0].slug}`, "layout");
  revalidatePath("/admin/questions");
}

/** Create a question, or save an edit to one. */
export async function saveQuestion(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseQuestionForm(formData);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { id, ...values } = parsed.data;

  return runMutation(async () => {
    if (id) {
      const existing = await db
        .select({ id: relatedQuestions.id })
        .from(relatedQuestions)
        .where(eq(relatedQuestions.id, id))
        .limit(1);
      if (!existing[0]) throw new Error("That question no longer exists.");

      await db
        .update(relatedQuestions)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(relatedQuestions.id, id));
    } else {
      await db.insert(relatedQuestions).values(values);
    }

    await revalidateQuestions();
  });
}

export async function deleteQuestion(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = idSchema.safeParse(formData.get("id"));
  if (!parsed.success) return { ok: false, error: "Invalid question id" };

  return runMutation(async () => {
    await db.delete(relatedQuestions).where(eq(relatedQuestions.id, parsed.data));
    await revalidateQuestions();
  });
}

/** Show or hide one question without deleting what was written. */
export async function toggleQuestion(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = idSchema.safeParse(formData.get("id"));
  if (!parsed.success) return { ok: false, error: "Invalid question id" };

  return runMutation(async () => {
    const rows = await db
      .select({ active: relatedQuestions.active })
      .from(relatedQuestions)
      .where(eq(relatedQuestions.id, parsed.data))
      .limit(1);
    if (!rows[0]) throw new Error("That question no longer exists.");

    await db
      .update(relatedQuestions)
      .set({ active: !rows[0].active, updatedAt: new Date() })
      .where(eq(relatedQuestions.id, parsed.data));

    await revalidateQuestions();
  });
}
