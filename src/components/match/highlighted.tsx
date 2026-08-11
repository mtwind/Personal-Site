"use client";

import { matchRanges } from "@/lib/match-search";

/**
 * Bold the query terms inside a snippet, the way search results do.
 *
 * Ranges come from the search module rather than a regex of its own, so
 * highlighting and ranking agree on what counts as a match — a word is
 * emboldened only if it actually contributed to the result's rank.
 */
export function Highlighted({
  text,
  terms,
}: {
  text: string;
  terms: string[];
}) {
  const ranges = terms.length > 0 ? matchRanges(text, terms) : [];
  if (ranges.length === 0) return <>{text}</>;

  const pieces: React.ReactNode[] = [];
  let cursor = 0;

  ranges.forEach(([start, end], index) => {
    if (start > cursor) pieces.push(text.slice(cursor, start));
    pieces.push(
      <mark key={index} className="bg-transparent font-bold text-[#4d5156]">
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });
  if (cursor < text.length) pieces.push(text.slice(cursor));

  return <>{pieces}</>;
}
