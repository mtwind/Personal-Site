"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { KIND_LABEL } from "@/lib/match-references";
import { matchRanges, searchReferences, type SearchHit } from "@/lib/match-search";
import { targetHref } from "@/lib/match-tabs";
import { SponsoredResults } from "./match-ads";
import { MatchAiOverview } from "./match-ai-overview";
import { GOOGLE_DOTS, useMatch } from "./match-shell";

/**
 * Google-style search field. The committed query lives in the URL, so a
 * search is a real history entry: back leaves the results, forward
 * returns to them, and the link can be shared. Searching stays an
 * explicit act rather than firing per keystroke, so the AI overview isn't
 * requested on every character typed.
 */
export function MatchSearchBar({ query }: { query: string }) {
  const { base, ownerName } = useMatch();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(query);
  const [committed, setCommitted] = useState(query);

  // Follow the URL: back and forward between searches put that search
  // back in the field. Adjusting during render rather than in an effect
  // means the field is never briefly a search ago.
  if (committed !== query) {
    setCommitted(query);
    setDraft(query);
  }

  // "/" focuses the field, the way it does on Google itself.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey) return;
      const active = document.activeElement;
      const typing =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable);
      if (typing) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const submit = () => {
    const next = draft.trim();
    router.push(next ? `${base}?q=${encodeURIComponent(next)}` : base);
  };

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="group flex w-full items-center gap-3 rounded-full border border-[#dadce0] bg-white px-5 py-2.5 shadow-sm transition-shadow focus-within:border-transparent focus-within:shadow-[0_1px_6px_rgba(32,33,36,0.28)] hover:shadow-[0_1px_6px_rgba(32,33,36,0.18)]"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#4285F4"
        strokeWidth="2.4"
        strokeLinecap="round"
        className="h-4.5 w-4.5 shrink-0"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.8-3.8" />
      </svg>

      <input
        ref={inputRef}
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        aria-label={`Search ${ownerName}'s profile`}
        placeholder={`Ask anything about ${ownerName.split(" ")[0]}…`}
        // Suppress the browser's own clear affordance; we render our own.
        className="min-w-0 flex-1 bg-transparent text-[15px] text-[#202124] outline-none placeholder:text-[#80868b] [&::-webkit-search-cancel-button]:hidden"
      />

      {draft || query ? (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            router.push(base);
          }}
          aria-label="Clear search"
          title="Clear"
          className="shrink-0 cursor-pointer rounded-full p-1 text-[#5f6368] transition-colors hover:bg-[#f1f3f4] hover:text-[#202124]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-4 w-4"
            aria-hidden
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      ) : (
        <span className="flex shrink-0 items-center gap-1" aria-hidden>
          {GOOGLE_DOTS.map((color) => (
            <span
              key={color}
              className="h-2 w-2 rounded-full"
              style={{ background: color }}
            />
          ))}
        </span>
      )}
    </form>
  );
}

/**
 * The results page: an AI-overview slot above a ranked list of profile
 * entries. Every result is a link to that entry's page, and following one
 * opens a tab rather than closing the results — so a reader can work
 * through several without losing the list they came from.
 */
export function MatchSearchResults({
  query,
  aiEnabled,
}: {
  query: string;
  aiEnabled: boolean;
}) {
  const { base, index } = useMatch();
  const hits = useMemo(
    () => (query ? searchReferences(index, query) : []),
    [index, query],
  );

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#dadce0] pb-3">
        <p className="text-[13px] text-[#5f6368]">
          {hits.length === 0
            ? "No matching entries"
            : `${hits.length} ${hits.length === 1 ? "result" : "results"} for `}
          {hits.length > 0 ? (
            <span className="text-[#202124]">“{query}”</span>
          ) : null}
        </p>
        <Link
          href={base}
          className="text-[13px] font-medium text-[#1a73e8] underline-offset-2 hover:underline"
        >
          Back to profile
        </Link>
      </div>

      {/* Above the overview, where Google puts them. */}
      <SponsoredResults query={query} />

      {aiEnabled ? <MatchAiOverview query={query} /> : null}

      {hits.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-[#dadce0] bg-white p-6">
          <p className="text-[15px] text-[#202124]">
            Nothing on this page matches “{query}”.
          </p>
          <p className="mt-2 text-[14px] leading-6 text-[#5f6368]">
            Try a language or tool ({"“Rust”, “Postgres”"}), a kind of work (
            {"“compiler”, “latency”"}), or a company name.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {hits.map((hit) => (
            <li key={`${hit.target.kind}:${hit.target.id}`}>
              <SearchResultCard hit={hit} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One result. Styled as a Google organic result, not as a card. */
function SearchResultCard({ hit }: { hit: SearchHit }) {
  const { base, resolver } = useMatch();
  const href = targetHref(base, resolver, hit.target);
  if (!href) return null;

  return (
    <Link
      href={href}
      className="group block w-full rounded-xl px-3.5 py-3 text-left transition-colors hover:bg-white"
    >
      <span className="block text-[11px] tracking-[0.14em] text-[#5f6368] uppercase">
        {KIND_LABEL[hit.target.kind]}
        {hit.note ? ` · ${hit.note}` : ""}
      </span>
      <span className="mt-0.5 block text-[18px] leading-snug text-[#1a0dab] group-hover:underline">
        {hit.title}
      </span>
      {hit.headline ? (
        <span className="mt-1 block text-[14px] leading-6 text-[#4d5156]">
          <Highlighted text={hit.headline} terms={hit.matched} />
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Bold the query terms inside a snippet, the way search results do. Ranges
 * come from the search module so highlighting and ranking agree on what
 * counts as a match.
 */
function Highlighted({ text, terms }: { text: string; terms: string[] }) {
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
