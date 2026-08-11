"use client";

import { useMemo, useState } from "react";

import { resolveFeatured, type FeaturedEntry } from "@/lib/match-featured";
import type { RelatedQuestion } from "@/lib/questions-data";
import { DoodleMark } from "./doodle-mark";
import { ExitDialog } from "./exit-dialog";
import { MatchRichText } from "./match-rich-text";
import { CARD, FOUR_COLOR_GRADIENT, useMatch } from "./match-shell";
import { MatchSearchBar } from "./search-bar";
import { MatchSearchResults } from "./search-results";
import { ResultRow } from "./result-row";
import { ShortcutTiles } from "./shortcut-tiles";

interface HomeViewProps {
  /** The committed search, from `?q=`. Empty means show the profile. */
  query: string;
  aiEnabled: boolean;
  headline: string;
  intro: string;
  /** The entries picked out for this page, in order. */
  featured: FeaturedEntry[];
  /** Authored questions, for the block under the results. */
  questions: RelatedQuestion[];
  resumeUrl: string | null;
  meetingHref: string | null;
}

/**
 * The page a visitor lands on: the search field, and — when nothing is
 * being searched — the introduction and a listing of the entries worth
 * starting with.
 *
 * The listing is drawn as search results rather than as cards, because
 * that is what it is: the same rows a query produces, chosen by hand
 * instead of by a score. A visitor who has used Google already knows how
 * to read it, and the page keeps its one visual grammar whether or not
 * anything has been searched for.
 */
export function HomeView({
  query,
  aiEnabled,
  headline,
  intro,
  featured,
  questions,
  resumeUrl,
  meetingHref,
}: HomeViewProps) {
  const { index } = useMatch();
  const [exiting, setExiting] = useState(false);

  const results = useMemo(
    () => resolveFeatured(index, featured),
    [index, featured],
  );

  return (
    <>
      {query ? null : (
        <div className="mb-6 flex justify-center">
          <DoodleMark size={16} />
        </div>
      )}

      <MatchSearchBar query={query} showButtons={!query} />

      {query ? (
        <div className="mt-6">
          <MatchSearchResults
            query={query}
            aiEnabled={aiEnabled}
            questions={questions}
          />
        </div>
      ) : (
        <>
          <ShortcutTiles />

          <h1 className="mt-8 text-[32px] leading-tight font-normal text-[#202124]">
            {headline || "Team Matching Profile"}
          </h1>
          <div
            className="mt-3 h-1 w-28 rounded-full"
            style={{ background: FOUR_COLOR_GRADIENT }}
            aria-hidden
          />
          {intro ? (
            <p className="mt-5 max-w-[65ch] text-[16px] leading-7 whitespace-pre-line">
              <MatchRichText text={intro} />
            </p>
          ) : null}

          {results.length > 0 ? (
            <section aria-label="Start here" className="mt-8">
              <h2 className="border-b border-[#dadce0] pb-3 text-[11px] font-medium tracking-[0.14em] text-[#5f6368] uppercase">
                Start here
              </h2>
              <ul className="mt-4 space-y-3">
                {results.map((result) => (
                  <li key={`${result.target.kind}:${result.target.id}`}>
                    <ResultRow
                      target={result.target}
                      title={result.title}
                      note={result.note}
                      snippet={result.snippet}
                      jumps={result.jumps}
                      featured
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-8 space-y-4">
            {resumeUrl ? (
              <section
                className={`${CARD} flex flex-wrap items-center justify-between gap-3`}
              >
                <div>
                  <h2 className="text-lg font-medium text-[#202124]">Résumé</h2>
                  <p className="mt-1 text-sm text-[#5f6368]">
                    Team-matching edition — more detail than the public one.
                  </p>
                </div>
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#1a73e8] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1765cc]"
                >
                  View PDF
                </a>
              </section>
            ) : null}

            {meetingHref ? (
              <section
                className={`${CARD} flex flex-wrap items-center justify-between gap-3`}
              >
                <div>
                  <h2 className="text-lg font-medium text-[#202124]">
                    Want to talk?
                  </h2>
                  <p className="mt-1 text-sm text-[#5f6368]">
                    I&apos;m happy to chat about teams, roles, or anything on
                    this page.
                  </p>
                </div>
                <a
                  href={meetingHref}
                  target={meetingHref.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#1a73e8] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1765cc]"
                >
                  Set up a meeting
                </a>
              </section>
            ) : null}
          </div>
        </>
      )}

      <div className="mt-12 flex justify-center border-t border-[#dadce0] pt-8">
        <button
          type="button"
          onClick={() => setExiting(true)}
          className="cursor-pointer rounded-full border border-[#dadce0] bg-white px-6 py-2.5 text-sm font-medium text-[#1a73e8] transition-colors hover:bg-[#f1f6fe]"
        >
          Done viewing — leave page
        </button>
      </div>
      <p className="mt-6 text-center text-[11px] text-[#9aa0a6]">
        Inspired by Google&apos;s design language — not affiliated with Google.
      </p>

      {exiting ? <ExitDialog onDismiss={() => setExiting(false)} /> : null}
    </>
  );
}
