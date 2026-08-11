"use client";

import { KIND_LABEL, type ReferenceTarget } from "@/lib/match-references";

/** What activating a row does. */
export type Suggestion =
  | { kind: "query"; text: string }
  | { kind: "recent"; text: string }
  | { kind: "entry"; text: string; note: string | null; target: ReferenceTarget };

interface SuggestionListProps {
  suggestions: Suggestion[];
  /** Row the keyboard is on; -1 when the pointer is in charge. */
  active: number;
  /** What has been typed, so the completion can be told from it. */
  draft: string;
  listId: string;
  rowId: (index: number) => string;
  onActivate: (suggestion: Suggestion) => void;
  onHover: (index: number) => void;
  onForget: (query: string) => void;
}

/**
 * The dropdown under the search field.
 *
 * Modelled on Google's: the thing you typed sits at the top, past
 * searches carry a clock and can be removed one by one, and everything
 * else is a real destination on this site. The part you did *not* type
 * is the part in bold — the suggestion is the completion, not the echo.
 *
 * Rows are `div`s with option semantics rather than buttons: the input
 * keeps focus the whole time, which is what lets the arrow keys walk the
 * list while what you typed stays editable.
 */
export function SuggestionList({
  suggestions,
  active,
  draft,
  listId,
  rowId,
  onActivate,
  onHover,
  onForget,
}: SuggestionListProps) {
  if (suggestions.length === 0) return null;

  return (
    <ul
      id={listId}
      role="listbox"
      className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-3xl border border-[#dadce0] bg-white py-2 shadow-[0_4px_6px_rgba(32,33,36,0.28)]"
    >
      {suggestions.map((suggestion, index) => (
        <li
          key={`${suggestion.kind}:${suggestion.text}:${index}`}
          id={rowId(index)}
          role="option"
          aria-selected={index === active}
          onMouseEnter={() => onHover(index)}
          // The field must not lose focus, or the list closes before the
          // click it was closing for ever lands.
          onMouseDown={(event) => {
            event.preventDefault();
            onActivate(suggestion);
          }}
          className={`flex cursor-pointer items-center gap-3 px-5 py-2 ${
            index === active ? "bg-[#f1f3f4]" : ""
          }`}
        >
          <SuggestionIcon kind={suggestion.kind} />

          <span className="min-w-0 flex-1 truncate text-[15px] text-[#202124]">
            <Completion text={suggestion.text} typed={draft} />
            {suggestion.kind === "entry" && suggestion.note ? (
              <span className="ml-2 text-[13px] text-[#70757a]">
                {suggestion.note}
              </span>
            ) : null}
          </span>

          {suggestion.kind === "entry" ? (
            <span className="shrink-0 text-[11px] tracking-[0.12em] text-[#70757a] uppercase">
              {KIND_LABEL[suggestion.target.kind]}
            </span>
          ) : null}

          {suggestion.kind === "recent" ? (
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onForget(suggestion.text);
              }}
              className="shrink-0 cursor-pointer rounded-full px-2 py-0.5 text-[12px] font-medium text-[#1a73e8] hover:underline"
            >
              Remove
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Magnifier for a search, a clock for something searched before. */
function SuggestionIcon({ kind }: { kind: Suggestion["kind"] }) {
  const shared = "h-4 w-4 shrink-0 text-[#9aa0a6]";

  if (kind === "recent") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={shared}
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={shared}
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </svg>
  );
}

/**
 * The typed part plain, the rest bold — the convention that makes a
 * suggestion list readable at a glance, because the eye only has to scan
 * the part that differs between rows.
 */
function Completion({ text, typed }: { text: string; typed: string }) {
  const needle = typed.trim().toLowerCase();
  const at = needle === "" ? -1 : text.toLowerCase().indexOf(needle);

  if (at === -1) return <span className="font-bold">{text}</span>;

  return (
    <>
      <span className="font-bold">{text.slice(0, at)}</span>
      {text.slice(at, at + needle.length)}
      <span className="font-bold">{text.slice(at + needle.length)}</span>
    </>
  );
}
