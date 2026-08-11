"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  forgetSearch,
  noSearches,
  recentSearches,
  rememberSearch,
  subscribeHistory,
} from "@/lib/match-history";
import {
  entrySummaries,
  searchReferences,
  suggestEntries,
} from "@/lib/match-search";
import { targetHref } from "@/lib/match-tabs";
import { DoodleMark } from "./doodle-mark";
import { useMatch } from "./match-shell";
import { SuggestionList, type Suggestion } from "./search-suggestions";
import { VoiceSearchButton } from "./voice-search";

/** How many entry suggestions the dropdown offers at once. */
const SUGGESTION_LIMIT = 6;

/**
 * Google-style search field. The committed query lives in the URL, so a
 * search is a real history entry: back leaves the results, forward
 * returns to them, and the link can be shared. Searching stays an
 * explicit act rather than firing per keystroke, so the AI overview isn't
 * requested on every character typed.
 *
 * The dropdown underneath is the exception that proves it: suggestions
 * are drawn from the index the page already ships, so offering them
 * costs a keystroke's worth of array work and no request at all.
 */
export function MatchSearchBar({
  query,
  /** The home page shows the two buttons; a results page doesn't. */
  showButtons = false,
}: {
  query: string;
  showButtons?: boolean;
}) {
  const { base, index, resolver, ownerName } = useMatch();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(query);
  const [committed, setCommitted] = useState(query);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();

  // Storage is a browser thing, so the server renders a field with no
  // history under it — which is also what a first-time visitor sees.
  const recent = useSyncExternalStore(
    subscribeHistory,
    () => recentSearches(base),
    noSearches,
  );

  // Follow the URL: back and forward between searches put that search
  // back in the field. Adjusting during render rather than in an effect
  // means the field is never briefly a search ago.
  if (committed !== query) {
    setCommitted(query);
    setDraft(query);
    setOpen(false);
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

  const suggestions = useMemo((): Suggestion[] => {
    const typed = draft.trim();

    if (typed === "") {
      return recent.map((text) => ({ kind: "recent" as const, text }));
    }

    const entries = suggestEntries(index, typed, SUGGESTION_LIMIT).map(
      (summary) => ({
        kind: "entry" as const,
        text: summary.title,
        note: summary.note,
        target: summary.target,
      }),
    );

    // What was typed always leads: the reader's own words are the one
    // suggestion that is never wrong.
    return [{ kind: "query" as const, text: typed }, ...entries];
  }, [draft, recent, index]);

  const runSearch = (text: string) => {
    const next = text.trim();
    setOpen(false);
    setActive(-1);
    if (next) rememberSearch(base, next);
    router.push(next ? `${base}?q=${encodeURIComponent(next)}` : base);
  };

  const activate = (suggestion: Suggestion) => {
    if (suggestion.kind === "entry") {
      const href = targetHref(base, resolver, suggestion.target);
      setOpen(false);
      setActive(-1);
      if (href) router.push(href);
      return;
    }
    setDraft(suggestion.text);
    runSearch(suggestion.text);
  };

  /**
   * "I'm feeling lucky": the top result without the results page.
   *
   * With nothing typed it picks at random, which is the joke Google's
   * button has always been — an invitation to stop steering.
   */
  const feelingLucky = () => {
    const typed = draft.trim();
    const target = typed
      ? searchReferences(index, typed)[0]?.target
      : pickRandom(entrySummaries(index))?.target;

    const href = target ? targetHref(base, resolver, target) : null;
    if (href) {
      setOpen(false);
      router.push(href);
    } else {
      runSearch(typed);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }

    if (!open || suggestions.length === 0) {
      if (event.key === "ArrowDown") setOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      activate(suggestions[active]);
    }
  };

  return (
    <div className="relative">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          runSearch(draft);
        }}
        onBlur={(event) => {
          // Only when focus leaves the whole field, not when it moves
          // between the input and a control inside it.
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setOpen(false);
            setActive(-1);
          }
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
          onChange={(event) => {
            setDraft(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            active >= 0 ? `${listId}-row-${active}` : undefined
          }
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
              setOpen(false);
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
        ) : null}

        <VoiceSearchButton
          onResult={(text) => {
            setDraft(text);
            runSearch(text);
          }}
        />

        {draft || query ? null : <DoodleMark size={8} className="shrink-0" />}
      </form>

      {open ? (
        <SuggestionList
          suggestions={suggestions}
          active={active}
          draft={draft}
          listId={listId}
          rowId={(index) => `${listId}-row-${index}`}
          onActivate={activate}
          onHover={setActive}
          onForget={(text) => forgetSearch(base, text)}
        />
      ) : null}

      {showButtons ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => runSearch(draft)}
            className="cursor-pointer rounded border border-[#f8f9fa] bg-[#f8f9fa] px-4 py-2 text-[14px] text-[#3c4043] transition-shadow hover:border-[#dadce0] hover:shadow-sm"
          >
            Search this profile
          </button>
          <button
            type="button"
            onClick={feelingLucky}
            className="cursor-pointer rounded border border-[#f8f9fa] bg-[#f8f9fa] px-4 py-2 text-[14px] text-[#3c4043] transition-shadow hover:border-[#dadce0] hover:shadow-sm"
          >
            I&apos;m feeling lucky
          </button>
        </div>
      ) : null}
    </div>
  );
}

function pickRandom<T>(items: T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}
