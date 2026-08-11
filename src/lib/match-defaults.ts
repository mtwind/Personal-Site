/**
 * Seed content for the team-matching page.
 *
 * Deliberately free of imports: `scripts/seed-team-match.ts` pulls this
 * in directly, and a seeding script has no business dragging the icon
 * catalog and the whole reference index along with it.
 */
/**
 * The pages a new team-matching site opens with.
 *
 * Seeding these four gives it something to say and something to
 * feature — they are published pages, and the seed lists them on the
 * home page in this order. The editor renames, reorders, unpublishes or
 * adds to them from there.
 */
export const DEFAULT_PAGES: {
  title: string;
  body: string;
  showSkillRanking?: boolean;
}[] = [
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
    // The ranking underneath is derived from tagged work, not written.
    showSkillRanking: true,
  },
];
