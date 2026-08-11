/**
 * The page's width, as a class.
 *
 * Below the rail's breakpoint this is the single centred column the page
 * has always been. Above it the container widens by exactly the rail
 * plus its gap, so the reading column keeps its width and the ads take
 * the new space rather than stealing from the prose.
 *
 * The header, the tab strip and the content all share it, so nothing
 * above the page sits out of line with it once the page is wide. It
 * lives here rather than in the shell because the strip needs it too,
 * and the two modules already import in one direction.
 */
export const SHELL_WIDTH =
  "mx-auto w-full max-w-3xl min-[1100px]:max-w-[1100px]";
