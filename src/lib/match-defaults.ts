/**
 * Seed content for the team-matching page.
 *
 * Deliberately free of imports: `scripts/seed-team-match.ts` pulls this
 * in directly, and a seeding script has no business dragging the icon
 * catalog and the whole reference index along with it.
 */
/**
 * The pages the team-matching page opens with.
 *
 * Sections *are* pages here, so this is the site map: seeding these four
 * gives a new page its structure, and the editor renames, reorders or
 * adds to them from there. The last title is what
 * `SKILLS_SECTION_SLUG` points at — keep them in step.
 */
export const DEFAULT_SECTIONS: { title: string; body: string }[] = [
  {
    title: "My Interview Process",
    body: "Where I am in Google's process, who I've spoken to, and what each round covered.",
  },
  {
    title: "My Team Matching Experience",
    body: "What team matching has looked like so far — conversations I've had, and what I took from them.",
  },
  {
    title: "Teams I Want to Work On",
    body: "The problem spaces, products and kinds of engineering I'd do my best work in.",
  },
  {
    title: "My Strongest Skills",
    body: "What I reach for first, and what I've actually shipped with it.",
  },
];
