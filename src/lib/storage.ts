import "server-only";

import { createClient } from "@supabase/supabase-js";

import { clientEnv, getServerEnv } from "@/lib/env";
import { UserFacingError } from "@/lib/user-facing-error";
import {
  DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENT_LABEL,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_LABEL,
  MAX_PDF_BYTES,
  MAX_PDF_LABEL,
} from "@/lib/upload-limits";

export const MEDIA_BUCKET = "media";
export const RESUME_BUCKET = "resume";
/** Private: background documents, reachable only by a signed URL. */
export const DOCUMENT_BUCKET = "documents";

/** Buckets this app owns — the only ones the delete helper may touch. */
const OWNED_BUCKETS = new Set([MEDIA_BUCKET, RESUME_BUCKET]);

/** MIME → extension allowlist. SVG is deliberately excluded (XSS vector). */
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/** Error whose message is safe to show to the user. */
export class UploadError extends UserFacingError {}

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
 * Validate and upload a résumé PDF to the public resume bucket.
 * Returns the public URL for storing in the database.
 */
export async function uploadResume(file: File): Promise<string> {
  if (file.type !== "application/pdf") {
    throw new UploadError("Résumé must be a PDF file.");
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new UploadError(`PDF is too large (max ${MAX_PDF_LABEL}).`);
  }

  const path = `resume-${crypto.randomUUID()}.pdf`;
  const storage = adminStorage();

  const { error } = await storage.from(RESUME_BUCKET).upload(path, file, {
    contentType: "application/pdf",
    cacheControl: "31536000",
  });
  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return storage.from(RESUME_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Best-effort removal of a previously uploaded object, keyed by its
 * public URL. Ignores external URLs and buckets this app doesn't own.
 */
export async function deleteStoredFileByUrl(url: string | null): Promise<void> {
  if (!url) return;
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return;
  const [, bucket, rawPath] = match;
  if (!OWNED_BUCKETS.has(bucket)) return;

  const path = decodeURIComponent(rawPath);
  const { error } = await adminStorage().from(bucket).remove([path]);
  if (error) {
    // Orphaned files are a cleanup concern, not a user-facing failure.
    console.error(`Storage delete failed for ${path}: ${error.message}`);
  }
}

/**
 * Upload a background document to the private bucket.
 *
 * Returns the storage *path*, not a URL: the bucket is not public, so
 * there is no stable link to store. Reading one means minting a signed
 * URL at render time, which is what keeps an unpublished reference
 * letter unreachable by anyone who hasn't been handed a link.
 */
export async function uploadDocument(file: File): Promise<string> {
  if (!DOCUMENT_TYPES[file.type]) {
    throw new UploadError(
      "Unsupported file — use a PDF, a text or Markdown file, or an image.",
    );
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new UploadError(`File is too large (max ${MAX_DOCUMENT_LABEL}).`);
  }

  // Keep the original name in the path: a signed URL downloads under its
  // last segment, and "reference-letter.pdf" beats a bare uuid.
  const safeName = file.name.replace(/[^\w.-]+/g, "-").slice(-80);
  const path = `${crypto.randomUUID()}/${safeName || "document"}`;

  const { error } = await adminStorage()
    .from(DOCUMENT_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return path;
}

/** How long a document link stays good. Long enough to read, not to share. */
const SIGNED_URL_SECONDS = 60 * 30;

/** A temporary link to a private document, or null if it can't be signed. */
export async function signedDocumentUrl(
  path: string | null,
): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await adminStorage()
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) {
    console.error(`Signing ${path} failed: ${error.message}`);
    return null;
  }
  return data.signedUrl;
}

/** Best-effort removal of a document, by the path stored on its note. */
export async function deleteDocument(path: string | null): Promise<void> {
  if (!path) return;
  const { error } = await adminStorage().from(DOCUMENT_BUCKET).remove([path]);
  if (error) {
    console.error(`Storage delete failed for ${path}: ${error.message}`);
  }
}
