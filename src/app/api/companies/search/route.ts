import { NextResponse } from "next/server";

import { getAuthState } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";

export interface CompanyResult {
  name: string;
  domain: string;
  logoUrl: string | null;
}

interface BrandfetchSearchItem {
  name?: string | null;
  domain?: string | null;
  icon?: string | null;
}

/**
 * LinkedIn-style company autocomplete, proxying Brandfetch so the
 * client id stays server-side. Editor-gated: this endpoint spends our
 * external API quota. Returns configured:false when no key is set so
 * the UI can fall back to manual entry.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { isEditor } = await getAuthState();
  if (!isEditor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (query.length < 2) {
    return NextResponse.json({ configured: true, results: [] });
  }

  const clientId = getServerEnv().BRANDFETCH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ configured: false, results: [] });
  }

  try {
    const response = await fetch(
      `https://api.brandfetch.io/v2/search/${encodeURIComponent(query)}?c=${clientId}`,
      // Company names/logos change rarely — cache identical queries for a day.
      { next: { revalidate: 86400 } },
    );
    if (!response.ok) {
      throw new Error(`Brandfetch responded ${response.status}`);
    }

    const items = (await response.json()) as BrandfetchSearchItem[];
    const results: CompanyResult[] = items
      .filter((item) => Boolean(item.name && item.domain))
      .slice(0, 8)
      .map((item) => ({
        name: item.name as string,
        domain: item.domain as string,
        logoUrl: item.icon ?? null,
      }));

    return NextResponse.json({ configured: true, results });
  } catch (error: unknown) {
    console.error("Company search failed:", error);
    return NextResponse.json({ configured: true, results: [] });
  }
}
