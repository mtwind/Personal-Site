/**
 * Which authored questions belong under a given search.
 *
 * Pure and client-safe: the whole list ships with the page, and the
 * browser picks from it. A handful of short questions costs less to send
 * than a round trip would cost to ask which ones to send.
 */
import type { RelatedQuestion } from "@/lib/questions-data";
import { queryTerms } from "@/lib/match-search";

/** How many questions the block offers at once. */
export const ASK_LIMIT = 4;

/**
 * Questions for a query, best fit first.
 *
 * A question tagged with a term the search used comes first; the rest
 * fill the block in authored order. That fallback is deliberate — Google
 * shows "people also ask" on almost every search, and a block that only
 * appears on the handful of queries someone thought to tag would look
 * like a bug rather than a feature.
 */
export function selectQuestions(
  questions: RelatedQuestion[],
  query: string,
  limit: number = ASK_LIMIT,
): RelatedQuestion[] {
  const terms = queryTerms(query);

  const relevance = (entry: RelatedQuestion): number => {
    if (terms.length === 0) return 0;

    const keywords = entry.keywords.map((word) => word.toLowerCase());
    const tagged = terms.some((term) =>
      keywords.some(
        (keyword) => keyword.includes(term) || term.includes(keyword),
      ),
    );
    if (tagged) return 2;

    // The question's own words count for something too: someone
    // searching "visa" should meet the question that says "visa".
    const text = entry.question.toLowerCase();
    return terms.some((term) => text.includes(term)) ? 1 : 0;
  };

  return questions
    .map((entry, order) => ({ entry, order, score: relevance(entry) }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((row) => row.entry);
}
