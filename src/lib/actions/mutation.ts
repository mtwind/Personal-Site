import "server-only";

import { revalidatePath } from "next/cache";

import { requireEditor } from "@/lib/auth";
import { UserFacingError } from "@/lib/user-facing-error";
import type { ActionResult } from "./validation";

/**
 * Shared wrapper for every profile mutation: editor check, error
 * normalization, page revalidation. UserFacingError messages are
 * written for the user and pass through verbatim.
 */
export async function runMutation(
  mutate: () => Promise<void>,
): Promise<ActionResult> {
  try {
    await requireEditor();
    await mutate();
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
