import "server-only";

import { revalidatePath, updateTag } from "next/cache";

import { requireEditor } from "@/lib/auth";
import { CONTENT_TAG } from "@/lib/content-cache";
import { UserFacingError } from "@/lib/user-facing-error";
import type { ActionResult } from "./validation";

/**
 * Shared wrapper for every profile mutation: editor check, error
 * normalization, cache expiry, page revalidation. UserFacingError
 * messages are written for the user and pass through verbatim.
 *
 * `updateTag` rather than `revalidateTag`: the editor who just saved is
 * about to look at the result, and stale-while-revalidate would show
 * them the version they had before.
 */
export async function runMutation(
  mutate: () => Promise<void>,
): Promise<ActionResult> {
  try {
    await requireEditor();
    await mutate();
    updateTag(CONTENT_TAG);
    revalidatePath("/");
    return { ok: true };
  } catch (error: unknown) {
    console.error("Profile mutation failed:", error);
    if (error instanceof UserFacingError) {
      return { ok: false, error: error.message };
    }
    const message =
      error instanceof Error && error.message.startsWith("Unauthorized")
        ? "You do not have edit access."
        : "Something went wrong saving your changes.";
    return { ok: false, error: message };
  }
}
