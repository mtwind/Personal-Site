"use client";

import { Fragment } from "react";

import {
  parseMarkdown,
  type MarkdownBlock,
  type MarkdownInline,
  type MarkdownListItem,
} from "@/lib/match-markdown";
import type { PageHeading, ReferenceResolver } from "@/lib/match-references";
import { ReferenceChip } from "./match-rich-text";
import { useMatch } from "./match-shell";

/**
 * Authored prose with both of the page editor's affordances: the
 * Markdown subset in `match-markdown`, and this site's own
 * `[[project:…]]` reference tokens.
 *
 * The two are resolved in that order — blocks and emphasis first, then
 * tokens inside each run of plain text — so a link can sit inside a
 * bullet or a bold phrase without either feature needing to know the
 * other exists.
 */
export function MatchProse({
  text,
  /**
   * The page's headings, already slugged by the reference index. Passing
   * them in rather than re-deriving anchors here is what guarantees a
   * search result's jump link and the id it scrolls to are the same
   * string — they are minted once, in one place.
   */
  headings = [],
}: {
  text: string;
  headings?: PageHeading[];
}) {
  const { resolver } = useMatch();
  const blocks = parseMarkdown(text);

  // Headings come out of the parser in document order, so the nth
  // heading block is the nth anchor.
  let seen = 0;

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <Block
          key={index}
          block={block}
          resolver={resolver}
          anchor={block.type === "heading" ? headings[seen++]?.id : undefined}
        />
      ))}
    </div>
  );
}

/** Heading sizes step down from the page title, not from a fresh scale. */
const HEADING_CLASS: Record<number, string> = {
  1: "text-[22px] leading-snug font-medium text-[#202124]",
  2: "text-[18px] leading-snug font-medium text-[#202124]",
  3: "text-[15px] leading-snug font-medium text-[#202124]",
  4: "text-[13px] font-medium tracking-[0.08em] text-[#5f6368] uppercase",
};

function Block({
  block,
  resolver,
  anchor,
}: {
  block: MarkdownBlock;
  resolver: ReferenceResolver;
  /** Set on headings, so a link can land on this part of the page. */
  anchor?: string;
}) {
  switch (block.type) {
    case "heading": {
      // The prose is the body of a page, so its top heading is an h2 —
      // the title above it already owns the h1.
      const Tag = (["h2", "h3", "h4", "h5"] as const)[block.level - 1];
      return (
        <Tag
          id={anchor}
          // Clear the sticky header and tab strip when jumped to.
          className={`${HEADING_CLASS[block.level]} scroll-mt-32 first:mt-0`}
        >
          <Inline nodes={block.inline} resolver={resolver} />
        </Tag>
      );
    }

    case "paragraph":
      return (
        // Single newlines inside a paragraph stay newlines: pages are
        // often jotted with hard line breaks and shouldn't reflow.
        <p className="text-[16px] leading-7 whitespace-pre-line text-[#3c4043]">
          <Inline nodes={block.inline} resolver={resolver} />
        </p>
      );

    case "list":
      return <List items={block.items} ordered={block.ordered} resolver={resolver} />;

    case "rule":
      return <hr className="border-[#dadce0]" />;
  }
}

function List({
  items,
  ordered,
  resolver,
}: {
  items: MarkdownListItem[];
  ordered: boolean;
  resolver: ReferenceResolver;
}) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={`space-y-1.5 pl-5 text-[16px] leading-7 text-[#3c4043] ${
        ordered ? "list-decimal" : "list-disc"
      }`}
    >
      {items.map((item, index) => (
        <li key={index}>
          <Inline nodes={item.inline} resolver={resolver} />
          {item.children.length > 0 ? (
            <div className="mt-1.5">
              {/* Nested levels alternate their marker, as Markdown does. */}
              <List
                items={item.children}
                ordered={ordered}
                resolver={resolver}
              />
            </div>
          ) : null}
        </li>
      ))}
    </Tag>
  );
}

function Inline({
  nodes,
  resolver,
  /**
   * True inside a link, where a `[[…]]` token in the label would
   * otherwise resolve to a second link nested in the first one.
   */
  inLink = false,
}: {
  nodes: MarkdownInline[];
  resolver: ReferenceResolver;
  inLink?: boolean;
}) {
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.type) {
          case "text":
            return inLink ? (
              <Fragment key={index}>{node.text}</Fragment>
            ) : (
              <Tokens key={index} text={node.text} resolver={resolver} />
            );
          case "strong":
            return (
              <strong key={index} className="font-medium text-[#202124]">
                <Inline
                  nodes={node.children}
                  resolver={resolver}
                  inLink={inLink}
                />
              </strong>
            );
          case "em":
            return (
              <em key={index}>
                <Inline
                  nodes={node.children}
                  resolver={resolver}
                  inLink={inLink}
                />
              </em>
            );
          case "code":
            return (
              <code
                key={index}
                className="rounded bg-[#f1f3f4] px-1 py-0.5 font-mono text-[0.9em] text-[#202124]"
              >
                {node.text}
              </code>
            );
          case "link":
            return (
              <ExternalLink key={index} href={node.href}>
                <Inline nodes={node.children} resolver={resolver} inLink />
              </ExternalLink>
            );
        }
      })}
    </>
  );
}

/**
 * A link off this site.
 *
 * Drawn the same blue as an internal reference but with the arrow that
 * the rest of the page uses for leaving it, and opened in a new tab: a
 * reader following a citation out of a profile is not done with the
 * profile.
 */
function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline rounded-sm font-medium text-[#1a73e8] underline decoration-[#1a73e8]/40 underline-offset-[3px] transition-colors hover:bg-[#e8f0fe] hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a73e8]"
    >
      {children}
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
    </a>
  );
}

/** One run of plain text, with its `[[…]]` references turned into links. */
function Tokens({
  text,
  resolver,
}: {
  text: string;
  resolver: ReferenceResolver;
}) {
  return (
    <>
      {resolver.parse(text).map((segment, index) =>
        segment.type === "text" ? (
          <Fragment key={index}>{segment.text}</Fragment>
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
