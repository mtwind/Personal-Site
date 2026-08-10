"use client";

import { useEffect, useRef, useState } from "react";

import type { ReferenceResolver, ReferenceTarget } from "@/lib/match-references";
import { matchRanges, type SearchHit } from "@/lib/match-search";
import { MatchAiOverview } from "./match-ai-overview";

const GOOGLE_DOTS = ["#4285F4", "#EA4335", "#FBBC04", "#34A853"];

/**
 * Google-style search field. Controlled draft text, committed on submit —
 * searching is an explicit act, not something that fires per keystroke, so
 * the eventual AI overview isn't requested on every character typed.
 */
export function MatchSearchBar({
  ownerName,
  draft,
  onDraftChange,
  onSubmit,
  onClear,
  hasQuery,
}: {
  ownerName: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  hasQuery: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
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
        onChange={(event) => onDraftChange(event.target.value)}
        aria-label={`Search ${ownerName}'s profile`}
        placeholder={`Ask anything about ${ownerName.split(" ")[0]}…`}
        // Suppress the browser's own clear affordance; we render our own.
        className="min-w-0 flex-1 bg-transparent text-[15px] text-[#202124] outline-none placeholder:text-[#80868b] [&::-webkit-search-cancel-button]:hidden"
      />

      {draft || hasQuery ? (
        <button
          type="button"
          onClick={onClear}
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
 * entries. Each result opens in the reference pane rather than navigating,
 * so a reader can compare several without losing their place in the list.
 */
export function MatchSearchResults({
  query,
  hits,
  resolver,
  aiEnabled,
  onOpen,
  onClear,
}: {
  query: string;
  hits: SearchHit[];
  resolver: ReferenceResolver;
  aiEnabled: boolean;
  onOpen: (target: ReferenceTarget) => void;
  onClear: () => void;
}) {
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#dadce0] pb-3">
        <p className="text-[13px] text-[#5f6368]">
          {hits.length === 0
            ? "No matching entries"
            : `${hits.length} ${hits.length === 1 ? "result" : "results"} for `}
          {hits.length > 0 ? (
            <span className="text-[#202124]">“{query}”</span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer text-[13px] font-medium text-[#1a73e8] underline-offset-2 hover:underline"
        >
          Back to profile
        </button>
      </div>

      {aiEnabled ? (
        <MatchAiOverview query={query} resolver={resolver} onOpen={onOpen} />
      ) : null}

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
              <SearchResultCard hit={hit} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One result. Styled as a Google organic result, not as a card. */
function SearchResultCard({
  hit,
  onOpen,
}: {
  hit: SearchHit;
  onOpen: (target: ReferenceTarget) => void;
}) {
  const kindLabel =
    hit.target.kind === "project"
      ? "Project"
      : hit.target.kind === "experience"
        ? "Experience"
        : "Skill";

  return (
    <button
      type="button"
      onClick={() => onOpen(hit.target)}
      className="group block w-full cursor-pointer rounded-xl px-3.5 py-3 text-left transition-colors hover:bg-white"
    >
      <span className="block text-[11px] tracking-[0.14em] text-[#5f6368] uppercase">
        {kindLabel}
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
    </button>
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

/** Hook holding the search bar's draft text and the committed query. */
export function useMatchSearch() {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");

  return {
    draft,
    query,
    setDraft,
    submit: () => setQuery(draft.trim()),
    clear: () => {
      setDraft("");
      setQuery("");
    },
  };
}
