"use client";

import Link from "next/link";
import { useId } from "react";

import { KIND_LABEL, type ReferenceTarget } from "@/lib/match-references";
import type { SearchJumpLink } from "@/lib/match-search";
import { targetHref } from "@/lib/match-tabs";
import { MatchRichText } from "./match-rich-text";
import { useMatch } from "./match-shell";
import { useHoverDisclosure } from "./use-hover-disclosure";

interface ResultRowProps {
  target: ReferenceTarget;
  title: string;
  /** Company, dates, or course — the grey prefix on the description. */
  note: string | null;
  /** The description under the link. */
  snippet: string;
  /** Sections of the entry the reader can land on directly. */
  jumps?: SearchJumpLink[];
  /** Query terms to embolden, when this row came from a search. */
  terms?: string[];
  /** Which fields the query hit — what "About this result" explains. */
  why?: string[];
  /**
   * Why this row is on the page at all, which is the question "About
   * this result" exists to answer. A ranked hit is the default; the
   * home page's own listing is `featured`, and its kind tabs are
   * `browse` — a complete list, in the profile's order, ranked by
   * nothing.
   */
  origin?: RowOrigin;
}

export type RowOrigin = "search" | "featured" | "browse";

/**
 * One organic result, laid out the way Google lays one out: the source
 * and its URL breadcrumb in small type, the title as a blue link, and a
 * description with the entry's dates as a grey prefix.
 *
 * The home page and the search results both render this, which is the
 * point: featuring an entry on the landing page and finding it by
 * searching should produce the same row, because they are the same
 * claim about the same thing.
 *
 * The row is not itself a link. The jump links and the ⋮ live inside it,
 * and an anchor inside an anchor is invalid HTML — so the title carries
 * the link and the surrounding block only carries the hover.
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
  why = [],
  origin = "search",
}: ResultRowProps) {
  const { base, resolver, ownerName } = useMatch();
  const href = targetHref(base, resolver, target);
  if (!href) return null;

  // The real path, which is also the breadcrumb: `/project/simple-c…`.
  const crumbs = href.slice(base.length).split("/").filter(Boolean);

  return (
    <div className="group/result rounded-xl px-3.5 py-3 transition-colors hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SourceMark />
            <span className="truncate text-[14px] leading-tight text-[#202124]">
              {ownerName}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[12px] leading-tight text-[#4d5156]">
            {crumbs.join(" › ")}
          </p>
        </div>

        <AboutThisResult
          kind={KIND_LABEL[target.kind]}
          title={title}
          why={why}
          terms={terms}
          origin={origin}
        />
      </div>

      <Link
        href={href}
        data-result-link
        className="mt-1 block text-[19px] leading-snug text-[#1a0dab] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a73e8]"
      >
        {title}
      </Link>

      {snippet || note ? (
        <p className="mt-1 text-[14px] leading-6 text-[#4d5156]">
          {note ? (
            <span className="text-[#70757a]">
              {note}
              {/* The dash joins two things; with nothing to join it is
                  a sentence trailing off. */}
              {snippet ? " — " : ""}
            </span>
          ) : null}
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

/** The little circle where a result would carry a site's favicon. */
function SourceMark() {
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#dadce0] bg-white"
      aria-hidden
    >
      <span className="grid h-3 w-3 grid-cols-2 gap-[1px]">
        <span className="rounded-full bg-[#4285F4]" />
        <span className="rounded-full bg-[#EA4335]" />
        <span className="rounded-full bg-[#FBBC04]" />
        <span className="rounded-full bg-[#34A853]" />
      </span>
    </span>
  );
}

/**
 * The ⋮ that explains why this result is here.
 *
 * Google's version exists because a ranked list is otherwise unfalsifiable
 * — you cannot tell a good match from a lucky one. This one can actually
 * answer: the search knows which field each term hit, so the panel names
 * them instead of describing ranking in the abstract.
 */
function AboutThisResult({
  kind,
  title,
  why,
  terms,
  origin,
}: {
  kind: string;
  title: string;
  why: string[];
  terms: string[];
  origin: RowOrigin;
}) {
  const { open, ref, buttonProps, panelProps } =
    useHoverDisclosure<HTMLDivElement>();
  const panelId = useId();

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        {...buttonProps}
        aria-controls={panelId}
        aria-label="About this result"
        className={`cursor-pointer rounded-full p-1 text-[#5f6368] transition-colors hover:bg-[#f1f3f4] hover:text-[#202124] ${
          open ? "" : "opacity-0 group-hover/result:opacity-100 focus:opacity-100"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <circle cx="12" cy="5" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="19" r="1.6" fill="currentColor" />
        </svg>
      </button>

      {open ? (
        <div
          id={panelId}
          role="note"
          {...panelProps}
          className="absolute top-full right-0 z-30 mt-1.5 w-72 rounded-xl border border-[#dadce0] bg-white p-4 text-left shadow-[0_1px_3px_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]"
        >
          <p className="text-[13px] font-medium text-[#202124]">About this result</p>
          <p className="mt-2 text-[12.5px] leading-5 text-[#5f6368]">
            <span className="text-[#202124]">{title}</span> is{" "}
            {article(kind)} {kind.toLowerCase()} on this profile.
          </p>

          {origin === "featured" ? (
            <p className="mt-2 text-[12.5px] leading-5 text-[#5f6368]">
              It appears here because it was chosen for the home page, not
              because a search ranked it.
            </p>
          ) : origin === "browse" ? (
            <p className="mt-2 text-[12.5px] leading-5 text-[#5f6368]">
              It appears here because you are looking at every{" "}
              {kind.toLowerCase()} on this profile. Nothing is ranked or left
              out.
            </p>
          ) : why.length > 0 ? (
            <p className="mt-2 text-[12.5px] leading-5 text-[#5f6368]">
              Your search matched {joinWords(why)}
              {terms.length > 0 ? (
                <>
                  {" "}
                  on{" "}
                  {terms.map((term, index) => (
                    <span key={term}>
                      {index > 0 ? ", " : ""}
                      <span className="font-medium text-[#202124]">{term}</span>
                    </span>
                  ))}
                </>
              ) : null}
              .
            </p>
          ) : (
            <p className="mt-2 text-[12.5px] leading-5 text-[#5f6368]">
              It matched the kind of entry your question asked for.
            </p>
          )}

          <p className="mt-3 border-t border-[#ecedef] pt-2.5 text-[11.5px] leading-4 text-[#80868b]">
            Ranking runs in your browser against this page&apos;s own content.
            Searches are counted so the owner knows what people look for —
            nothing else about you is.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** "a project", but "an experience". */
function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

/** "its name, the tools it used and the page text". */
function joinWords(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
