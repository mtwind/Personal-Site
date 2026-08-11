"use client";

import Link from "next/link";

import type { SearchJumpLink } from "@/lib/match-search";
import { KIND_LABEL, type ReferenceTarget } from "@/lib/match-references";
import { targetHref } from "@/lib/match-tabs";
import { MatchRichText } from "./match-rich-text";
import { useMatch } from "./match-shell";

interface ResultRowProps {
  target: ReferenceTarget;
  title: string;
  /** The grey line above the link. */
  note: string | null;
  /** The description under the link. */
  snippet: string;
  /** Sections of the entry the reader can land on directly. */
  jumps?: SearchJumpLink[];
  /** Query terms to embolden, when this row came from a search. */
  terms?: string[];
}

/**
 * One organic result, as Google draws one: the kind and its context in
 * small grey caps, the title as a blue link, a description, and — for a
 * page with headings — links into its sections.
 *
 * The home page and the search results both render this, which is the
 * point: featuring an entry on the landing page and finding it by
 * searching should produce the same row, because they are the same
 * claim about the same thing.
 *
 * The row is not itself a link. The jump links live inside it, and an
 * anchor inside an anchor is invalid HTML — so the title carries the
 * link and the surrounding block only carries the hover.
 *
 * Descriptions run through the prose renderer, so a description written
 * by hand for the home page can name a project or a role and have it
 * link there — while a description lifted from an entry's own headline,
 * which carries no tokens, comes out as the plain sentence it is.
 */
export function ResultRow({
  target,
  title,
  note,
  snippet,
  jumps = [],
  terms = [],
}: ResultRowProps) {
  const { base, resolver } = useMatch();
  const href = targetHref(base, resolver, target);
  if (!href) return null;

  return (
    <div className="rounded-xl px-3.5 py-3 transition-colors hover:bg-white">
      <p className="text-[11px] tracking-[0.14em] text-[#5f6368] uppercase">
        {KIND_LABEL[target.kind]}
        {note ? ` · ${note}` : ""}
      </p>
      <Link
        href={href}
        className="mt-0.5 block text-[18px] leading-snug text-[#1a0dab] hover:underline"
      >
        {title}
      </Link>
      {snippet ? (
        <p className="mt-1 text-[14px] leading-6 text-[#4d5156]">
          <MatchRichText text={snippet} terms={terms} />
        </p>
      ) : null}

      {jumps.length > 0 ? (
        <ul className="mt-3 grid gap-x-8 gap-y-2.5 border-t border-[#ecedef] pt-3 sm:grid-cols-2">
          {jumps.map((jump) => (
            <li key={jump.anchor}>
              <Link
                href={`${href}#${jump.anchor}`}
                className="block text-[14px] leading-snug text-[#1a0dab] hover:underline"
              >
                {jump.label}
              </Link>
              {jump.snippet ? (
                <span className="mt-0.5 block text-[12.5px] leading-5 text-[#70757a]">
                  <MatchRichText text={jump.snippet} terms={terms} />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
