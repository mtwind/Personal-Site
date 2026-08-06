"use server";

import { revalidatePath } from "next/cache";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { contact, feedbackSubmissions, teamMatchPage } from "@/db/schema";
import { sendFeedbackEmail } from "@/lib/email";
import { getServerEnv } from "@/lib/env";
import { deleteStoredFileByUrl, uploadResume } from "@/lib/storage";
import { runMutation } from "./mutation";
import {
  firstIssue,
  parseFeedbackForm,
  parseTeamMatchForm,
  type ActionResult,
} from "./validation";

/** Editor-only: update the hidden page's content and Google résumé. */
export async function saveTeamMatchPage(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseTeamMatchForm(formData);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  return runMutation(async () => {
    const existing = await db
      .select({
        id: teamMatchPage.id,
        slug: teamMatchPage.slug,
        resumeUrl: teamMatchPage.resumeUrl,
      })
      .from(teamMatchPage)
      .limit(1);
    const row = existing[0];
    if (!row) {
      throw new Error(
        "team_match_page row missing — run scripts/seed-team-match.ts",
      );
    }

    // Résumé: new upload wins, then explicit removal, else keep current.
    const resumeFile = formData.get("resume");
    const removeResume = formData.get("removeResume") === "on";
    let resumeUrl = row.resumeUrl;
    if (resumeFile instanceof File && resumeFile.size > 0) {
      resumeUrl = await uploadResume(resumeFile);
      await deleteStoredFileByUrl(row.resumeUrl);
    } else if (removeResume) {
      resumeUrl = null;
      await deleteStoredFileByUrl(row.resumeUrl);
    }

    await db
      .update(teamMatchPage)
      .set({ ...parsed.data, resumeUrl, updatedAt: new Date() })
      .where(eq(teamMatchPage.id, row.id));
    revalidatePath(`/match/${row.slug}`);
  });
}

/**
 * PUBLIC action: store an exit-survey submission and notify the owner.
 * No editor gate — visitors are the whole point. Guarded by validation
 * length caps and a honeypot field instead.
 */
export async function submitFeedback(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  // Honeypot: real users never fill this hidden field. Pretend success.
  if (typeof formData.get("website") === "string" && formData.get("website")) {
    return { ok: true };
  }

  const parsed = parseFeedbackForm(formData);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  try {
    await db.insert(feedbackSubmissions).values({
      source: "exit_form",
      role: parsed.data.role,
      improvementNote: parsed.data.improvementNote,
      wantsCall: parsed.data.wantsCall,
      visitorEmail: parsed.data.visitorEmail,
    });
  } catch (error: unknown) {
    console.error("Feedback insert failed:", error);
    return {
      ok: false,
      error: "Something went wrong submitting your feedback.",
    };
  }

  // Email is best-effort — the row is already stored.
  const notifyEmail =
    getServerEnv().NOTIFY_EMAIL ??
    (
      await db.select({ email: contact.email }).from(contact).limit(1)
    )[0]?.email;
  if (notifyEmail) {
    await sendFeedbackEmail(notifyEmail, parsed.data);
  }

  return { ok: true };
}
