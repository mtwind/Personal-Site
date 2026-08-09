import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback: Supabase redirects here with a `code` after Google
 * consent. Exchange it for a session cookie, then send the user home.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Behind Vercel's proxy, `request.url` carries the internal deployment
  // host, so redirects built from it would drop the user on a URL that
  // doesn't hold the auth cookies. Prefer the forwarded public host.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const baseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  // Supabase forwards provider failures (consent denied, misconfigured
  // client) as query params rather than a code.
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(errorUrl(baseUrl, providerError));
  }

  if (!code) {
    return NextResponse.redirect(
      errorUrl(baseUrl, "No authorization code was returned."),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(errorUrl(baseUrl, error.message));
  }

  // Only allow same-origin relative redirects (`//host` is protocol-relative
  // and would leave the site).
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(`${baseUrl}${safeNext}`);
}

function errorUrl(baseUrl: string, reason: string): string {
  return `${baseUrl}/auth/error?reason=${encodeURIComponent(reason)}`;
}
