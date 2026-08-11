import "server-only";

import { cache } from "react";

import {
  buildReferenceIndex,
  createReferenceResolver,
} from "@/lib/match-references";
import { getGroundingNotes } from "@/lib/knowledge-data";
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
  const [page, profile, notes] = await Promise.all([
    getTeamMatchPage(),
    getProfileData(),
    getGroundingNotes(),
  ]);

  if (!page) return null;

  // Only published notes become pages; the rest ground answers alone.
  const index = buildReferenceIndex(profile, notes);

  return {
    page,
    profile,
    /** Private and published alike — the corpus, not the site map. */
    notes,
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
