"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { about, contact, experiences, media, projects } from "@/db/schema";
import { deleteImageByUrl, uploadImage } from "@/lib/storage";
import { runMutation } from "./mutation";
import {
  firstIssue,
  idSchema,
  parseAboutForm,
  parseContactForm,
  parseExperienceForm,
  parseProjectForm,
  type ActionResult,
} from "./validation";

export async function saveAbout(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseAboutForm(formData);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  return runMutation(async () => {
    const existing = await db
      .select({ id: about.id, photoUrl: about.photoUrl })
      .from(about)
      .limit(1);
    const currentPhotoUrl = existing[0]?.photoUrl ?? null;

    // Photo: new upload wins, then explicit removal, else keep current.
    const photoFile = formData.get("photo");
    const removePhoto = formData.get("removePhoto") === "on";
    let photoUrl = currentPhotoUrl;
    if (photoFile instanceof File && photoFile.size > 0) {
      photoUrl = await uploadImage(photoFile, "about");
      await deleteImageByUrl(currentPhotoUrl);
    } else if (removePhoto) {
      photoUrl = null;
      await deleteImageByUrl(currentPhotoUrl);
    }

    const values = { ...parsed.data, photoUrl };
    if (existing[0]) {
      await db
        .update(about)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(about.id, existing[0].id));
    } else {
      await db.insert(about).values(values);
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
    await deleteOwnedMedia("experience", id.data);
    await db.delete(experiences).where(eq(experiences.id, id.data));
  });
}

/**
 * media has no FK (polymorphic owner) — remove rows AND their uploaded
 * storage objects when a parent entry is deleted.
 */
async function deleteOwnedMedia(
  ownerType: "experience" | "project",
  ownerId: string,
): Promise<void> {
  const rows = await db
    .select({ kind: media.kind, url: media.url })
    .from(media)
    .where(and(eq(media.ownerType, ownerType), eq(media.ownerId, ownerId)));
  await Promise.all(
    rows
      .filter((row) => row.kind === "image")
      .map((row) => deleteImageByUrl(row.url)),
  );
  await db
    .delete(media)
    .where(and(eq(media.ownerType, ownerType), eq(media.ownerId, ownerId)));
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
    await deleteOwnedMedia("project", id.data);
    await db.delete(projects).where(eq(projects.id, id.data));
  });
}
