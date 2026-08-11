import { NextResponse } from "next/server";

import { logAdEvents, parseAdEvents, withinEventLimit } from "@/lib/ad-events";
import { clientIp, hashIp } from "@/lib/ask-limits";
import { getAuthState } from "@/lib/auth";

/**
 * Where the ad slots report what they showed and what was clicked.
 *
 * Every outcome is 204. The caller is a fire-and-forget beacon that
 * cannot act on a failure, and an endpoint that answered "rate limited"
 * or "unknown ad" would only be telling an abusive caller which of its
 * requests landed. Real failures go to the server log instead.
 */
export async function POST(request: Request) {
  const noContent = new NextResponse(null, { status: 204 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noContent;
  }

  const events = parseAdEvents(
    body && typeof body === "object"
      ? (body as { events?: unknown }).events
      : null,
  );
  if (events.length === 0) return noContent;

  // The owner browsing their own page would otherwise be most of the
  // traffic these numbers describe. The client skips reporting for an
  // editor too; this is the copy of that rule that a stale tab can't
  // get around.
  const { isEditor } = await getAuthState();
  if (isEditor) return noContent;

  const ipHash = hashIp(clientIp(request.headers));

  try {
    if (!(await withinEventLimit(ipHash))) return noContent;
  } catch (error: unknown) {
    // Fail closed: if the ledger can't be counted, don't append to it.
    console.error("ad event limit check failed:", error);
    return noContent;
  }

  await logAdEvents(events, ipHash);
  return noContent;
}
