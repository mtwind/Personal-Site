"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  about,
  contact,
  experienceSkills,
  experiences,
  media,
  projectSkills,
  projects,
  skills,
} from "@/db/schema";
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
  type SkillSelection,
} from "./validation";

/**
 * Replace an entry's skill links with the form's selections. Skill rows
 * are shared and upserted by unique name — "React" on two entries is
 * one row with two links.
 */
async function syncSkills(
  ownerType: "experience" | "project",
  ownerId: string,
  selections: SkillSelection[],
): Promise<void> {
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

  if (ownerType === "experience") {
    await db
      .delete(experienceSkills)
      .where(eq(experienceSkills.experienceId, ownerId));
    if (skillIds.length > 0) {
      await db.insert(experienceSkills).values(
        skillIds.map((skillId, index) => ({
          experienceId: ownerId,
          skillId,
          sortOrder: index,
        })),
      );
    }
  } else {
    await db.delete(projectSkills).where(eq(projectSkills.projectId, ownerId));
    if (skillIds.length > 0) {
      await db.insert(projectSkills).values(
        skillIds.map((skillId, index) => ({
          projectId: ownerId,
          skillId,
          sortOrder: index,
        })),
      );
    }
  }
}

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

/**
 * Keyless logo fallback: when a company has a domain but no logo from
 * the search API, Google's favicon service gives a decent mark for free.
 */
function withLogoFallback<
  T extends { companyDomain: string | null; companyLogoUrl: string | null },
>(data: T): T {
  if (data.companyLogoUrl || !data.companyDomain) return data;
  return {
    ...data,
    companyLogoUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(data.companyDomain)}&sz=128`,
  };
}

export async function createExperience(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseExperienceForm(formData);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { skills: skillSelections, ...values } = parsed.data;
  return runMutation(async () => {
    const inserted = await db
      .insert(experiences)
      .values(withLogoFallback(values))
      .returning({ id: experiences.id });
    await syncSkills("experience", inserted[0].id, skillSelections);
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

  const { skills: skillSelections, ...values } = parsed.data;
  return runMutation(async () => {
    await db
      .update(experiences)
      .set({ ...withLogoFallback(values), updatedAt: new Date() })
      .where(eq(experiences.id, id.data));
    await syncSkills("experience", id.data, skillSelections);
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

  const { skills: skillSelections, ...values } = parsed.data;
  return runMutation(async () => {
    const inserted = await db
      .insert(projects)
      .values(values)
      .returning({ id: projects.id });
    await syncSkills("project", inserted[0].id, skillSelections);
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

  const { skills: skillSelections, ...values } = parsed.data;
  return runMutation(async () => {
    await db
      .update(projects)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(projects.id, id.data));
    await syncSkills("project", id.data, skillSelections);
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
