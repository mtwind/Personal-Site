/**
 * Keyword search over the team-matching reference index.
 *
 * Runs entirely on the client against the index the page already ships,
 * so results are instant and cost nothing. It is also the floor the
 * feature degrades to: when the AI overview is unavailable — no API key,
 * rate limited, request failed — the reader still gets real results.
 *
 * Pure and serializable-in/serializable-out, so it can be unit-checked
 * without a browser or a database.
 */
import {
  markdownLeadText,
  markdownSectionText,
  markdownToPlainText,
} from "@/lib/match-markdown";
import type {
  MatchReferenceIndex,
  ReferenceKind,
  ReferencePage,
  ReferenceTarget,
} from "@/lib/match-references";

/**
 * A heading worth offering under a result, the way Google offers the
 * sections of a long page beneath its link.
 */
export interface SearchJumpLink {
  /** Anchor id on the entry's page. */
  anchor: string;
  label: string;
  /** The prose under that heading, trimmed to a snippet. */
  snippet: string;
}

/** A ranked search result, ready to render and to open in the pane. */
export interface SearchHit {
  target: ReferenceTarget;
  title: string;
  /** One-line description, when the entry has an authored headline. */
  headline: string;
  /** Company, dates, or course — whatever situates the entry. */
  note: string | null;
  score: number;
  /** Query terms this entry actually matched, for result highlighting. */
  matched: string[];
  /** Sections of the entry the reader can land on directly. */
  jumps: SearchJumpLink[];
}

/**
 * Field weights. A query term hitting a name should outrank the same term
 * buried in a bullet, or every long entry wins on surface area alone.
 */
const WEIGHT = {
  name: 6,
  company: 5,
  skillName: 8,
  headline: 3,
  /** A page's own headings: what its author called that part of it. */
  heading: 4,
  course: 2,
  skill: 2,
  bullet: 1,
} as const;

/** Multipliers for how squarely a term hit a field. */
const WHOLE_WORD = 1;
const PREFIX = 0.7;
const SUBSTRING = 0.4;

/**
 * Words carrying no signal in a query about one person's profile. "He",
 * "his" and "matthew" are here because visitors phrase questions as
 * "what has he built in C?" — the subject is never in doubt.
 */
const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "been",
  "but",
  "by",
  "can",
  "did",
  "do",
  "does",
  "for",
  "from",
  "had",
  "has",
  "have",
  "he",
  "her",
  "him",
  "his",
  "how",
  "in",
  "is",
  "it",
  "its",
  "matthew",
  "me",
  "much",
  "of",
  "on",
  "or",
  "she",
  "that",
  "the",
  "their",
  "them",
  "they",
  "this",
  "to",
  "was",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "with",
  "wind",
  "you",
  "your",
]);

/**
 * Words that name a *kind* of entry rather than content to match against.
 *
 * "Where has he worked" is a question about jobs. Scored as keywords it
 * finds whichever bullet happens to contain the string "worked", which is
 * how a query about employment ends up returning projects. Recognising the
 * intent and answering with the right kind of entry is the whole fix.
 */
const KIND_INTENT: Record<string, ReferenceKind> = {
  career: "experience",
  companies: "experience",
  company: "experience",
  employer: "experience",
  employers: "experience",
  employment: "experience",
  experience: "experience",
  experiences: "experience",
  intern: "experience",
  internship: "experience",
  internships: "experience",
  job: "experience",
  jobs: "experience",
  position: "experience",
  positions: "experience",
  role: "experience",
  roles: "experience",
  work: "experience",
  worked: "experience",
  working: "experience",

  background: "page",
  culture: "page",
  interview: "page",
  interviews: "page",
  interviewed: "page",
  matching: "page",
  prefer: "page",
  preference: "page",
  preferences: "page",
  relocate: "page",
  relocation: "page",
  visa: "page",
  want: "page",
  wants: "page",

  class: "course",
  classes: "course",
  course: "course",
  courses: "course",
  coursework: "course",
  studied: "course",
  studying: "course",
  took: "course",

  build: "project",
  built: "project",
  project: "project",
  projects: "project",
  ship: "project",
  shipped: "project",

  framework: "skill",
  frameworks: "skill",
  language: "skill",
  languages: "skill",
  skill: "skill",
  skills: "skill",
  stack: "skill",
  tech: "skill",
  technologies: "skill",
  technology: "skill",
  tool: "skill",
  tools: "skill",
};

/** Base score for a pure-intent query, counted down to preserve order. */
const INTENT_BASE = 1000;

export interface ParsedQuery {
  /** Content terms to score against entry text. */
  terms: string[];
  /** The kind the phrasing asks for, when the phrasing asks for one. */
  wantedKind: ReferenceKind | null;
}

/**
 * Split a query into the kind it asks for and the terms to score.
 *
 * Intent words are pulled out of the term list rather than scored: in
 * "what Rust projects has he built", the answer is ranked on "rust", and
 * "projects"/"built" say which kind of entry should win a tie.
 */
export function parseQuery(query: string): ParsedQuery {
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((term) => term.replace(/^[.]+|[.]+$/g, ""))
    .filter((term) => term.length > 0);

  // First intent word wins; a query rarely asks for two kinds at once.
  const wantedKind = words.map((w) => KIND_INTENT[w]).find(Boolean) ?? null;

  // Keep short technical names (C, Go, C++) but drop filler and intent words.
  const kept = words.filter(
    (term) => !STOPWORDS.has(term) && !(term in KIND_INTENT),
  );
  if (kept.length > 0) return { terms: [...new Set(kept)], wantedKind };

  // Nothing but filler and intent. With an intent, the kind is the whole
  // answer; without one, fall back to scoring the raw words so a query of
  // only stopwords ("what does he do") still returns something.
  return {
    terms: wantedKind ? [] : [...new Set(words)],
    wantedKind,
  };
}

/** Split a query into scoreable terms. */
export function queryTerms(query: string): string[] {
  return parseQuery(query).terms;
}

/**
 * How squarely `term` hits `text`, as a multiplier of the field weight.
 *
 * Short terms are held to a stricter standard than long ones, because a
 * one- or two-letter substring hits almost everything: searching "C"
 * would otherwise return TypeScript (the c in "TypeScript") and anything
 * whose prose happens to contain "CSS".
 */
function hitStrength(text: string, term: string): number {
  if (!text) return 0;
  const haystack = text.toLowerCase();

  // Scan every occurrence, not just the first — the strongest one wins.
  let best = 0;
  for (let at = haystack.indexOf(term); at !== -1; ) {
    const before = at === 0 ? "" : haystack[at - 1];
    const after = haystack[at + term.length] ?? "";
    const wordStart = at === 0 || !/[a-z0-9]/.test(before);
    const wordEnd = after === "" || !/[a-z0-9]/.test(after);

    if (wordStart && wordEnd) return WHOLE_WORD; // can't do better
    if (wordStart && term.length >= 2) best = Math.max(best, PREFIX);
    else if (term.length >= 3) best = Math.max(best, SUBSTRING);

    at = haystack.indexOf(term, at + 1);
  }
  return best;
}

/**
 * Character ranges in `text` that `terms` match, under exactly the same
 * boundary rules scoring uses. Snippet highlighting reads from this rather
 * than running its own regex, so a bolded word is always a word that
 * actually contributed to the result's rank — otherwise a one-letter query
 * emboldens every stray letter in the sentence.
 *
 * Ranges are non-overlapping and in order, preferring the longest match at
 * any given position.
 */
export function matchRanges(text: string, terms: string[]): [number, number][] {
  const haystack = text.toLowerCase();
  const found: [number, number][] = [];

  for (const term of terms) {
    for (let at = haystack.indexOf(term); at !== -1; ) {
      const before = at === 0 ? "" : haystack[at - 1];
      const after = haystack[at + term.length] ?? "";
      const wordStart = at === 0 || !/[a-z0-9]/.test(before);
      const wordEnd = after === "" || !/[a-z0-9]/.test(after);

      const qualifies =
        (wordStart && wordEnd) ||
        (wordStart && term.length >= 2) ||
        term.length >= 3;
      if (qualifies) found.push([at, at + term.length]);

      at = haystack.indexOf(term, at + 1);
    }
  }

  // Longest-first at each start, then drop anything overlapping a keeper.
  found.sort((a, b) => a[0] - b[0] || b[1] - b[0] - (a[1] - a[0]));
  const ranges: [number, number][] = [];
  let cursor = 0;
  for (const [start, end] of found) {
    if (start < cursor) continue;
    ranges.push([start, end]);
    cursor = end;
  }
  return ranges;
}

/** One weighted haystack belonging to an entry. */
interface Field {
  text: string;
  weight: number;
}

function scoreFields(fields: Field[], terms: string[]) {
  let score = 0;
  const matched: string[] = [];

  for (const term of terms) {
    // A term scores once per entry, at its strongest field.
    let best = 0;
    for (const field of fields) {
      best = Math.max(best, hitStrength(field.text, term) * field.weight);
    }
    if (best > 0) {
      score += best;
      matched.push(term);
    }
  }

  // Reward entries matching more of the query over ones matching one term
  // very strongly — "c compiler" should beat a project merely named "C".
  if (matched.length > 1) score *= 1 + 0.25 * (matched.length - 1);

  return { score, matched };
}

/**
 * Tie-break order. Experience first: for a recruiter reading a profile,
 * a role carries more weight than a project that scored the same.
 */
const KIND_ORDER: Record<ReferenceKind, number> = {
  page: 0,
  experience: 1,
  project: 2,
  course: 3,
  skill: 4,
};

/** How many sections a single result offers to jump to. */
const JUMP_LIMIT = 4;

/** How much of a section's prose the jump link shows. */
const JUMP_SNIPPET_CHARS = 110;

/**
 * The sections of a page worth listing under its result.
 *
 * Headings the query actually hit come first and alone: someone who
 * searched "visa" wants the visa section, not a table of contents. With
 * no heading matched — which is every featured result on the home page,
 * where there is no query at all — the page's opening sections stand in.
 * That is the same bargain Google's sitelinks make: a way into a long
 * page rather than a claim about the query.
 */
export function pageJumpLinks(
  page: ReferencePage,
  terms: string[],
): SearchJumpLink[] {
  if (page.headings.length === 0) return [];

  const sections = page.headings.map((heading, index) => ({
    heading,
    index,
    hit: terms.some((term) => hitStrength(heading.text, term) > 0),
  }));

  const matched = sections.filter((section) => section.hit);
  const chosen = (matched.length > 0 ? matched : sections).slice(0, JUMP_LIMIT);

  return chosen.map(({ heading, index }) => {
    const prose = markdownSectionText(page.body, index);
    return {
      anchor: heading.id,
      label: heading.text,
      snippet:
        prose.length > JUMP_SNIPPET_CHARS
          ? `${prose.slice(0, JUMP_SNIPPET_CHARS).trimEnd()}…`
          : prose,
    };
  });
}

/**
 * Rank everything in the index against a query. Entries matching no term
 * are omitted; an empty query returns nothing rather than everything.
 */
export function searchReferences(
  index: MatchReferenceIndex,
  query: string,
): SearchHit[] {
  const { terms, wantedKind } = parseQuery(query);
  if (terms.length === 0 && !wantedKind) return [];

  /**
   * Score an entry, handling the pure-intent case.
   *
   * With no content terms the query is pure intent ("where has he
   * worked"), so every entry of that kind is an answer and the profile's
   * own ordering is the ranking. Otherwise the ordinary field score
   * stands; the intent is applied when sorting, not here.
   */
  const rank = (kind: ReferenceKind, base: number, ordinal: number): number => {
    if (terms.length === 0) {
      return kind === wantedKind ? INTENT_BASE - ordinal : 0;
    }
    return base;
  };

  const skillNames = new Map(index.skills.map((s) => [s.id, s.name]));
  const hits: SearchHit[] = [];

  for (const [ordinal, project] of index.projects.entries()) {
    const fields: Field[] = [
      { text: project.name, weight: WEIGHT.name },
      { text: project.headline, weight: WEIGHT.headline },
      { text: project.courseLabel ?? "", weight: WEIGHT.course },
      ...project.bullets.map((text) => ({ text, weight: WEIGHT.bullet })),
      ...project.skillIds.map((id) => ({
        text: skillNames.get(id) ?? "",
        weight: WEIGHT.skill,
      })),
    ];
    const { score, matched } = scoreFields(fields, terms);
    const ranked = rank("project", score, ordinal);
    if (ranked > 0) {
      hits.push({
        target: { kind: "project", id: project.id },
        title: project.name,
        headline: project.headline,
        note: project.courseLabel ?? project.dateRange,
        score: ranked,
        matched,
        jumps: [],
      });
    }
  }

  for (const [ordinal, experience] of index.experiences.entries()) {
    const fields: Field[] = [
      { text: experience.title, weight: WEIGHT.name },
      { text: experience.companyName, weight: WEIGHT.company },
      { text: experience.headline, weight: WEIGHT.headline },
      ...experience.bullets.map((text) => ({ text, weight: WEIGHT.bullet })),
      ...experience.skillIds.map((id) => ({
        text: skillNames.get(id) ?? "",
        weight: WEIGHT.skill,
      })),
    ];
    const { score, matched } = scoreFields(fields, terms);
    const ranked = rank("experience", score, ordinal);
    if (ranked > 0) {
      hits.push({
        target: { kind: "experience", id: experience.id },
        title: experience.title,
        headline: experience.headline,
        note: [experience.companyName, experience.dateRange]
          .filter(Boolean)
          .join(" · "),
        score: ranked,
        matched,
        jumps: [],
      });
    }
  }

  for (const [ordinal, course] of index.courses.entries()) {
    const projectNames = index.projects
      .filter((project) => project.courseId === course.id)
      .map((project) => project.name);
    const fields: Field[] = [
      { text: course.name, weight: WEIGHT.name },
      { text: course.courseNumber, weight: WEIGHT.name },
      { text: course.headline, weight: WEIGHT.headline },
      ...projectNames.map((text) => ({ text, weight: WEIGHT.bullet })),
    ];
    const { score, matched } = scoreFields(fields, terms);
    const ranked = rank("course", score, ordinal);
    if (ranked > 0) {
      hits.push({
        target: { kind: "course", id: course.id },
        title: `${course.courseNumber} · ${course.name}`,
        headline: course.headline,
        note: [
          course.semester,
          projectNames.length > 0
            ? `${projectNames.length} project${projectNames.length === 1 ? "" : "s"}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ") || null,
        score: ranked,
        matched,
        jumps: [],
      });
    }
  }

  for (const [ordinal, page] of index.pages.entries()) {
    // Markdown marks are punctuation to a keyword search: strip them so
    // "**Python**" matches "python" and a heading's `##` scores nothing.
    const prose = markdownToPlainText(page.body);
    const fields: Field[] = [
      { text: page.title, weight: WEIGHT.name },
      ...page.headings.map((heading) => ({
        text: heading.text,
        weight: WEIGHT.heading,
      })),
      { text: prose, weight: WEIGHT.bullet },
      ...page.skillIds.map((id) => ({
        text: skillNames.get(id) ?? "",
        weight: WEIGHT.skill,
      })),
    ];
    const { score, matched } = scoreFields(fields, terms);
    const ranked = rank("page", score, ordinal);
    if (ranked > 0) {
      hits.push({
        target: { kind: "page", id: page.id },
        title: page.title,
        // The page's own lead stands in for a headline it doesn't have;
        // its headings are listed under the result rather than spliced
        // into the description.
        headline: markdownLeadText(page.body).slice(0, 180),
        note: page.hasDocument ? "Document" : null,
        score: ranked,
        matched,
        jumps: pageJumpLinks(page, matched),
      });
    }
  }

  for (const [ordinal, skill] of index.skills.entries()) {
    const { score, matched } = scoreFields(
      [{ text: skill.name, weight: WEIGHT.skillName }],
      terms,
    );
    const ranked = rank("skill", score, ordinal);
    if (ranked > 0) {
      const usedBy =
        index.projects.filter((p) => p.skillIds.includes(skill.id)).length +
        index.experiences.filter((e) => e.skillIds.includes(skill.id)).length +
        index.pages.filter((p) => p.skillIds.includes(skill.id)).length;
      hits.push({
        target: { kind: "skill", id: skill.id },
        title: skill.name,
        headline: "",
        note:
          usedBy > 0
            ? `Used across ${usedBy} ${usedBy === 1 ? "entry" : "entries"}`
            : null,
        score: ranked,
        matched,
        jumps: [],
      });
    }
  }

  // When the query names a kind, that kind comes first outright rather
  // than competing on score. "What Rust projects has he built" should
  // lead with projects, even though the skill named Rust scores higher
  // on the word "Rust" than any project that merely uses it.
  const asked = (hit: SearchHit) => (hit.target.kind === wantedKind ? 0 : 1);

  return hits.sort(
    (a, b) =>
      asked(a) - asked(b) ||
      b.score - a.score ||
      KIND_ORDER[a.target.kind] - KIND_ORDER[b.target.kind] ||
      a.title.localeCompare(b.title),
  );
}
