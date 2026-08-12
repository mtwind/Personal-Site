"use server";

import { revalidatePath } from "next/cache";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { locationPins, teamMatchPage } from "@/db/schema";
import { runMutation } from "./mutation";
import {
  firstIssue,
  idSchema,
  parseLocationPinForm,
  type ActionResult,
} from "./validation";

/**
 * Editor-only writes for the pins on the team-matching location map.
 *
 * The map is rendered by the home page, but the whole subtree is
 * revalidated the way the ads are: cheap, and it means a pin edited
 * while reading an entry page is already right when the reader gets
 * back to the map.
 */
async function revalidatePins(): Promise<void> {
  const rows = await db
    .select({ slug: teamMatchPage.slug })
    .from(teamMatchPage)
    .limit(1);
  if (rows[0]) revalidatePath(`/match/${rows[0].slug}`, "layout");
  revalidatePath("/admin/locations");
}

/** Create a pin, or save an edit to one. */
export async function saveLocationPin(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseLocationPinForm(formData);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { id, ...values } = parsed.data;

  return runMutation(async () => {
    if (id) {
      const existing = await db
        .select({ id: locationPins.id })
        .from(locationPins)
        .where(eq(locationPins.id, id))
        .limit(1);
      if (!existing[0]) throw new Error("That pin no longer exists.");

      await db
        .update(locationPins)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(locationPins.id, id));
    } else {
      await db.insert(locationPins).values(values);
    }

    await revalidatePins();
  });
}

/** Remove a pin from the map for good. */
export async function deleteLocationPin(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = idSchema.safeParse(formData.get("id"));
  if (!parsed.success) return { ok: false, error: "Invalid pin id" };

  return runMutation(async () => {
    await db.delete(locationPins).where(eq(locationPins.id, parsed.data));
    await revalidatePins();
  });
}

/**
 * Take a pin off the map without deleting it.
 *
 * Worth having separately from delete: a place can stop being true for a
 * while — a city that's off the table this year — and switching it off
 * keeps the note that was written about it.
 */
export async function toggleLocationPin(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = idSchema.safeParse(formData.get("id"));
  if (!parsed.success) return { ok: false, error: "Invalid pin id" };

  return runMutation(async () => {
    const rows = await db
      .select({ active: locationPins.active })
      .from(locationPins)
      .where(eq(locationPins.id, parsed.data))
      .limit(1);
    if (!rows[0]) throw new Error("That pin no longer exists.");

    await db
      .update(locationPins)
      .set({ active: !rows[0].active, updatedAt: new Date() })
      .where(eq(locationPins.id, parsed.data));
    await revalidatePins();
  });
}
