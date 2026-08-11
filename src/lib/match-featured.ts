/**
 * The home page's results.
 *
 * The landing page used to carry prose of its own, in sections that were
 * pages in all but name. It now carries a *listing* instead: entries
 * picked out of everything the site already holds, shown the way a
 * search shows them. Nothing here is authored twice — an entry's own
 * title and headline describe it unless this listing overrides them.
 *
 * Stored as `{kind, id}` rather than by name, so renaming a project
 * doesn't quietly drop it from the home page; an id that no longer
 * resolves is skipped rather than rendered as a dead row.
 *
 * Pure and client-safe: the same shape the search results render from,
 * built without a query.
 */
import {
  KIND_SEGMENT,
  type MatchReferenceIndex,
  type ReferenceKind,
  type ReferenceTarget,
} from "@/lib/match-references";
import {
  pageJumpLinks,
  summaryIndex,
  summaryKey,
  type SearchJumpLink,
} from "@/lib/match-search";

/** One row as it is stored on the page. */
export interface FeaturedEntry {
  kind: ReferenceKind;
  id: string;
  /** Overrides the entry's own title in this listing. */
  title: string | null;
  /** Overrides the entry's own description in this listing. */
  snippet: string | null;
}

/** One row as it is rendered. */
export interface FeaturedResult {
  target: ReferenceTarget;
  title: string;
  /** The grey line above the link: a company, dates, a course. */
  note: string | null;
  /** The description under the link. */
  snippet: string;
  /** A page's own headings, offered as links into it. */
  jumps: SearchJumpLink[];
}

function isReferenceKind(value: string): value is ReferenceKind {
  return value in KIND_SEGMENT;
}

/**
 * Read a stored list back, dropping anything malformed.
 *
 * The column is JSON, so it is data from outside the type system every
 * time it is read — a kind that no longer exists has to fail here rather
 * than halfway through a render.
 */
export function parseFeatured(value: unknown): FeaturedEntry[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((row) => {
    if (typeof row !== "object" || row === null) return [];
    const { kind, id, title, snippet } = row as Record<string, unknown>;
    if (typeof kind !== "string" || !isReferenceKind(kind)) return [];
    if (typeof id !== "string" || id === "") return [];
    return [
      {
        kind,
        id,
        title: typeof title === "string" && title !== "" ? title : null,
        snippet:
          typeof snippet === "string" && snippet !== "" ? snippet : null,
      },
    ];
  });
}

/** One thing the home page could feature, as the picker lists it. */
export interface FeatureCandidate {
  kind: ReferenceKind;
  id: string;
  title: string;
  /** What tells two similarly-named entries apart in the list. */
  detail: string | null;
}

/**
 * Everything featurable, in the order the picker offers it.
 *
 * Pages first, then roles, then work: the listing is usually built out
 * of what was written for it, and the rest is there for the times a
 * particular project or course is the thing worth leading with.
 */
export function featureCandidates(
  index: MatchReferenceIndex,
): FeatureCandidate[] {
  return [
    ...index.pages.map((page) => ({
      kind: "page" as const,
      id: page.id,
      title: page.title,
      detail: page.hasDocument ? "Page · document" : "Page",
    })),
    ...index.experiences.map((experience) => ({
      kind: "experience" as const,
      id: experience.id,
      title: experience.title,
      detail: experience.companyName,
    })),
    ...index.projects.map((project) => ({
      kind: "project" as const,
      id: project.id,
      title: project.name,
      // Coursework says so, so a course project is findable as one.
      detail: project.courseLabel ?? project.dateRange,
    })),
    ...index.courses.map((course) => ({
      kind: "course" as const,
      id: course.id,
      title: `${course.courseNumber} · ${course.name}`,
      detail: course.semester,
    })),
    ...index.skills.map((skill) => ({
      kind: "skill" as const,
      id: skill.id,
      title: skill.name,
      detail: null,
    })),
  ];
}

/**
 * The rows to render, in the order they were arranged.
 *
 * Every row describes itself exactly as the search results would — same
 * titles, same notes, same descriptions — because featuring an entry and
 * finding it by searching are two routes to one claim. What the listing
 * adds is the order, and the option to say it differently here.
 */
export function resolveFeatured(
  index: MatchReferenceIndex,
  entries: FeaturedEntry[],
): FeaturedResult[] {
  const summaries = summaryIndex(index);

  return entries.flatMap((entry) => {
    const target = { kind: entry.kind, id: entry.id };
    const summary = summaries.get(summaryKey(target));
    // An entry deleted since it was featured drops out rather than
    // rendering as a row that leads nowhere.
    if (!summary) return [];

    const page =
      entry.kind === "page"
        ? index.pages.find((candidate) => candidate.id === entry.id)
        : undefined;

    return [
      {
        target,
        title: entry.title ?? summary.title,
        note: summary.note,
        snippet: entry.snippet ?? summary.headline,
        // With no query to match against, a page offers its opening
        // sections — the reader can go straight to the part they want.
        jumps: page ? pageJumpLinks(page, []) : [],
      },
    ];
  });
}
