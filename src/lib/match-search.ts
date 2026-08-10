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
import type {
  MatchReferenceIndex,
  ReferenceKind,
  ReferenceTarget,
} from "@/lib/match-references";

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

/** Split a query into scoreable terms. */
export function queryTerms(query: string): string[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((term) => term.replace(/^[.]+|[.]+$/g, ""))
    .filter((term) => term.length > 0);

  // Keep short technical names (C, Go, C++) but drop filler words.
  const kept = terms.filter((term) => !STOPWORDS.has(term));

  // An all-stopword query ("what does he do") still deserves an attempt.
  return kept.length > 0 ? [...new Set(kept)] : [...new Set(terms)];
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

const KIND_ORDER: Record<ReferenceKind, number> = {
  project: 0,
  experience: 1,
  skill: 2,
};

/**
 * Rank everything in the index against a query. Entries matching no term
 * are omitted; an empty query returns nothing rather than everything.
 */
export function searchReferences(
  index: MatchReferenceIndex,
  query: string,
): SearchHit[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];

  const skillNames = new Map(index.skills.map((s) => [s.id, s.name]));
  const hits: SearchHit[] = [];

  for (const project of index.projects) {
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
    if (score > 0) {
      hits.push({
        target: { kind: "project", id: project.id },
        title: project.name,
        headline: project.headline,
        note: project.courseLabel ?? project.dateRange,
        score,
        matched,
      });
    }
  }

  for (const experience of index.experiences) {
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
    if (score > 0) {
      hits.push({
        target: { kind: "experience", id: experience.id },
        title: experience.title,
        headline: experience.headline,
        note: [experience.companyName, experience.dateRange]
          .filter(Boolean)
          .join(" · "),
        score,
        matched,
      });
    }
  }

  for (const skill of index.skills) {
    const { score, matched } = scoreFields(
      [{ text: skill.name, weight: WEIGHT.skillName }],
      terms,
    );
    if (score > 0) {
      const usedBy =
        index.projects.filter((p) => p.skillIds.includes(skill.id)).length +
        index.experiences.filter((e) => e.skillIds.includes(skill.id)).length;
      hits.push({
        target: { kind: "skill", id: skill.id },
        title: skill.name,
        headline: "",
        note:
          usedBy > 0
            ? `Used across ${usedBy} ${usedBy === 1 ? "entry" : "entries"}`
            : null,
        score,
        matched,
      });
    }
  }

  return hits.sort(
    (a, b) =>
      b.score - a.score ||
      KIND_ORDER[a.target.kind] - KIND_ORDER[b.target.kind] ||
      a.title.localeCompare(b.title),
  );
}
