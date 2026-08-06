"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { media } from "@/db/schema";
import { requireEditor } from "@/lib/auth";
import { UploadError, deleteStoredFileByUrl, uploadImage } from "@/lib/storage";
import { runMutation } from "./mutation";
import {
  firstIssue,
  idSchema,
  parseMediaImageForm,
  parseMediaLinkForm,
  type ActionResult,
} from "./validation";

export type UploadUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Upload a company logo and return its URL. Unlike media uploads this
 * attaches to nothing — the experience form carries the URL and saves
 * it with the row, so it works for not-yet-created experiences too.
 */
export async function uploadCompanyLogo(
  formData: FormData,
): Promise<UploadUrlResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image to upload." };
  }

  try {
    await requireEditor();
    const url = await uploadImage(file, "company-logos");
    return { ok: true, url };
  } catch (error: unknown) {
    console.error("Company logo upload failed:", error);
    if (error instanceof UploadError) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Something went wrong uploading the logo." };
  }
}

/** Upload an image file and attach it to an experience or project. */
export async function uploadMediaImage(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseMediaImageForm(formData);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image to upload." };
  }

  return runMutation(async () => {
    const url = await uploadImage(
      file,
      `${parsed.data.ownerType}/${parsed.data.ownerId}`,
    );
    await db.insert(media).values({
      ownerType: parsed.data.ownerType,
      ownerId: parsed.data.ownerId,
      kind: "image",
      url,
      caption: parsed.data.caption,
    });
  });
}

/** Attach an external link to an experience or project. */
export async function addMediaLink(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseMediaLinkForm(formData);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  return runMutation(async () => {
    await db.insert(media).values({
      ownerType: parsed.data.ownerType,
      ownerId: parsed.data.ownerId,
      kind: "link",
      url: parsed.data.url,
      caption: parsed.data.caption,
    });
  });
}

/** Remove a media item; uploaded images are also deleted from Storage. */
export async function deleteMedia(rawId: string): Promise<ActionResult> {
  const id = idSchema.safeParse(rawId);
  if (!id.success) return { ok: false, error: "Invalid media id" };

  return runMutation(async () => {
    const rows = await db
      .select({ kind: media.kind, url: media.url })
      .from(media)
      .where(eq(media.id, id.data));
    const row = rows[0];
    if (!row) throw new UploadError("Media item not found.");

    if (row.kind === "image") {
      await deleteStoredFileByUrl(row.url);
    }
    await db.delete(media).where(eq(media.id, id.data));
  });
}
