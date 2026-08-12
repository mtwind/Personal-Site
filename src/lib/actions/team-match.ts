"use server";

import { revalidatePath } from "next/cache";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { contact, feedbackSubmissions, teamMatchPage } from "@/db/schema";
import { sendFeedbackEmail, type FeedbackEmailInput } from "@/lib/email";
import { getServerEnv } from "@/lib/env";
import { deleteStoredFileByUrl, uploadResume } from "@/lib/storage";
import { runMutation } from "./mutation";
import {
  feedbackDetailSchema,
  feedbackRoleSchema,
  feedbackTeamSchema,
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
    // Layout scope: every entry and section page lives under it.
    revalidatePath(`/match/${row.slug}`, "layout");
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

  await notifyFeedback(parsed.data);

  return { ok: true };
}

/**
 * Where the owner is told about a submission. Best-effort by design.
 *
 * Typed as the mail's own input rather than the exit form's, because
 * the two routes into it no longer carry the same fields: the strip's
 * later slides add a team, a product area and contact details that the
 * one-shot form never asks for.
 */
async function notifyFeedback(input: FeedbackEmailInput): Promise<void> {
  const notifyEmail =
    getServerEnv().NOTIFY_EMAIL ??
    (
      await db.select({ email: contact.email }).from(contact).limit(1)
    )[0]?.email;
  if (notifyEmail) {
    await sendFeedbackEmail(notifyEmail, input);
  }
}

/**
 * How long a row started by the strip stays open to its second half.
 *
 * Long enough for a reader to answer, wander through the page and come
 * back at the end of the visit; short enough that an id going stale in
 * a closed tab isn't a lasting handle on someone else's row.
 */
const FEEDBACK_DETAIL_WINDOW_MS = 6 * 60 * 60 * 1000;

/**
 * PUBLIC action: the first tap of the inline strip.
 *
 * Stores the role on its own and hands back the row's id, because the
 * whole point of the strip is that this answer counts by itself. A
 * reader who taps "Recruiter" and reads on has already told the page
 * something true, and it is written down before they get the chance to
 * change their mind about the rest.
 *
 * No notification email: one tap is a statistic, not news. The mail goes
 * out with the second half, which is where a person actually says
 * something.
 */
export async function startFeedback(input: {
  role: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = feedbackRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  try {
    const [row] = await db
      .insert(feedbackSubmissions)
      .values({ source: "page_strip", role: parsed.data.role })
      .returning({ id: feedbackSubmissions.id });
    if (!row) throw new Error("insert returned no row");
    return { ok: true, id: row.id };
  } catch (error: unknown) {
    console.error("Feedback role insert failed:", error);
    return { ok: false, error: "Something went wrong saving that." };
  }
}

/**
 * Whether a strip row is still the one its own visitor is filling in.
 *
 * The id is the only thing standing between a caller and someone else's
 * row, so a row qualifies only while it is recent, came from the strip,
 * and has not yet been finished. "Finished" means it carries something
 * a person typed — a note or contact details — because those are the
 * fields the later steps write; a replayed id can therefore add to a
 * fresh row of its own making and nothing else.
 */
async function openStripRow(id: string) {
  const [row] = await db
    .select({
      role: feedbackSubmissions.role,
      source: feedbackSubmissions.source,
      note: feedbackSubmissions.improvementNote,
      contactInfo: feedbackSubmissions.contactInfo,
      createdAt: feedbackSubmissions.createdAt,
    })
    .from(feedbackSubmissions)
    .where(eq(feedbackSubmissions.id, id))
    .limit(1);

  if (
    !row ||
    row.source !== "page_strip" ||
    row.note !== null ||
    row.contactInfo !== null ||
    Date.now() - row.createdAt.getTime() >= FEEDBACK_DETAIL_WINDOW_MS
  ) {
    return null;
  }
  return row;
}

/**
 * PUBLIC action: the team slide, for hiring managers and Googlers.
 *
 * Stored on its own rather than held in the browser until the end, for
 * the same reason the role is: an answer given is an answer kept, even
 * if the reader closes the tab on the next question. No notification —
 * a team name is a detail on a row, not news in its own right. The mail
 * still goes out with the final step, by which point this is on the row
 * and travels with it.
 */
export async function addFeedbackTeam(input: {
  id: string;
  team: string | null;
  productArea: string | null;
}): Promise<ActionResult> {
  const parsed = feedbackTeamSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { id, ...team } = parsed.data;

  try {
    if (!(await openStripRow(id))) {
      return { ok: false, error: "That feedback has already been sent." };
    }

    await db
      .update(feedbackSubmissions)
      .set(team)
      .where(eq(feedbackSubmissions.id, id));
    return { ok: true };
  } catch (error: unknown) {
    console.error("Feedback team update failed:", error);
    return { ok: false, error: "Something went wrong saving that." };
  }
}

/**
 * PUBLIC action: the rest of what the strip asks, against the row the
 * first tap created.
 */
export async function addFeedbackDetail(input: {
  id: string;
  improvementNote: string | null;
  wantsCall: boolean;
  visitorEmail: string | null;
  contactInfo: string | null;
}): Promise<ActionResult> {
  const parsed = feedbackDetailSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { id, ...detail } = parsed.data;

  try {
    const row = await openStripRow(id);
    if (!row) {
      return { ok: false, error: "That feedback has already been sent." };
    }

    await db
      .update(feedbackSubmissions)
      .set(detail)
      .where(eq(feedbackSubmissions.id, id));

    // Read back what the earlier slides stored, so the mail describes
    // the whole submission rather than only this last step of it.
    const [saved] = await db
      .select({
        team: feedbackSubmissions.team,
        productArea: feedbackSubmissions.productArea,
      })
      .from(feedbackSubmissions)
      .where(eq(feedbackSubmissions.id, id))
      .limit(1);

    await notifyFeedback({
      role: row.role,
      ...detail,
      team: saved?.team ?? null,
      productArea: saved?.productArea ?? null,
    });
    return { ok: true };
  } catch (error: unknown) {
    console.error("Feedback detail update failed:", error);
    return {
      ok: false,
      error: "Something went wrong submitting your feedback.",
    };
  }
}
