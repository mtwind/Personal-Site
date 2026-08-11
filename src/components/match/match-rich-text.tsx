"use client";

import Link from "next/link";
import { Fragment } from "react";

import type { ReferenceTarget } from "@/lib/match-references";
import { targetHref } from "@/lib/match-tabs";
import { Highlighted } from "./highlighted";
import { useMatch } from "./match-shell";

/**
 * Render authored prose, turning `[[page:…]]` / `[[project:…]]` /
 * `[[experience:…]]` / `[[course:…]]` / `[[skill:…]]` tokens into links
 * to those pages. Emits a fragment so the caller keeps control of the
 * wrapping element (and its `whitespace-pre-line`).
 *
 * `terms` embolden the query's words in the plain runs, so the same
 * component can render a search result's description without either
 * feature disabling the other.
 */
export function MatchRichText({
  text,
  terms = [],
}: {
  text: string;
  terms?: string[];
}) {
  const { resolver } = useMatch();
  const segments = resolver.parse(text);

  return (
    <>
      {segments.map((segment, index) =>
        segment.type === "text" ? (
          <Fragment key={index}>
            {terms.length > 0 ? (
              <Highlighted text={segment.text} terms={terms} />
            ) : (
              segment.text
            )}
          </Fragment>
        ) : (
          <ReferenceChip
            key={index}
            label={segment.label}
            target={{ kind: segment.kind, id: segment.id }}
          />
        ),
      )}
    </>
  );
}

/**
 * An inline reference, rendered as a link to that entry's page.
 *
 * Shared with the streaming overview, which reveals labels a character at
 * a time — hence `partial`: the launch icon is a "this is a complete
 * link" signal, so it waits until the label actually is one.
 */
export function ReferenceChip({
  label,
  partial = false,
  target,
}: {
  label: string;
  partial?: boolean;
  target: ReferenceTarget;
}) {
  const { base, resolver } = useMatch();
  const href = targetHref(base, resolver, target);

  // An entry deleted since the prose was written reads as plain words.
  if (!href) return <>{label}</>;

  return (
    <Link
      href={href}
      // `inline` (not inline-block) so long labels wrap with the prose.
      className="inline rounded-sm font-medium text-[#1a73e8] underline decoration-[#1a73e8]/40 decoration-dotted underline-offset-[3px] transition-colors hover:bg-[#e8f0fe] hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a73e8]"
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
    </Link>
  );
}
