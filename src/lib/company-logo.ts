import "server-only";

import { UploadError, uploadImage } from "@/lib/storage";

/**
 * Hosts whose logo links are known to expire.
 *
 * The company search hands back a Brandfetch CDN link, and those are not
 * permanent: an asset gets re-keyed or retired and the link starts
 * answering `410 Gone`, which is a broken image on the profile and an
 * error in the console every time it renders.
 */
const EXPIRING_HOSTS = new Set(["cdn.brandfetch.io", "asset.brandfetch.io"]);

const FETCH_TIMEOUT_MS = 8000;

export function isExpiringLogoUrl(url: string): boolean {
  try {
    return EXPIRING_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Copy a logo from an expiring host into storage we own, so the profile
 * points at a file that stays put.
 *
 * Returns the stored URL; the original when it can't be copied today
 * (network trouble, or a format the image bucket doesn't take), since a
 * link that still works is better than none; and null when the host says
 * the asset is gone, so the save falls back to a favicon rather than
 * storing a link that is already dead.
 */
export async function persistCompanyLogo(url: string): Promise<string | null> {
  if (!isExpiringLogoUrl(url)) return url;

  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error: unknown) {
    console.error("Company logo fetch failed:", error);
    return url;
  }

  if (response.status === 404 || response.status === 410) return null;
  if (!response.ok) return url;

  const type = response.headers.get("content-type")?.split(";")[0].trim();
  const bytes = await response.arrayBuffer();
  const file = new File([bytes], "logo", { type: type ?? "" });

  try {
    return await uploadImage(file, "company-logos");
  } catch (error: unknown) {
    // An unsupported format (SVG, say) or an oversized file: the link
    // works for now, and the editor can upload a copy by hand.
    if (!(error instanceof UploadError)) {
      console.error("Company logo upload failed:", error);
    }
    return url;
  }
}
