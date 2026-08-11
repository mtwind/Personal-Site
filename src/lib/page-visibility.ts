/**
 * How far a background note reaches.
 *
 * Client-safe on purpose: the admin form renders these labels, and
 * `knowledge-data` is `server-only` — importing the constants from
 * there would drag the database driver into the browser bundle.
 *
 * `private` is the one to be clear-eyed about. It means the note has no
 * page of its own, not that its contents are secret: the overview
 * answers from it, and an answer can quote it. Anything that shouldn't
 * be said out loud to a visitor belongs in `draft`.
 */
export const VISIBILITIES = ["draft", "private", "published"] as const;

export type NoteVisibility = (typeof VISIBILITIES)[number];

export const VISIBILITY_LABEL: Record<NoteVisibility, string> = {
  draft: "Draft",
  private: "Private",
  published: "Published",
};

export const VISIBILITY_HELP: Record<NoteVisibility, string> = {
  draft: "Parked. The AI can't see it and it has no page.",
  private: "The AI answers from it. No page, so answers can't link to it.",
  published: "The AI answers from it, and it has a page answers can link to.",
};
