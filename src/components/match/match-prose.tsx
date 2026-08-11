"use client";

import { Fragment } from "react";

import {
  parseMarkdown,
  type MarkdownBlock,
  type MarkdownInline,
  type MarkdownListItem,
} from "@/lib/match-markdown";
import type { ReferenceResolver } from "@/lib/match-references";
import { ReferenceChip } from "./match-rich-text";
import { useMatch } from "./match-shell";

/**
 * Authored prose with both of the note editor's affordances: the
 * Markdown subset in `match-markdown`, and this site's own
 * `[[project:…]]` reference tokens.
 *
 * The two are resolved in that order — blocks and emphasis first, then
 * tokens inside each run of plain text — so a link can sit inside a
 * bullet or a bold phrase without either feature needing to know the
 * other exists.
 */
export function MatchProse({ text }: { text: string }) {
  const { resolver } = useMatch();
  const blocks = parseMarkdown(text);

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <Block key={index} block={block} resolver={resolver} />
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
}: {
  block: MarkdownBlock;
  resolver: ReferenceResolver;
}) {
  switch (block.type) {
    case "heading": {
      // A note is a fragment of a page, so its top heading is an h2 —
      // the entry title above it already owns the h1.
      const Tag = (["h2", "h3", "h4", "h5"] as const)[block.level - 1];
      return (
        <Tag className={`${HEADING_CLASS[block.level]} first:mt-0`}>
          <Inline nodes={block.inline} resolver={resolver} />
        </Tag>
      );
    }

    case "paragraph":
      return (
        // Single newlines inside a paragraph stay newlines: notes are
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
}: {
  nodes: MarkdownInline[];
  resolver: ReferenceResolver;
}) {
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.type) {
          case "text":
            return <Tokens key={index} text={node.text} resolver={resolver} />;
          case "strong":
            return (
              <strong key={index} className="font-medium text-[#202124]">
                <Inline nodes={node.children} resolver={resolver} />
              </strong>
            );
          case "em":
            return (
              <em key={index}>
                <Inline nodes={node.children} resolver={resolver} />
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
        }
      })}
    </>
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
