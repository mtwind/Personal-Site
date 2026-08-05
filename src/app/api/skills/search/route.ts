import { NextResponse } from "next/server";

import { searchCatalog } from "@/lib/skill-catalog";

/** Autocomplete over the bundled skill catalog. Public, local, fast. */
export function GET(request: Request): NextResponse {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json({ results: searchCatalog(query) });
}
