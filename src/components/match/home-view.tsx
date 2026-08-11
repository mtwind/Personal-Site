"use client";

import Link from "next/link";
import { useState } from "react";

import { sectionPath } from "@/lib/match-tabs";
import { ExitDialog } from "./exit-dialog";
import { MatchRichText } from "./match-rich-text";
import { MatchSearchBar, MatchSearchResults } from "./match-search";
import { CARD, FOUR_COLOR_GRADIENT, GOOGLE_DOTS, useMatch } from "./match-shell";

interface HomeViewProps {
  /** The committed search, from `?q=`. Empty means show the profile. */
  query: string;
  aiEnabled: boolean;
  headline: string;
  intro: string;
  resumeUrl: string | null;
  meetingHref: string | null;
}

/** How much of a section's prose shows on its card on the home page. */
const PREVIEW_CHARS = 150;

/**
 * The page a visitor lands on: the search field, and — when nothing is
 * being searched — the introduction and the way in to every other page.
 */
export function HomeView({
  query,
  aiEnabled,
  headline,
  intro,
  resumeUrl,
  meetingHref,
}: HomeViewProps) {
  const { base, sections, resolver } = useMatch();
  const [exiting, setExiting] = useState(false);

  /** A section's opening prose, with reference tokens read as words. */
  const preview = (body: string): string => {
    const text = resolver
      .parse(body)
      .map((segment) => (segment.type === "text" ? segment.text : segment.label))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    return text.length > PREVIEW_CHARS
      ? `${text.slice(0, PREVIEW_CHARS).trimEnd()}…`
      : text;
  };

  return (
    <>
      <MatchSearchBar query={query} />

      {query ? (
        <div className="mt-6">
          <MatchSearchResults query={query} aiEnabled={aiEnabled} />
        </div>
      ) : (
        <>
          <h1 className="mt-6 text-[32px] leading-tight font-normal text-[#202124]">
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

          {sections.length > 0 ? (
            <nav aria-label="Pages" className="mt-8">
              <h2 className="text-[11px] font-medium tracking-[0.14em] text-[#5f6368] uppercase">
                Pages
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {sections.map((section, index) => (
                  <li key={section.slug}>
                    <Link
                      href={base + sectionPath(section.slug)}
                      className={`${CARD} block h-full`}
                    >
                      <span className="flex items-center gap-2.5 text-[17px] font-medium text-[#202124]">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            background: GOOGLE_DOTS[index % GOOGLE_DOTS.length],
                          }}
                          aria-hidden
                        />
                        {section.title || "Untitled"}
                      </span>
                      <span className="mt-2 block text-[14px] leading-6 text-[#5f6368]">
                        {preview(section.body)}
                      </span>
                      <span className="mt-3 inline-block text-[13px] font-medium text-[#1a73e8]">
                        Open →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <div className="mt-4 space-y-4">
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
