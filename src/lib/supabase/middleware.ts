import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { clientEnv } from "@/lib/env";

/**
 * Refreshes the Supabase auth session on every matched request and
 * keeps auth cookies in sync between request and response.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: getClaims() (not getSession()) — it refreshes an expired
  // token and verifies the JWT rather than trusting the cookie. Where the
  // project signs with an asymmetric key it verifies locally against a
  // cached key set, so the signed-in owner no longer pays a round trip
  // to the auth server on every request (and every prefetch); a
  // symmetric key falls back to the server check `getUser()` did.
  await supabase.auth.getClaims();

  return supabaseResponse;
}
