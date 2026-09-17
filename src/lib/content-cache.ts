import "server-only";

import { unstable_cache } from "next/cache";

import type { Serialized } from "@/lib/serialized";

/**
 * The one tag every cached read of site content carries.
 *
 * All of it changes through the same door — an editor saving a form —
 * so one tag is enough: every mutation expires it, and the next request
 * reads fresh rows. Finer tags would only mean a mutation forgetting one.
 */
export const CONTENT_TAG = "site-content";

/**
 * How long a cached read may serve without being re-read from the
 * database. Edits made through the app expire the cache immediately; this
 * is the ceiling for anything else — a script writing straight to the
 * database, or an instance that never saw the mutation.
 */
const MAX_AGE_SECONDS = 60;

/**
 * Cache a content read across requests.
 *
 * The profile, the hidden page, the grounding pages and the ads are read
 * by every route under the team-matching page, and until now every
 * navigation re-ran the lot: a dozen queries, in series over a pool of
 * one connection, before a tab could switch. The content changes when the
 * owner edits it and at no other time, so it is read once and reused
 * until a mutation says otherwise.
 *
 * Wrap the result in React's `cache` as well where a layout and its
 * pages share it within one request.
 */
export function cachedContent<T>(
  key: string,
  load: () => Promise<T>,
): () => Promise<Serialized<T>> {
  return unstable_cache(load, [key], {
    tags: [CONTENT_TAG],
    revalidate: MAX_AGE_SECONDS,
  }) as () => Promise<Serialized<T>>;
}
