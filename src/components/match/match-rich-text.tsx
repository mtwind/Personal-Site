"use client";

import { Fragment } from "react";

import type { ReferenceResolver, ReferenceTarget } from "@/lib/match-references";

interface MatchRichTextProps {
  text: string;
  resolver: ReferenceResolver;
  onOpen: (target: ReferenceTarget) => void;
}

/**
 * Render section prose, turning `[[project:…]]` / `[[skill:…]]` tokens
 * into inline buttons that open the detail pane. Emits a fragment so the
 * caller keeps control of the wrapping element (and its
 * `whitespace-pre-line`).
 */
export function MatchRichText({ text, resolver, onOpen }: MatchRichTextProps) {
  const segments = resolver.parse(text);

  return (
    <>
      {segments.map((segment, index) =>
        segment.type === "text" ? (
          <Fragment key={index}>{segment.text}</Fragment>
        ) : (
          <ReferenceChip
            key={index}
            label={segment.label}
            onOpen={() => onOpen({ kind: segment.kind, id: segment.id })}
          />
        ),
      )}
    </>
  );
}

/**
 * An inline reference, rendered as a link that opens the detail pane.
 *
 * Shared with the streaming overview, which reveals labels a character at
 * a time — hence `partial`: the launch icon is a "this is a complete
 * link" signal, so it waits until the label actually is one.
 */
export function ReferenceChip({
  label,
  partial = false,
  onOpen,
}: {
  label: string;
  partial?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onOpen}
      // `inline` (not inline-block) so long labels wrap with the prose.
      className="inline cursor-pointer rounded-sm font-medium text-[#1a73e8] underline decoration-[#1a73e8]/40 decoration-dotted underline-offset-[3px] transition-colors hover:bg-[#e8f0fe] hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a73e8]"
    >
      {label}
      {partial ? null : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-0.5 inline-block h-[0.8em] w-[0.8em] align-[-0.05em] opacity-70"
          aria-hidden
        >
          <path d="M4 5h7M4 5v14h16v-7" />
          <path d="M14 4h6v6M20 4l-8 8" />
        </svg>
      )}
    </button>
  );
}
