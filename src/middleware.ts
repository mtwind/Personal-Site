import { NextResponse, type NextRequest } from "next/server";

import {
  MATCH_VISIT_COOKIE,
  MATCH_VISIT_MAX_AGE,
  matchSlugFromPath,
} from "@/lib/match-visit";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Safety net: when an OAuth `redirectTo` isn't in the Supabase project's
  // redirect allow list, Supabase falls back to the Site URL and drops the
  // user on `/?code=...`, where nothing exchanges the code. Forward those
  // to the callback route instead of silently failing to sign in.
  if (
    request.nextUrl.pathname === "/" &&
    request.nextUrl.searchParams.has("code")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  const response = await updateSession(request);

  // Note the visit here rather than in the page: every route under the
  // team-matching page passes through this, so the reader who lands deep
  // in it and leaves from there is remembered the same as the one who
  // started at its home.
  const slug = matchSlugFromPath(request.nextUrl.pathname);
  if (slug && request.cookies.get(MATCH_VISIT_COOKIE)?.value !== slug) {
    response.cookies.set(MATCH_VISIT_COOKIE, slug, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      maxAge: MATCH_VISIT_MAX_AGE,
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all paths except static assets. Session refresh must cover
     * every page/API route so auth never silently expires.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
