"use server";

import { revalidatePath } from "next/cache";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { about, contact, experiences, media, projects } from "@/db/schema";
import { requireEditor } from "@/lib/auth";
import {
  firstIssue,
  idSchema,
  parseAboutForm,
  parseContactForm,
  parseExperienceForm,
  parseProjectForm,
  type ActionResult,
} from "./validation";

/**
 * Shared wrapper: editor check, error normalization, page revalidation.
 * Every mutation on the profile page flows through here.
 */
async function runMutation(
  mutate: () => Promise<void>,
): Promise<ActionResult> {
  try {
    await requireEditor();
    await mutate();
    revalidatePath("/");
    return { ok: true };
  } catch (error: unknown) {
    console.error("Profile mutation failed:", error);
    const message =
      error instanceof Error && error.message.startsWith("Unauthorized")
        ? "You do not have edit access."
        : "Something went wrong saving your changes.";
    return { ok: false, error: message };
  }
}

export async function saveAbout(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseAboutForm(formData);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  return runMutation(async () => {
    const existing = await db.select({ id: about.id }).from(about).limit(1);
    if (existing[0]) {
      await db
        .update(about)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(about.id, existing[0].id));
    } else {
      await db.insert(about).values(parsed.data);
    }
  });
}

export async function saveContact(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseContactForm(formData);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  return runMutation(async () => {
    const existing = await db.select({ id: contact.id }).from(contact).limit(1);
    if (existing[0]) {
      await db
        .update(contact)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(contact.id, existing[0].id));
    } else {
      await db.insert(contact).values(parsed.data);
    }
  });
}

export async function createExperience(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseExperienceForm(formData);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  return runMutation(async () => {
    await db.insert(experiences).values(parsed.data);
  });
}

export async function updateExperience(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "Invalid experience id" };

  const parsed = parseExperienceForm(formData);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  return runMutation(async () => {
    await db
      .update(experiences)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(experiences.id, id.data));
  });
}

export async function deleteExperience(rawId: string): Promise<ActionResult> {
  const id = idSchema.safeParse(rawId);
  if (!id.success) return { ok: false, error: "Invalid experience id" };

  return runMutation(async () => {
    // media has no FK (polymorphic owner) — clean up explicitly.
    await db
      .delete(media)
      .where(
        and(eq(media.ownerType, "experience"), eq(media.ownerId, id.data)),
      );
    await db.delete(experiences).where(eq(experiences.id, id.data));
  });
}

export async function createProject(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseProjectForm(formData);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  return runMutation(async () => {
    await db.insert(projects).values(parsed.data);
  });
}

export async function updateProject(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "Invalid project id" };

  const parsed = parseProjectForm(formData);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  return runMutation(async () => {
    await db
      .update(projects)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(projects.id, id.data));
  });
}

export async function deleteProject(rawId: string): Promise<ActionResult> {
  const id = idSchema.safeParse(rawId);
  if (!id.success) return { ok: false, error: "Invalid project id" };

  return runMutation(async () => {
    await db
      .delete(media)
      .where(and(eq(media.ownerType, "project"), eq(media.ownerId, id.data)));
    await db.delete(projects).where(eq(projects.id, id.data));
  });
}
