import { NextResponse } from "next/server";

import { clientIp, hashIp } from "@/lib/ask-limits";
import { getAuthState } from "@/lib/auth";
import { logSearch, parseSearchLog, withinSearchLimit } from "@/lib/search-log";

/**
 * Where the browser reports what was searched for.
 *
 * Every outcome is 204, for the same reason the ad beacon's is: the
 * caller is fire-and-forget and cannot act on a failure, and an endpoint
 * that answered "rate limited" would only be telling an abusive caller
 * which of its requests landed. Real failures go to the server log.
 */
export async function POST(request: Request) {
  const noContent = new NextResponse(null, { status: 204 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noContent;
  }

  const entry = parseSearchLog(body);
  if (!entry) return noContent;

  // The owner's own browsing would otherwise be most of what the search
  // log describes. The client skips reporting for an editor too; this is
  // the copy of that rule a stale tab can't get around.
  const { isEditor } = await getAuthState();
  if (isEditor) return noContent;

  const ipHash = hashIp(clientIp(request.headers));

  try {
    if (!(await withinSearchLimit(ipHash))) return noContent;
  } catch (error: unknown) {
    // Fail closed: if the ledger can't be counted, don't append to it.
    console.error("search log limit check failed:", error);
    return noContent;
  }

  await logSearch(entry, ipHash);
  return noContent;
}
