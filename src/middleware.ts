import { NextResponse, type NextRequest } from "next/server";

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

  return updateSession(request);
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
