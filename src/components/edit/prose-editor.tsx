"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  parseMarkdown,
  type MarkdownBlock,
  type MarkdownInline,
  type MarkdownListItem,
} from "@/lib/match-markdown";
import {
  KIND_LABEL,
  TOKEN_PATTERN,
  type ReferenceKind,
} from "@/lib/match-references";
import {
  referenceToken,
  writeReferenceToken,
  type ReferenceOption,
} from "@/lib/reference-options";
import { inputClass } from "@/components/edit/form-fields";

interface ProseEditorProps {
  /**
   * Posts under this name. Omitted when a parent owns the value and
   * submits it some other way — an unnamed field posts nothing, which
   * is exactly right for one whose value is already in a hidden input.
   */
  name?: string;
  /** Ties the field to its <Field> label. */
  id?: string;
  initial: string;
  rows: number;
  placeholder: string;
  /** Everything on the site a `[[…]]` token can point at. */
  options: ReferenceOption[];
  /**
   * Drop the Markdown buttons and keep the linking.
   *
   * For the short fields — an intro, a line describing a result — where
   * headings and lists have nowhere to render, but a link to a project
   * or a role is exactly what the sentence wants.
   */
  compact?: boolean;
  /** Controlled value, for fields whose state the parent owns. */
  value?: string;
  onChange?: (value: string) => void;
}

/** One indent level. Tabs, because that's what the Tab key inserts. */
const INDENT = "\t";

/** A `[[…]]` token as written, and where in the source it sits. */
interface TokenSpan {
  start: number;
  end: number;
  /** The kind exactly as spelled, `note:` included. */
  kind: string;
  name: string;
  /** The display text, empty when the token shows the entry's name. */
  label: string;
}

/**
 * The link the caret is sitting in, if it is sitting in one.
 *
 * Touching either end counts, because that is where the caret is left
 * after a link is inserted — so "insert a link, then fix what it says"
 * is one gesture rather than a hunt for the middle of the token.
 */
function tokenAt(value: string, from: number, to: number): TokenSpan | null {
  // A fresh regex per call: TOKEN_PATTERN is global and stateful.
  const pattern = new RegExp(TOKEN_PATTERN.source, TOKEN_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (from >= start && to <= end) {
      return {
        start,
        end,
        kind: match[1],
        name: match[2].trim(),
        label: match[3]?.trim() ?? "",
      };
    }
  }

  return null;
}

/** What a token's kind is called, with the legacy spelling folded in. */
function kindLabel(kind: string): string {
  return KIND_LABEL[(kind === "note" ? "page" : kind) as ReferenceKind] ?? kind;
}

/**
 * The link the toolbar is working on.
 *
 * One shape for both jobs: writing a new link over the selection, and
 * rewriting one already in the text. The difference is only whether
 * `span` found something and what `range` therefore covers — which is
 * what lets the same panel choose a target and change the words.
 */
interface LinkDraft {
  /** The existing token being edited, or null when inserting. */
  span: TokenSpan | null;
  /** What the link should read as. Empty means the entry's own name. */
  text: string;
  /** The source range the finished token replaces. */
  range: [number, number];
}

/**
 * Every place the site's own prose is written: a plain textarea with the
 * small set of affordances that prose actually has — Markdown marks, Tab
 * to indent a list, and a picker that inserts a link to anything else on
 * the site.
 *
 * One component for all of them on purpose. The `[[kind:name]]` tokens
 * mean the same thing wherever they are written, so the way you insert
 * one shouldn't depend on which box you happen to be typing in.
 *
 * A link can say something other than the name of what it points at —
 * `[[project:Figgie Genius|the one with the bots]]` — because prose that
 * has to name its subject in full every time it mentions it isn't prose.
 * The panel writes that half of the token and edits it afterwards, so
 * rewording a link never means retyping the link.
 *
 * Headings earn their button here. A `## heading` is not decoration: it
 * becomes an anchor on the published page and a jump link under that
 * page's search result, so the way a page is broken up is the way it can
 * be found.
 *
 * It stays a textarea rather than becoming a rich-text surface. The
 * stored value is the Markdown source: it goes to the model in the
 * prompt as well as to the page, and a WYSIWYG layer would put a
 * lossy translation between what's typed and what's grounded on.
 */
export function ProseEditor({
  name,
  id,
  initial,
  rows,
  placeholder,
  options,
  compact = false,
  value: controlled,
  onChange,
}: ProseEditorProps) {
  // Uncontrolled by default — the field posts itself under `name`, and
  // nothing outside needs to watch it. A parent that keeps the value in
  // its own state (a row in a list, say) passes it down instead, and the
  // editing helpers below are written against `value`/`setValue` either
  // way rather than branching at every call site.
  const [ownValue, setOwnValue] = useState(initial);
  const value = controlled ?? ownValue;
  const setValue = (next: string) => {
    if (controlled === undefined) setOwnValue(next);
    onChange?.(next);
  };

  const [preview, setPreview] = useState(false);
  const [draft, setDraft] = useState<LinkDraft | null>(null);
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

  /**
   * Open the link panel on whatever the caret is on.
   *
   * The selection is read here rather than when the panel acts on it,
   * for two reasons: the panel's own inputs take the focus, and a
   * preview swap unmounts the textarea entirely. Both would leave a
   * later read of `selectionStart` pointing at nothing.
   */
  function openLink() {
    const area = areaRef.current;
    const from = area?.selectionStart ?? value.length;
    const to = area?.selectionEnd ?? from;
    const span = tokenAt(value, from, to);

    setPreview(false);
    setDraft({
      span,
      // Words already selected are what the link should say; a link
      // already written keeps saying what it says until told otherwise.
      text: span ? span.label : value.slice(from, to).trim(),
      range: span ? [span.start, span.end] : [from, to],
    });
  }

  /** Write a finished token over the range the draft claimed. */
  function writeLink(token: string, [from, to]: [number, number]) {
    const next = value.slice(0, from) + token + value.slice(to);
    // The caret lands inside the new token, so the panel reopens on this
    // link rather than starting a new one beside it.
    apply(next, from + token.length, from + token.length);
    setDraft(null);
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
        {compact ? null : (
          <>
            <ToolButton
              label="H2"
              title="Heading"
              onClick={() => prefixLines("## ")}
            />
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
            <ToolButton
              label="•"
              title="Bullet list"
              onClick={() => prefixLines("- ")}
            />
            <ToolButton
              label="1."
              title="Numbered list"
              onClick={() => prefixLines((index) => `${index + 1}. `)}
            />
            <ToolButton label="‹›" title="Inline code" onClick={() => wrap("`")} />
            <span className="mx-1 h-4 w-px bg-(--line)" aria-hidden />
          </>
        )}
        <ToolButton
          label="Link to…"
          title="Insert a link to a project, role, course, skill or page — or change what the link at the caret says"
          onClick={() => (draft ? setDraft(null) : openLink())}
          active={draft !== null}
        />
        <button
          type="button"
          onClick={() => setPreview((on) => !on)}
          className="ml-auto rounded-md border border-(--line) px-2.5 py-1 font-sans text-xs text-(--dim) transition-colors duration-200 hover:border-(--accent) hover:text-(--accent)"
        >
          {preview ? "Write" : "Preview"}
        </button>
      </div>

      {draft ? (
        <LinkPanel
          draft={draft}
          options={options}
          onText={(text) => setDraft({ ...draft, text })}
          onPick={(option) =>
            writeLink(referenceToken(option, draft.text), draft.range)
          }
          onSaveText={() => {
            const { span, text, range } = draft;
            if (!span) return;
            writeLink(writeReferenceToken(span.kind, span.name, text), range);
          }}
          onClose={() => setDraft(null)}
        />
      ) : null}

      {/* The value posts either way — preview only swaps what's shown. */}
      <textarea
        ref={areaRef}
        id={id}
        name={name || undefined}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        className={`${inputClass} font-mono text-[13px] leading-6 ${
          preview ? "hidden" : ""
        }`}
      />

      {preview ? <ProsePreview source={value} options={options} /> : null}

      <p className="font-sans text-[11px] leading-5 text-(--dim)">
        {compact ? (
          <>
            Use <span className="font-medium">Link to…</span> to mention a page,
            role, project, course or skill — it becomes a link to that
            entry&apos;s page. Select words first, or fill in{" "}
            <span className="font-medium">Link text</span>, to have the link
            read as something other than the entry&apos;s name; put the caret
            on a link and press it again to change those words later.
          </>
        ) : (
          <>
            Markdown: <code className="font-mono">## heading</code>,{" "}
            <code className="font-mono">- bullet</code> (Tab to nest),{" "}
            <code className="font-mono">**bold**</code>,{" "}
            <code className="font-mono">*italic*</code>. Tab indents inside the
            box — press Escape first if you want to tab out of it. Links carry
            their own words: select them before pressing{" "}
            <span className="font-medium">Link to…</span>, or put the caret on
            a link and press it again to reword it.
          </>
        )}
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

/**
 * The link panel: what the link points at, and what it says.
 *
 * Both at once rather than in two steps, because they are two halves of
 * one decision — the reason to write "the one with the bots" instead of
 * "Figgie Genius" is the sentence around it, which is on screen while
 * this is open. Opened on an existing link it starts from that link's
 * own words, so changing them leaves the target alone; picking a
 * different entry from the list retargets the link and keeps the words.
 */
function LinkPanel({
  draft,
  options,
  onText,
  onPick,
  onSaveText,
  onClose,
}: {
  draft: LinkDraft;
  options: ReferenceOption[];
  onText: (text: string) => void;
  onPick: (option: ReferenceOption) => void;
  onSaveText: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const editing = draft.span;

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pool = needle
      ? options.filter(
          (option) =>
            option.name.toLowerCase().includes(needle) ||
            (option.detail ?? "").toLowerCase().includes(needle) ||
            // Searching the kind is how you browse rather than recall:
            // "coursework" or "role" lists them without knowing a name.
            option.label.toLowerCase().includes(needle),
        )
      : options;
    return pool.slice(0, PICKER_LIMIT);
  }, [options, query]);

  return (
    <div className="space-y-3 rounded-md border border-(--accent) bg-(--bg) p-3">
      {editing ? (
        <p className="flex flex-wrap items-baseline gap-2 font-sans text-xs text-(--dim)">
          <span className="text-[10px] tracking-[0.1em] uppercase">
            Editing link
          </span>
          <span className="text-(--text)">
            {kindLabel(editing.kind)} · {editing.name}
          </span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-48 flex-1 font-sans text-[11px] text-(--dim)">
          Link text
          <input
            // On an existing link this is what you came to change, so it
            // takes the focus; on a new one the target isn't chosen yet.
            autoFocus={editing !== null}
            value={draft.text}
            onChange={(event) => onText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "Enter") {
                event.preventDefault();
                if (editing) onSaveText();
              }
            }}
            placeholder={editing ? editing.name : "The entry's own name"}
            className={`${inputClass} mt-1`}
          />
        </label>
        {editing ? (
          <button
            type="button"
            onClick={onSaveText}
            className="rounded-md border border-(--accent) px-3 py-2 font-sans text-xs text-(--accent) transition-colors duration-200 hover:bg-(--hover-bg)"
          >
            Save text
          </button>
        ) : null}
      </div>

      <div>
        <input
          autoFocus={editing === null}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "Enter") {
              event.preventDefault();
              if (matches[0]) onPick(matches[0]);
            }
          }}
          placeholder={
            editing
              ? "Point this link somewhere else…"
              : "Find a page, role, project, coursework, course or skill…"
          }
          className={inputClass}
        />
      </div>

      {options.length === 0 ? (
        <p className="font-sans text-xs text-(--dim)">
          Nothing to link to yet — add work on the main site first.
        </p>
      ) : matches.length === 0 ? (
        <p className="font-sans text-xs text-(--dim)">
          Nothing matches “{query.trim()}”.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {matches.map((option) => (
            <li key={`${option.kind}:${option.name}`}>
              <button
                type="button"
                onClick={() => onPick(option)}
                className="flex w-full items-baseline gap-2 rounded px-2 py-1 text-left font-sans text-sm text-(--text) transition-colors duration-150 hover:bg-(--hover-bg)"
              >
                <span className="shrink-0 font-sans text-[10px] tracking-[0.1em] text-(--dim) uppercase">
                  {option.label}
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
 * What the page will look like, with links checked.
 *
 * The team-matching renderer can't be reused here: it resolves tokens
 * against the live index through React context that only exists inside
 * that page's shell. This one resolves against the same option list the
 * picker uses, which buys something the real renderer can't offer — a
 * token that won't resolve is shown as broken rather than silently
 * degrading to plain words.
 */
function ProsePreview({
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
  // The resolver's own pattern, `note:` included: the old spelling still
  // resolves, and the preview would otherwise call a working link broken.
  const pattern = new RegExp(TOKEN_PATTERN.source, TOKEN_PATTERN.flags);
  let cursor = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) pieces.push(text.slice(cursor, match.index));
    cursor = match.index + match[0].length;

    const [, rawKind, rawName, rawLabel] = match;
    // `note:` is the old spelling of `page:`; both resolve the same way.
    const kind = rawKind === "note" ? "page" : rawKind;
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
