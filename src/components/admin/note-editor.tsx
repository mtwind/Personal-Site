"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  parseMarkdown,
  type MarkdownBlock,
  type MarkdownInline,
  type MarkdownListItem,
} from "@/lib/match-markdown";
import { KIND_LABEL } from "@/lib/match-references";
import {
  referenceToken,
  type ReferenceOption,
} from "@/lib/reference-options";
import { inputClass } from "@/components/edit/form-fields";

interface NoteEditorProps {
  name: string;
  initial: string;
  rows: number;
  placeholder: string;
  /** Everything on the site a `[[…]]` token can point at. */
  options: ReferenceOption[];
}

/** One indent level. Tabs, because that's what the Tab key inserts. */
const INDENT = "\t";

/**
 * The note body field: a plain textarea with the small set of editing
 * affordances the note format actually has — Markdown marks, Tab to
 * indent a list, and a picker that inserts a link to something else on
 * the site.
 *
 * It stays a textarea rather than becoming a rich-text surface. The
 * stored value is the Markdown source: it goes to the model in the
 * prompt as well as to the page, and a WYSIWYG layer would put a
 * lossy translation between what's typed and what's grounded on.
 */
export function NoteEditor({
  name,
  initial,
  rows,
  placeholder,
  options,
}: NoteEditorProps) {
  const [value, setValue] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [picking, setPicking] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  // Escape releases the Tab key back to focus movement, so the field is
  // never a keyboard trap.
  const escapedRef = useRef(false);
  /** Where the caret belongs once React has written the new value. */
  const pendingRef = useRef<[number, number] | null>(null);

  // The selection has to be restored *after* the commit that changes the
  // textarea's value — writing `value` resets the caret, so setting it
  // beforehand (from a rAF, say) is silently undone.
  useLayoutEffect(() => {
    const range = pendingRef.current;
    const area = areaRef.current;
    pendingRef.current = null;
    if (!range || !area) return;
    area.focus();
    area.setSelectionRange(range[0], range[1]);
  }, [value]);

  /** Replace a range and put the caret where the editor expects it. */
  function apply(next: string, selectionStart: number, selectionEnd: number) {
    pendingRef.current = [selectionStart, selectionEnd];
    setValue(next);
  }

  function insert(text: string) {
    const area = areaRef.current;
    if (!area) return;
    const { selectionStart: start, selectionEnd: end } = area;
    const next = value.slice(0, start) + text + value.slice(end);
    apply(next, start + text.length, start + text.length);
  }

  /** Wrap the selection, or drop the marks in and sit between them. */
  function wrap(mark: string) {
    const area = areaRef.current;
    if (!area) return;
    const { selectionStart: start, selectionEnd: end } = area;
    const selected = value.slice(start, end);
    const next =
      value.slice(0, start) + mark + selected + mark + value.slice(end);
    apply(
      next,
      start + mark.length,
      start + mark.length + selected.length,
    );
  }

  /** Prefix every line the selection touches — headings and lists. */
  function prefixLines(prefix: string | ((index: number) => string)) {
    const area = areaRef.current;
    if (!area) return;
    const { selectionStart: start, selectionEnd: end } = area;
    const from = value.lastIndexOf("\n", start - 1) + 1;
    const toIndex = value.indexOf("\n", end);
    const to = toIndex === -1 ? value.length : toIndex;

    const lines = value.slice(from, to).split("\n");
    const rewritten = lines
      .map((line, index) => {
        const mark = typeof prefix === "string" ? prefix : prefix(index);
        // The marker goes after any indent, not before it — bulleting a
        // nested line must keep it nested.
        const indent = /^[ \t]*/.exec(line)?.[0] ?? "";
        const rest = line.slice(indent.length);
        // Toggle: applying the same prefix twice takes it off again.
        return rest.startsWith(mark)
          ? indent + rest.slice(mark.length)
          : indent + mark + rest;
      })
      .join("\n");

    const next = value.slice(0, from) + rewritten + value.slice(to);
    apply(next, from, from + rewritten.length);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      escapedRef.current = true;
      return;
    }
    if (event.key !== "Tab" || escapedRef.current) {
      escapedRef.current = false;
      return;
    }

    const area = event.currentTarget;
    const { selectionStart: start, selectionEnd: end } = area;
    const multiline = value.slice(start, end).includes("\n");

    // A plain Tab inside one line is just an indent character; across a
    // selection, or with Shift, it shifts whole lines.
    if (!multiline && !event.shiftKey) {
      event.preventDefault();
      insert(INDENT);
      return;
    }

    event.preventDefault();
    const from = value.lastIndexOf("\n", start - 1) + 1;
    const toIndex = value.indexOf("\n", end);
    const to = toIndex === -1 ? value.length : toIndex;
    const rewritten = value
      .slice(from, to)
      .split("\n")
      .map((line) =>
        event.shiftKey
          ? line.replace(/^(\t| {1,2})/, "")
          : INDENT + line,
      )
      .join("\n");

    const next = value.slice(0, from) + rewritten + value.slice(to);
    apply(next, from, from + rewritten.length);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <ToolButton label="H2" title="Heading" onClick={() => prefixLines("## ")} />
        <ToolButton
          label="B"
          title="Bold"
          className="font-bold"
          onClick={() => wrap("**")}
        />
        <ToolButton
          label="I"
          title="Italic"
          className="italic"
          onClick={() => wrap("*")}
        />
        <ToolButton label="•" title="Bullet list" onClick={() => prefixLines("- ")} />
        <ToolButton
          label="1."
          title="Numbered list"
          onClick={() => prefixLines((index) => `${index + 1}. `)}
        />
        <ToolButton
          label="‹›"
          title="Inline code"
          onClick={() => wrap("`")}
        />
        <span className="mx-1 h-4 w-px bg-(--line)" aria-hidden />
        <ToolButton
          label="Link to…"
          title="Insert a link to a project, role, course, skill or note"
          onClick={() => {
            // Back to the source first: the token lands at the caret,
            // and a caret you can't see is a token you can't place.
            if (!picking) {
              setPreview(false);
              requestAnimationFrame(() => areaRef.current?.focus());
            }
            setPicking((open) => !open);
          }}
          active={picking}
        />
        <button
          type="button"
          onClick={() => setPreview((on) => !on)}
          className="ml-auto rounded-md border border-(--line) px-2.5 py-1 font-sans text-xs text-(--dim) transition-colors duration-200 hover:border-(--accent) hover:text-(--accent)"
        >
          {preview ? "Write" : "Preview"}
        </button>
      </div>

      {picking ? (
        <ReferencePicker
          options={options}
          onPick={(option) => {
            insert(referenceToken(option));
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}

      {/* The value posts either way — preview only swaps what's shown. */}
      <textarea
        ref={areaRef}
        name={name}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        className={`${inputClass} font-mono text-[13px] leading-6 ${
          preview ? "hidden" : ""
        }`}
      />

      {preview ? <NotePreview source={value} options={options} /> : null}

      <p className="font-sans text-[11px] leading-5 text-(--dim)">
        Markdown: <code className="font-mono">## heading</code>,{" "}
        <code className="font-mono">- bullet</code> (Tab to nest),{" "}
        <code className="font-mono">**bold**</code>,{" "}
        <code className="font-mono">*italic*</code>. Tab indents inside the
        box — press Escape first if you want to tab out of it.
      </p>
    </div>
  );
}

function ToolButton({
  label,
  title,
  onClick,
  className = "",
  active = false,
}: {
  label: string;
  title: string;
  onClick: () => void;
  className?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`min-w-8 rounded-md border px-2 py-1 font-sans text-xs transition-colors duration-200 ${
        active
          ? "border-(--accent) bg-(--hover-bg) text-(--accent)"
          : "border-(--line) text-(--text) hover:border-(--accent) hover:text-(--accent)"
      } ${className}`}
    >
      {label}
    </button>
  );
}

/** How many matches the picker shows before asking for a better query. */
const PICKER_LIMIT = 8;

function ReferencePicker({
  options,
  onPick,
  onClose,
}: {
  options: ReferenceOption[];
  onPick: (option: ReferenceOption) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pool = needle
      ? options.filter(
          (option) =>
            option.name.toLowerCase().includes(needle) ||
            (option.detail ?? "").toLowerCase().includes(needle),
        )
      : options;
    return pool.slice(0, PICKER_LIMIT);
  }, [options, query]);

  return (
    <div className="rounded-md border border-(--accent) bg-(--bg) p-3">
      <input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
          if (event.key === "Enter") {
            event.preventDefault();
            if (matches[0]) onPick(matches[0]);
          }
        }}
        placeholder="Find a project, role, course, skill or published note…"
        className={inputClass}
      />
      {options.length === 0 ? (
        <p className="mt-2 font-sans text-xs text-(--dim)">
          Nothing to link to yet — add work on the main site first.
        </p>
      ) : matches.length === 0 ? (
        <p className="mt-2 font-sans text-xs text-(--dim)">
          Nothing matches “{query.trim()}”.
        </p>
      ) : (
        <ul className="mt-2 space-y-0.5">
          {matches.map((option) => (
            <li key={`${option.kind}:${option.name}`}>
              <button
                type="button"
                onClick={() => onPick(option)}
                className="flex w-full items-baseline gap-2 rounded px-2 py-1 text-left font-sans text-sm text-(--text) transition-colors duration-150 hover:bg-(--hover-bg)"
              >
                <span className="shrink-0 font-sans text-[10px] tracking-[0.1em] text-(--dim) uppercase">
                  {KIND_LABEL[option.kind]}
                </span>
                <span className="min-w-0 truncate">{option.name}</span>
                {option.detail ? (
                  <span className="ml-auto shrink-0 truncate font-sans text-xs text-(--dim)">
                    {option.detail}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * What the note will look like, with links checked.
 *
 * The team-matching renderer can't be reused here: it resolves tokens
 * against the live index through React context that only exists inside
 * that page's shell. This one resolves against the same option list the
 * picker uses, which buys something the real renderer can't offer — a
 * token that won't resolve is shown as broken rather than silently
 * degrading to plain words.
 */
function NotePreview({
  source,
  options,
}: {
  source: string;
  options: ReferenceOption[];
}) {
  const known = useMemo(
    () =>
      new Set(
        options.map(
          (option) => `${option.kind}:${option.name.trim().toLowerCase()}`,
        ),
      ),
    [options],
  );

  const blocks = parseMarkdown(source);

  if (source.trim() === "") {
    return (
      <p className="rounded-md border border-(--line) px-4 py-6 text-center font-sans text-sm text-(--dim) italic">
        Nothing to preview yet.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-(--line) bg-(--bg-elev) px-4 py-4">
      {blocks.map((block, index) => (
        <PreviewBlock key={index} block={block} known={known} />
      ))}
    </div>
  );
}

const PREVIEW_HEADING: Record<number, string> = {
  1: "text-[18px] font-medium text-(--title)",
  2: "text-[16px] font-medium text-(--title)",
  3: "text-[14px] font-medium text-(--title)",
  4: "font-sans text-[11px] font-semibold tracking-[0.12em] text-(--dim) uppercase",
};

function PreviewBlock({
  block,
  known,
}: {
  block: MarkdownBlock;
  known: Set<string>;
}) {
  switch (block.type) {
    case "heading":
      return (
        <p className={PREVIEW_HEADING[block.level]}>
          <PreviewInline nodes={block.inline} known={known} />
        </p>
      );
    case "paragraph":
      return (
        <p className="text-[14px] leading-6 whitespace-pre-line text-(--text)">
          <PreviewInline nodes={block.inline} known={known} />
        </p>
      );
    case "list":
      return <PreviewList items={block.items} ordered={block.ordered} known={known} />;
    case "rule":
      return <hr className="border-(--line)" />;
  }
}

function PreviewList({
  items,
  ordered,
  known,
}: {
  items: MarkdownListItem[];
  ordered: boolean;
  known: Set<string>;
}) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={`space-y-1 pl-5 text-[14px] leading-6 text-(--text) ${
        ordered ? "list-decimal" : "list-disc"
      }`}
    >
      {items.map((item, index) => (
        <li key={index}>
          <PreviewInline nodes={item.inline} known={known} />
          {item.children.length > 0 ? (
            <div className="mt-1">
              <PreviewList items={item.children} ordered={ordered} known={known} />
            </div>
          ) : null}
        </li>
      ))}
    </Tag>
  );
}

/** `[[kind:name]]` or `[[kind:name|label]]`, mirroring the resolver. */
const TOKEN = /\[\[(project|skill|course|experience|note):([^\]|]+)(?:\|([^\]]*))?\]\]/g;

function PreviewInline({
  nodes,
  known,
}: {
  nodes: MarkdownInline[];
  known: Set<string>;
}) {
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.type) {
          case "text":
            return <PreviewTokens key={index} text={node.text} known={known} />;
          case "strong":
            return (
              <strong key={index} className="font-semibold text-(--title)">
                <PreviewInline nodes={node.children} known={known} />
              </strong>
            );
          case "em":
            return (
              <em key={index}>
                <PreviewInline nodes={node.children} known={known} />
              </em>
            );
          case "code":
            return (
              <code
                key={index}
                className="rounded bg-(--hover-bg) px-1 py-0.5 font-mono text-[0.9em]"
              >
                {node.text}
              </code>
            );
        }
      })}
    </>
  );
}

function PreviewTokens({
  text,
  known,
}: {
  text: string;
  known: Set<string>;
}) {
  const pieces: React.ReactNode[] = [];
  const pattern = new RegExp(TOKEN.source, TOKEN.flags);
  let cursor = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) pieces.push(text.slice(cursor, match.index));
    cursor = match.index + match[0].length;

    const [, kind, rawName, rawLabel] = match;
    const name = rawName.trim();
    const label = rawLabel?.trim() || name;
    const resolves = known.has(`${kind}:${name.toLowerCase()}`);

    pieces.push(
      resolves ? (
        <span
          key={key++}
          className="font-medium text-(--accent) underline decoration-dotted underline-offset-2"
        >
          {label}
        </span>
      ) : (
        <span
          key={key++}
          title={`No ${kind} named “${name}” — this will render as plain text.`}
          className="rounded-sm border-b border-dashed border-(--danger) text-(--danger)"
        >
          {label}
        </span>
      ),
    );
  }
  if (cursor < text.length) pieces.push(text.slice(cursor));

  return <>{pieces}</>;
}
