/** Client-safe upload constraints shared by UI checks and server validation. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const MAX_IMAGE_LABEL = "5 MB";

export function isImageTooLarge(file: File): boolean {
  return file.size > MAX_IMAGE_BYTES;
}

/* Résumé PDFs share the same cap — comfortably under the 6mb server-
   action body limit configured in next.config.ts. */
export const MAX_PDF_BYTES = 5 * 1024 * 1024;

export const MAX_PDF_LABEL = "5 MB";

export function isPdfTooLarge(file: File): boolean {
  return file.size > MAX_PDF_BYTES;
}

/**
 * Background documents. Same 5 MB ceiling as the résumé — the server
 * action body limit is what binds, not the model's 32 MB request cap.
 */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export const MAX_DOCUMENT_LABEL = "5 MB";

export function isDocumentTooLarge(file: File): boolean {
  return file.size > MAX_DOCUMENT_BYTES;
}

/** What the extractor can read, mapped to how the API must receive it. */
export const DOCUMENT_TYPES: Record<string, "pdf" | "text" | "image"> = {
  "application/pdf": "pdf",
  "text/plain": "text",
  "text/markdown": "text",
  "text/csv": "text",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
};

export const DOCUMENT_ACCEPT =
  ".pdf,.txt,.md,.csv,.jpg,.jpeg,.png,.webp,.gif";
