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

/**
 * How an entry names and situates itself, independent of any query.
 *
 * One definition, three readers: the search results, the home page's
 * featured listing, and the suggestion dropdown. They have to agree —
 * an entry that is called one thing in a suggestion and another in the
 * result it leads to reads as two different entries.
 */
export interface EntrySummary {
  target: ReferenceTarget;
  title: string;
  /** Company, dates, or course — whatever situates the entry. */
  note: string | null;
  /** One-line description, when the entry has one to give. */
  headline: string;
}

/** A ranked search result, ready to render and to open in the pane. */
export interface SearchHit extends EntrySummary {
  score: number;
  /** Query terms this entry actually matched, for result highlighting. */
  matched: string[];
  /** Which fields those terms hit — what "About this result" explains. */
  why: string[];
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

/**
 * What `kind:` accepts, in the spellings someone would actually type.
 *
 * Separate from `KIND_INTENT` on purpose: intent is a guess drawn from
 * how a question is phrased, and this is an instruction. "Jobs" hints;
 * `kind:jobs` insists.
 */
const KIND_FILTER: Record<string, ReferenceKind> = {
  class: "course",
  classes: "course",
  course: "course",
  courses: "course",
  coursework: "course",
  experience: "experience",
  experiences: "experience",
  job: "experience",
  jobs: "experience",
  note: "page",
  notes: "page",
  page: "page",
  pages: "page",
  project: "project",
  projects: "project",
  role: "experience",
  roles: "experience",
  skill: "skill",
  skills: "skill",
  tool: "skill",
  tools: "skill",
};

/** Every kind a filter can name, for the UI that offers them. */
export const FILTER_KINDS: ReferenceKind[] = [
  "page",
  "experience",
  "project",
  "course",
  "skill",
];

/** Base score for a pure-intent query, counted down to preserve order. */
const INTENT_BASE = 1000;

export interface ParsedQuery {
  /** Content terms to score against entry text, phrases included. */
  terms: string[];
  /** Quoted phrases, which an entry must contain to qualify at all. */
  phrases: string[];
  /** `-terms`, which disqualify an entry that contains them. */
  excluded: string[];
  /** The kind the phrasing *suggests*, which sorts rather than filters. */
  wantedKind: ReferenceKind | null;
  /** The kind `kind:` *demanded*, which filters outright. */
  requiredKind: ReferenceKind | null;
}

/** Split text into scoreable words, keeping short technical names. */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((term) => term.replace(/^[.]+|[.]+$/g, ""))
    .filter((term) => term.length > 0);
}

/**
 * Split a query into the kind it asks for and the terms to score.
 *
 * Operators come out first, because they are instructions about the
 * search rather than things to search for: a quoted phrase must appear,
 * a `-term` must not, and `kind:` narrows to one sort of entry. What is
 * left goes through the ordinary reading, where intent words are pulled
 * out rather than scored — in "what Rust projects has he built", the
 * answer is ranked on "rust", and "projects"/"built" only say which kind
 * of entry should win a tie.
 */
export function parseQuery(query: string): ParsedQuery {
  const phrases: string[] = [];
  // Quoted runs are lifted out whole so their spaces survive tokenising.
  const withoutPhrases = query.replace(/"([^"]*)"/g, (_, inner: string) => {
    const phrase = inner.trim().toLowerCase();
    if (phrase) phrases.push(phrase);
    return " ";
  });

  const excluded: string[] = [];
  let requiredKind: ReferenceKind | null = null;

  const rest = withoutPhrases
    .split(/\s+/)
    .filter((token) => {
      const lower = token.toLowerCase();

      const filter = /^(?:kind|type):(.+)$/.exec(lower);
      if (filter) {
        requiredKind = KIND_FILTER[filter[1]] ?? requiredKind;
        return false;
      }

      if (lower.startsWith("-") && lower.length > 1) {
        excluded.push(...words(lower.slice(1)));
        return false;
      }

      return true;
    })
    .join(" ");

  const plain = words(rest);

  // First intent word wins; a query rarely asks for two kinds at once.
  const wantedKind = plain.map((w) => KIND_INTENT[w]).find(Boolean) ?? null;

  const kept = plain.filter(
    (term) => !STOPWORDS.has(term) && !(term in KIND_INTENT),
  );

  const content = [...new Set([...phrases, ...kept])];
  if (content.length > 0) {
    return { terms: content, phrases, excluded, wantedKind, requiredKind };
  }

  // Nothing but filler and intent. With an intent — or a `kind:` — the
  // kind is the whole answer; without one, fall back to scoring the raw
  // words so a query of only stopwords ("what does he do") still returns
  // something.
  return {
    terms: wantedKind || requiredKind ? [] : [...new Set(plain)],
    phrases,
    excluded,
    wantedKind,
    requiredKind,
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
  /** How "About this result" names this field to a reader. */
  label: string;
}

function scoreFields(fields: Field[], terms: string[]) {
  let score = 0;
  const matched: string[] = [];
  const why = new Set<string>();

  for (const term of terms) {
    // A term scores once per entry, at its strongest field.
    let best = 0;
    let bestLabel = "";
    for (const field of fields) {
      const strength = hitStrength(field.text, term) * field.weight;
      if (strength > best) {
        best = strength;
        bestLabel = field.label;
      }
    }
    if (best > 0) {
      score += best;
      matched.push(term);
      why.add(bestLabel);
    }
  }

  // Reward entries matching more of the query over ones matching one term
  // very strongly — "c compiler" should beat a project merely named "C".
  if (matched.length > 1) score *= 1 + 0.25 * (matched.length - 1);

  return { score, matched, why: [...why] };
}

/**
 * Whether an entry survives the query's hard constraints.
 *
 * Phrases and exclusions are absolute rather than weighted: someone who
 * quotes a phrase is telling the search that a result without it is
 * wrong, and no amount of scoring elsewhere should talk them out of it.
 */
function qualifies(fields: Field[], parsed: ParsedQuery): boolean {
  if (parsed.phrases.length === 0 && parsed.excluded.length === 0) return true;

  const haystack = fields
    .map((field) => field.text)
    .join(" \n ")
    .toLowerCase();

  for (const phrase of parsed.phrases) {
    if (!haystack.includes(phrase)) return false;
  }
  for (const term of parsed.excluded) {
    if (hitStrength(haystack, term) > 0) return false;
  }
  return true;
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

/** How much of a page's prose stands in for a description. */
const LEAD_CHARS = 180;

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

/** `kind:id`, for looking a summary up without carrying the object. */
export function summaryKey(target: ReferenceTarget): string {
  return `${target.kind}:${target.id}`;
}

/**
 * How every entry in the index describes itself.
 *
 * In index order within each kind, and with the kinds in the order a
 * reader most likely wants them — which makes this list serviceable as
 * a site map wherever no better ordering exists.
 */
export function entrySummaries(index: MatchReferenceIndex): EntrySummary[] {
  const usageCount = (skillId: string): number =>
    index.projects.filter((p) => p.skillIds.includes(skillId)).length +
    index.experiences.filter((e) => e.skillIds.includes(skillId)).length +
    index.pages.filter((p) => p.skillIds.includes(skillId)).length;

  return [
    ...index.pages.map((page) => ({
      target: { kind: "page" as const, id: page.id },
      title: page.title,
      note: page.hasDocument ? "Document" : null,
      // A page has no authored headline; its own opening lines stand in.
      headline: markdownLeadText(page.body).slice(0, LEAD_CHARS),
    })),
    ...index.experiences.map((experience) => ({
      target: { kind: "experience" as const, id: experience.id },
      title: experience.title,
      note:
        [experience.companyName, experience.dateRange]
          .filter(Boolean)
          .join(" · ") || null,
      headline: experience.headline,
    })),
    ...index.projects.map((project) => ({
      target: { kind: "project" as const, id: project.id },
      title: project.name,
      note: project.courseLabel ?? project.dateRange,
      headline: project.headline,
    })),
    ...index.courses.map((course) => {
      const built = index.projects.filter(
        (project) => project.courseId === course.id,
      ).length;
      return {
        target: { kind: "course" as const, id: course.id },
        title: `${course.courseNumber} · ${course.name}`,
        note:
          [
            course.semester,
            built > 0 ? `${built} project${built === 1 ? "" : "s"}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
        headline: course.headline,
      };
    }),
    ...index.skills.map((skill) => {
      const used = usageCount(skill.id);
      return {
        target: { kind: "skill" as const, id: skill.id },
        title: skill.name,
        note:
          used > 0
            ? `Used across ${used} ${used === 1 ? "entry" : "entries"}`
            : null,
        headline: "",
      };
    }),
  ];
}

/** Summaries by `kind:id`, for callers holding only a target. */
export function summaryIndex(
  index: MatchReferenceIndex,
): Map<string, EntrySummary> {
  return new Map(
    entrySummaries(index).map((summary) => [summaryKey(summary.target), summary]),
  );
}

/**
 * Rank everything in the index against a query. Entries matching no term
 * are omitted; an empty query returns nothing rather than everything.
 */
export function searchReferences(
  index: MatchReferenceIndex,
  query: string,
): SearchHit[] {
  const parsed = parseQuery(query);
  const { terms, wantedKind, requiredKind } = parsed;
  if (terms.length === 0 && !wantedKind && !requiredKind) return [];

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
      const asked = wantedKind ?? requiredKind;
      return kind === asked ? INTENT_BASE - ordinal : 0;
    }
    return base;
  };

  const summaries = summaryIndex(index);
  const skillNames = new Map(index.skills.map((s) => [s.id, s.name]));
  const hits: SearchHit[] = [];

  /** Everything the loops below share: filter, score, collect. */
  const consider = (
    target: ReferenceTarget,
    ordinal: number,
    fields: Field[],
    jumpsFor: (matched: string[]) => SearchJumpLink[] = () => [],
  ) => {
    if (requiredKind && target.kind !== requiredKind) return;
    if (!qualifies(fields, parsed)) return;

    const { score, matched, why } = scoreFields(fields, terms);
    const ranked = rank(target.kind, score, ordinal);
    if (ranked <= 0) return;

    const summary = summaries.get(summaryKey(target));
    if (!summary) return;

    hits.push({ ...summary, score: ranked, matched, why, jumps: jumpsFor(matched) });
  };

  for (const [ordinal, project] of index.projects.entries()) {
    consider({ kind: "project", id: project.id }, ordinal, [
      { text: project.name, weight: WEIGHT.name, label: "its name" },
      {
        text: project.headline,
        weight: WEIGHT.headline,
        label: "its description",
      },
      {
        text: project.courseLabel ?? "",
        weight: WEIGHT.course,
        label: "the course it came from",
      },
      ...project.bullets.map((text) => ({
        text,
        weight: WEIGHT.bullet,
        label: "what it says it did",
      })),
      ...project.skillIds.map((id) => ({
        text: skillNames.get(id) ?? "",
        weight: WEIGHT.skill,
        label: "the tools it used",
      })),
    ]);
  }

  for (const [ordinal, experience] of index.experiences.entries()) {
    consider({ kind: "experience", id: experience.id }, ordinal, [
      { text: experience.title, weight: WEIGHT.name, label: "the job title" },
      {
        text: experience.companyName,
        weight: WEIGHT.company,
        label: "the company",
      },
      {
        text: experience.headline,
        weight: WEIGHT.headline,
        label: "its description",
      },
      ...experience.bullets.map((text) => ({
        text,
        weight: WEIGHT.bullet,
        label: "what it says he did",
      })),
      ...experience.skillIds.map((id) => ({
        text: skillNames.get(id) ?? "",
        weight: WEIGHT.skill,
        label: "the tools he used",
      })),
    ]);
  }

  for (const [ordinal, course] of index.courses.entries()) {
    const projectNames = index.projects
      .filter((project) => project.courseId === course.id)
      .map((project) => project.name);

    consider({ kind: "course", id: course.id }, ordinal, [
      { text: course.name, weight: WEIGHT.name, label: "the course name" },
      {
        text: course.courseNumber,
        weight: WEIGHT.name,
        label: "the course number",
      },
      {
        text: course.headline,
        weight: WEIGHT.headline,
        label: "its description",
      },
      ...projectNames.map((text) => ({
        text,
        weight: WEIGHT.bullet,
        label: "the projects it produced",
      })),
    ]);
  }

  for (const [ordinal, page] of index.pages.entries()) {
    // Markdown marks are punctuation to a keyword search: strip them so
    // "**Python**" matches "python" and a heading's `##` scores nothing.
    const prose = markdownToPlainText(page.body);

    consider(
      { kind: "page", id: page.id },
      ordinal,
      [
        { text: page.title, weight: WEIGHT.name, label: "its title" },
        ...page.headings.map((heading) => ({
          text: heading.text,
          weight: WEIGHT.heading,
          label: "a section heading",
        })),
        { text: prose, weight: WEIGHT.bullet, label: "the page text" },
        ...page.skillIds.map((id) => ({
          text: skillNames.get(id) ?? "",
          weight: WEIGHT.skill,
          label: "the tools it mentions",
        })),
      ],
      (matched) => pageJumpLinks(page, matched),
    );
  }

  for (const [ordinal, skill] of index.skills.entries()) {
    consider({ kind: "skill", id: skill.id }, ordinal, [
      { text: skill.name, weight: WEIGHT.skillName, label: "the skill name" },
    ]);
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

/** A search, and how long it took to run. */
export interface TimedSearch {
  hits: SearchHit[];
  /** Wall-clock seconds, as the results page reports them. */
  seconds: number;
}

/**
 * Run a search and time it.
 *
 * The number under the search field is a real measurement rather than a
 * flourish, which is only defensible if something actually measures it —
 * and the module that does the work is the one that can.
 */
export function timedSearch(
  index: MatchReferenceIndex,
  query: string,
): TimedSearch {
  const started = performance.now();
  const hits = query.trim() === "" ? [] : searchReferences(index, query);
  return { hits, seconds: (performance.now() - started) / 1000 };
}

/* ───────────────────────────── suggestions ──────────────────────────── */

/** How well a draft matches a title, lower being better. */
function suggestionRank(title: string, draft: string): number {
  const haystack = title.toLowerCase();
  const at = haystack.indexOf(draft);
  if (at === -1) return Number.POSITIVE_INFINITY;
  if (at === 0) return 0;
  // A match at a word boundary reads as a completion; one mid-word doesn't.
  return /[^a-z0-9]/.test(haystack[at - 1]) ? 1 : 2;
}

/**
 * Entries whose titles complete what is being typed.
 *
 * Titles only, deliberately. A suggestion list is a claim that the row
 * *is* what you were about to type, and matching on body text produces
 * rows that look like non-sequiturs — that job is the results page's,
 * one keystroke later.
 */
export function suggestEntries(
  index: MatchReferenceIndex,
  draft: string,
  limit: number,
): EntrySummary[] {
  const needle = draft.trim().toLowerCase();
  if (needle === "") return [];

  return entrySummaries(index)
    .map((summary) => ({ summary, rank: suggestionRank(summary.title, needle) }))
    .filter((row) => Number.isFinite(row.rank))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        KIND_ORDER[a.summary.target.kind] - KIND_ORDER[b.summary.target.kind] ||
        a.summary.title.length - b.summary.title.length ||
        a.summary.title.localeCompare(b.summary.title),
    )
    .slice(0, limit)
    .map((row) => row.summary);
}

/* ──────────────────────────── related searches ──────────────────────── */

/** How many related searches to offer under the results. */
const RELATED_LIMIT = 6;

/**
 * Searches worth running next, built from what the top results are made
 * of rather than from a list someone maintains by hand.
 *
 * Google's related searches are lateral moves — same subject, different
 * angle. The same three angles work here: the skills the winning entries
 * are tagged with, the companies behind them, and the query itself
 * pointed at a different kind of entry.
 */
export function relatedSearches(
  index: MatchReferenceIndex,
  query: string,
  hits: SearchHit[],
): string[] {
  const parsed = parseQuery(query);
  const seen = new Set([query.trim().toLowerCase()]);
  const out: string[] = [];

  const offer = (candidate: string) => {
    const key = candidate.trim().toLowerCase();
    if (key === "" || seen.has(key) || out.length >= RELATED_LIMIT) return;
    seen.add(key);
    out.push(candidate);
  };

  const skillNames = new Map(index.skills.map((s) => [s.id, s.name]));
  const top = hits.slice(0, 4);

  // The subject, aimed at a different kind of entry.
  const subject = parsed.terms.find((term) => !term.includes(" "));
  if (subject) {
    if (parsed.wantedKind !== "project") offer(`${subject} projects`);
    if (parsed.wantedKind !== "experience") offer(`${subject} experience`);
  }

  for (const hit of top) {
    if (hit.target.kind === "experience") {
      const experience = index.experiences.find((e) => e.id === hit.target.id);
      if (experience) offer(experience.companyName);
    }
    if (hit.target.kind === "project") {
      const project = index.projects.find((p) => p.id === hit.target.id);
      for (const id of project?.skillIds.slice(0, 2) ?? []) {
        const name = skillNames.get(id);
        if (name && !parsed.terms.includes(name.toLowerCase())) offer(name);
      }
    }
    if (hit.target.kind === "page") {
      const page = index.pages.find((p) => p.id === hit.target.id);
      // A page's own headings are the questions it already answers.
      for (const heading of page?.headings.slice(0, 2) ?? []) {
        offer(heading.text);
      }
    }
  }

  return out;
}
