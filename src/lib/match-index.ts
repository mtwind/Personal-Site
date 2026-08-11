import "server-only";

import { cache } from "react";

import {
  buildReferenceIndex,
  createReferenceResolver,
} from "@/lib/match-references";
import { buildSections } from "@/lib/match-tabs";
import { getProfileData } from "@/lib/profile-data";
import { getTeamMatchPage } from "@/lib/team-match-data";

/**
 * Everything the team-matching routes render from, resolved once per
 * request. The layout and the page beneath it both need the index — the
 * layout to draw the tab strip, the page to render an entry — and
 * `cache` keeps that to a single build rather than one per segment.
 */
export const getMatchContext = cache(async () => {
  const [page, profile] = await Promise.all([
    getTeamMatchPage(),
    getProfileData(),
  ]);

  if (!page) return null;

  const index = buildReferenceIndex(profile);

  return {
    page,
    profile,
    index,
    resolver: createReferenceResolver(index),
    sections: buildSections(page.sections),
    ownerName: profile.about?.name ?? "Matthew Wind",
    contactEmail: profile.contact?.email ?? null,
  };
});

export type MatchContext = NonNullable<
  Awaited<ReturnType<typeof getMatchContext>>
>;
