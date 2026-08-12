"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

import { KIND_LABEL, type ReferenceKind } from "@/lib/match-references";
import {
  FILTER_KINDS,
  filterFromParam,
  relatedSearches,
  timedSearch,
} from "@/lib/match-search";
import type { RelatedQuestion } from "@/lib/questions-data";
import { FilterTabs, TAB_LABEL } from "./filter-tabs";
import { SponsoredResults } from "./match-ads";
import { MatchAiOverview } from "./match-ai-overview";
import { useMatch } from "./match-shell";
import { PeopleAlsoAsk } from "./people-also-ask";
import { ResultRow } from "./result-row";

/**
 * The results page: an AI-overview slot above a ranked list of profile
 * entries. Every result is a link to that entry's page, and following one
 * opens a tab rather than closing the results — so a reader can work
 * through several without losing the list they came from.
 */
export function MatchSearchResults({
  query,
  aiEnabled,
  questions,
}: {
  query: string;
  aiEnabled: boolean;
  questions: RelatedQuestion[];
}) {
  const { base, index } = useMatch();
  const params = useSearchParams();
  const filter = filterFromParam(params.get("t"));
  const listRef = useRef<HTMLDivElement>(null);

  // Timed rather than guessed at: the search really does run in the
  // browser, so the number under the field is a measurement.
  const { hits, seconds } = useMemo(
    () => timedSearch(index, query),
    [index, query],
  );

  const shown = filter
    ? hits.filter((hit) => hit.target.kind === filter)
    : hits;

  const counts = useMemo(() => {
    const tally = new Map<ReferenceKind, number>();
    for (const hit of hits) {
      tally.set(hit.target.kind, (tally.get(hit.target.kind) ?? 0) + 1);
    }
    return tally;
  }, [hits]);

  const related = useMemo(
    () => relatedSearches(index, query, hits),
    [index, query, hits],
  );

  useSearchLog(query, hits.length);
  useResultKeys(listRef);

  const href = (kind: ReferenceKind | null) =>
    `${base}?q=${encodeURIComponent(query)}${kind ? `&t=${kind}` : ""}`;

  return (
    <div>
      <FilterTabs
        label="Filter results"
        tabs={[
          { href: href(null), label: "All", active: filter === null },
          // Only the kinds this query actually turned up: a tab that
          // leads to an empty list is a dead end the reader has to
          // discover by clicking it.
          ...FILTER_KINDS.filter((kind) => (counts.get(kind) ?? 0) > 0).map(
            (kind) => ({
              href: href(kind),
              label: TAB_LABEL[kind],
              count: counts.get(kind) ?? 0,
              active: filter === kind,
            }),
          ),
        ]}
      />

      <p className="mt-3 text-[13px] text-[#70757a]">
        About {shown.length} {shown.length === 1 ? "result" : "results"} (
        {seconds.toFixed(2)} seconds)
      </p>

      {/* The answer comes first. Google sells the top of the page to
          whoever bid for it; nobody bid for this one, so the thing a
          reader actually asked for goes above the ads. */}
      {aiEnabled ? <MatchAiOverview query={query} /> : null}

      <SponsoredResults query={query} />


      {shown.length === 0 ? (
        <NoResults
          query={query}
          filter={filter}
          allHref={href(null)}
          total={hits.length}
        />
      ) : (
        <div ref={listRef}>
          <ul className="mt-4 space-y-3">
            {shown.map((hit) => (
              <li key={`${hit.target.kind}:${hit.target.id}`}>
                <ResultRow
                  target={hit.target}
                  title={hit.title}
                  note={hit.note}
                  snippet={hit.headline}
                  jumps={hit.jumps}
                  terms={hit.matched}
                  why={hit.why}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <PeopleAlsoAsk questions={questions} query={query} />

      {related.length > 0 ? (
        <section aria-label="Related searches" className="mt-8">
          <h2 className="text-[19px] font-normal text-[#202124]">
            Related searches
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {related.map((term) => (
              <li key={term}>
                <Link
                  href={`${base}?q=${encodeURIComponent(term)}`}
                  className="flex items-center gap-3 rounded-full bg-[#f1f3f4] px-4 py-2.5 text-[14px] text-[#202124] transition-colors hover:bg-[#e8eaed]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="h-4 w-4 shrink-0 text-[#5f6368]"
                    aria-hidden
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.8-3.8" />
                  </svg>
                  <span className="font-medium">{term}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/**
 * The empty state, in Google's own voice.
 *
 * The suggestions are the real ones, plus the operators this search
 * understands — an empty result page is the moment a reader is most
 * willing to learn that quoting a phrase does something.
 */
function NoResults({
  query,
  filter,
  allHref,
  total,
}: {
  query: string;
  filter: ReferenceKind | null;
  allHref: string;
  total: number;
}) {
  // Narrowed to nothing, but the search itself found plenty: that is a
  // different problem, with a different fix.
  if (filter && total > 0) {
    return (
      <div className="mt-6 rounded-2xl border border-[#dadce0] bg-white p-6">
        <p className="text-[15px] text-[#202124]">
          No {KIND_LABEL[filter].toLowerCase()} results for{" "}
          <span className="font-medium">{query}</span>.
        </p>
        <Link
          href={allHref}
          className="mt-3 inline-block text-[14px] font-medium text-[#1a73e8] hover:underline"
        >
          See all {total} results →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-[#dadce0] bg-white p-6">
      <p className="text-[15px] leading-7 text-[#202124]">
        Your search — <span className="font-bold">{query}</span> — did not match
        anything on this page.
      </p>
      <p className="mt-4 text-[14px] text-[#202124]">Suggestions:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-6 text-[#4d5156]">
        <li>Make sure all words are spelled correctly.</li>
        <li>Try different keywords, or more general ones.</li>
        <li>Try fewer keywords.</li>
        <li>
          Search a language or tool (<Term>Rust</Term>, <Term>Postgres</Term>),
          a kind of work (<Term>compiler</Term>, <Term>latency</Term>), or a
          company.
        </li>
      </ul>
      <p className="mt-4 text-[13px] leading-6 text-[#70757a]">
        This search also understands <Term>&quot;exact phrases&quot;</Term>,{" "}
        <Term>-excluded</Term> words, and <Term>kind:project</Term> to look at
        one sort of entry only.
      </p>
    </div>
  );
}

function Term({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-[#f1f3f4] px-1.5 py-0.5 font-mono text-[12.5px] text-[#202124]">
      {children}
    </span>
  );
}

/**
 * Tell the server what was searched for, and how it went.
 *
 * The search itself runs in the browser, so without this the query log
 * only ever records the searches that reached the AI overview — which is
 * to say, not the ones that found nothing. Sent as a beacon, once per
 * query, and never for the owner's own browsing.
 */
function useSearchLog(query: string, results: number): void {
  const { isVisitor } = useMatch();

  useEffect(() => {
    if (!query || !isVisitor) return;

    // A short delay keeps a reader retyping a word from logging each
    // half-finished version of it as a search of its own.
    const timer = setTimeout(() => {
      const body = JSON.stringify({ query, results });
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            "/api/match/search",
            new Blob([body], { type: "application/json" }),
          );
          return;
        }
      } catch {
        // Fall through to fetch.
      }
      void fetch("/api/match/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {
        // A statistic that didn't arrive is not worth a broken page.
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [query, results, isVisitor]);
}

/**
 * `j` and `k` walk the results, the way they walk a list anywhere else a
 * keyboard is taken seriously.
 *
 * Focus is what moves, rather than a highlight of our own: focusing the
 * link means Enter opens it, the browser scrolls it into view, and a
 * screen reader announces it — three behaviours that would otherwise
 * have to be rebuilt, worse.
 */
function useResultKeys(listRef: React.RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "j" && event.key !== "k") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const active = document.activeElement;
      const typing =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable);
      if (typing) return;

      const links = Array.from(
        listRef.current?.querySelectorAll<HTMLAnchorElement>(
          "[data-result-link]",
        ) ?? [],
      );
      if (links.length === 0) return;

      event.preventDefault();
      const at = links.findIndex((link) => link === active);
      const next =
        event.key === "j"
          ? Math.min(at + 1, links.length - 1)
          : Math.max(at - 1, 0);
      links[at === -1 ? 0 : next]?.focus();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [listRef]);
}
