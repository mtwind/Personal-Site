/** Client-safe upload constraints shared by UI checks and server validation. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const MAX_IMAGE_LABEL = "5 MB";

export function isImageTooLarge(file: File): boolean {
  return file.size > MAX_IMAGE_BYTES;
}
