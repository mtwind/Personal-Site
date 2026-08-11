import "server-only";

import { cache } from "react";

import { parseFeatured } from "@/lib/match-featured";
import {
  buildReferenceIndex,
  createReferenceResolver,
} from "@/lib/match-references";
import { getGroundingPages } from "@/lib/pages-data";
import { getProfileData } from "@/lib/profile-data";
import { getTeamMatchPage } from "@/lib/team-match-data";

/**
 * Everything the team-matching routes render from, resolved once per
 * request. The layout and the page beneath it both need the index — the
 * layout to draw the tab strip, the page to render an entry — and
 * `cache` keeps that to a single build rather than one per segment.
 */
export const getMatchContext = cache(async () => {
  const [page, profile, sitePages] = await Promise.all([
    getTeamMatchPage(),
    getProfileData(),
    getGroundingPages(),
  ]);

  if (!page) return null;

  // Only published pages become routes; the rest ground answers alone.
  const index = buildReferenceIndex(profile, sitePages);

  return {
    page,
    profile,
    /** Private and published alike — the corpus, not the site map. */
    sitePages,
    index,
    resolver: createReferenceResolver(index),
    featured: parseFeatured(page.featured),
    ownerName: profile.about?.name ?? "Matthew Wind",
    contactEmail: profile.contact?.email ?? null,
  };
});

export type MatchContext = NonNullable<
  Awaited<ReturnType<typeof getMatchContext>>
>;
