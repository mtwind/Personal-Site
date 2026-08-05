import "server-only";

import { createClient } from "@supabase/supabase-js";

import { clientEnv, getServerEnv } from "@/lib/env";
import { MAX_IMAGE_BYTES, MAX_IMAGE_LABEL } from "@/lib/upload-limits";

export const MEDIA_BUCKET = "media";

/** MIME → extension allowlist. SVG is deliberately excluded (XSS vector). */
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/** Error whose message is safe to show to the user. */
export class UploadError extends Error {}

/** Admin storage client — secret key, server only. */
function adminStorage() {
  return createClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    getServerEnv().SUPABASE_SECRET_KEY,
    { auth: { persistSession: false } },
  ).storage;
}

/**
 * Validate and upload an image to the public media bucket.
 * Returns the public URL for storing in the database.
 */
export async function uploadImage(file: File, prefix: string): Promise<string> {
  const extension = ALLOWED_IMAGE_TYPES[file.type];
  if (!extension) {
    throw new UploadError(
      "Unsupported image type — use JPEG, PNG, WebP, GIF, or AVIF.",
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new UploadError(`Image is too large (max ${MAX_IMAGE_LABEL}).`);
  }

  const path = `${prefix}/${crypto.randomUUID()}.${extension}`;
  const storage = adminStorage();

  const { error } = await storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Best-effort removal of a previously uploaded object, keyed by its
 * public URL. Silently ignores URLs outside our bucket (external links).
 */
export async function deleteImageByUrl(url: string | null): Promise<void> {
  if (!url) return;
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return;

  const path = decodeURIComponent(url.slice(index + marker.length));
  const { error } = await adminStorage().from(MEDIA_BUCKET).remove([path]);
  if (error) {
    // Orphaned files are a cleanup concern, not a user-facing failure.
    console.error(`Storage delete failed for ${path}: ${error.message}`);
  }
}
