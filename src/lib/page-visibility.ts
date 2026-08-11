/**
 * How far a page reaches.
 *
 * Client-safe on purpose: the admin form renders these labels, and
 * `pages-data` is `server-only` — importing the constants from there
 * would drag the database driver into the browser bundle.
 *
 * `private` is the one to be clear-eyed about. It means the page has no
 * URL of its own, not that its contents are secret: the overview answers
 * from it, and an answer can quote it. Anything that shouldn't be said
 * out loud to a visitor belongs in `draft`.
 */
export const VISIBILITIES = ["draft", "private", "published"] as const;

export type PageVisibility = (typeof VISIBILITIES)[number];

export const VISIBILITY_LABEL: Record<PageVisibility, string> = {
  draft: "Draft",
  private: "Private",
  published: "Published",
};

export const VISIBILITY_HELP: Record<PageVisibility, string> = {
  draft: "Parked. The AI can't see it and it isn't a page yet.",
  private: "The AI answers from it. No page, so answers can't link to it.",
  published:
    "A real page under the team-matching site: readable, linkable, citable, and featurable on the home page.",
};
