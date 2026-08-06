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
