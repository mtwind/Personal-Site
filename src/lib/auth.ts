import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  /** Authenticated Supabase user email, or null when signed out. */
  email: string | null;
  /** True when the signed-in user is on the editors allowlist. */
  isEditor: boolean;
}

/**
 * Resolve the current auth state on the server. Cached per-request so
 * layout + page + components can all call it without extra round trips.
 *
 * Editor status is enforced by RLS at the database level; this check
 * only drives UI (showing/hiding edit controls).
 */
export const getAuthState = cache(async (): Promise<AuthState> => {
  const supabase = await createClient();

  // Verified locally against the project's cached signing keys where it
  // can be (see the proxy's session refresh), so a signed-in visit
  // doesn't wait on the auth server for every page it renders.
  const { data, error } = await supabase.auth.getClaims();
  const email = error ? null : data?.claims.email;

  if (typeof email !== "string" || !email) {
    return { email: null, isEditor: false };
  }

  const { data: editor } = await supabase
    .from("editors")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  return { email, isEditor: editor !== null };
});

/** Throw unless the current user is an editor. Use in server actions. */
export async function requireEditor(): Promise<AuthState> {
  const state = await getAuthState();
  if (!state.isEditor) {
    throw new Error("Unauthorized: editor access required");
  }
  return state;
}
