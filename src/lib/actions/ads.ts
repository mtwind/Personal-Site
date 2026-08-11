"use server";

import { revalidatePath } from "next/cache";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { adEvents, ads, teamMatchPage } from "@/db/schema";
import { runMutation } from "./mutation";
import {
  firstIssue,
  idSchema,
  parseAdForm,
  type ActionResult,
} from "./validation";

/**
 * Editor-only writes for the ads on the team-matching page.
 *
 * Ads render inside the shell, so every page under it shows whatever
 * changed here — the whole subtree is revalidated rather than one path.
 */
async function revalidateAds(): Promise<void> {
  const rows = await db
    .select({ slug: teamMatchPage.slug })
    .from(teamMatchPage)
    .limit(1);
  if (rows[0]) revalidatePath(`/match/${rows[0].slug}`, "layout");
  revalidatePath("/admin/ads");
}

/** Create an ad, or save an edit to one. */
export async function saveAd(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseAdForm(formData);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { id, ...values } = parsed.data;

  return runMutation(async () => {
    if (id) {
      const existing = await db
        .select({ id: ads.id })
        .from(ads)
        .where(eq(ads.id, id))
        .limit(1);
      if (!existing[0]) throw new Error("That ad no longer exists.");

      await db
        .update(ads)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(ads.id, id));
    } else {
      await db.insert(ads).values(values);
    }

    await revalidateAds();
  });
}

/**
 * Delete an ad. Its events go with it — the counts describe an ad, and
 * kept without one they are rows nothing can name.
 */
export async function deleteAd(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = idSchema.safeParse(formData.get("id"));
  if (!parsed.success) return { ok: false, error: "Invalid ad id" };

  return runMutation(async () => {
    await db.delete(ads).where(eq(ads.id, parsed.data));
    await revalidateAds();
  });
}

/** Switch one ad on or off without opening the editor. */
export async function toggleAd(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = idSchema.safeParse(formData.get("id"));
  if (!parsed.success) return { ok: false, error: "Invalid ad id" };

  return runMutation(async () => {
    const rows = await db
      .select({ active: ads.active })
      .from(ads)
      .where(eq(ads.id, parsed.data))
      .limit(1);
    if (!rows[0]) throw new Error("That ad no longer exists.");

    await db
      .update(ads)
      .set({ active: !rows[0].active, updatedAt: new Date() })
      .where(eq(ads.id, parsed.data));
    await revalidateAds();
  });
}

/**
 * Wipe the event log.
 *
 * Useful after a round of editing, when the numbers describe creative
 * that no longer exists. The ads themselves are untouched.
 */
export async function clearAdStats(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  // The only irreversible action here, and the only one whose form posts
  // nothing identifying — so it has to carry the token deliberately
  // rather than be reachable by an empty submission.
  if (formData.get("confirm") !== "clear") {
    return { ok: false, error: "Nothing was cleared." };
  }

  return runMutation(async () => {
    await db.delete(adEvents);
    await revalidateAds();
  });
}
