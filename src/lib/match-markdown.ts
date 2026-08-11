/**
 * The slice of Markdown background notes are written in.
 *
 * Deliberately small: headings, lists (nested by indentation), bold,
 * italic and inline code. No links, images, tables, or HTML — a note
 * links to *this site's* entries with `[[project:…]]` tokens, and those
 * are resolved separately so a token can sit inside a bullet or a bold
 * run without either feature knowing about the other.
 *
 * Pure and serializable: the parser runs on the server for the page and
 * in the browser for the editor's preview, from the same source.
 */

export type MarkdownInline =
  | { type: "text"; text: string }
  | { type: "strong"; children: MarkdownInline[] }
  | { type: "em"; children: MarkdownInline[] }
  | { type: "code"; text: string };

export interface MarkdownListItem {
  inline: MarkdownInline[];
  /** Nested items, from a deeper indent under this one. */
  children: MarkdownListItem[];
}

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4; inline: MarkdownInline[] }
  | { type: "paragraph"; inline: MarkdownInline[] }
  | { type: "list"; ordered: boolean; items: MarkdownListItem[] }
  | { type: "rule" };

/** A tab is one indent level; so are two spaces, the other common habit. */
const SPACES_PER_INDENT = 2;

function indentWidth(prefix: string): number {
  let width = 0;
  for (const char of prefix) {
    // Round a tab up to the next stop rather than counting it as one
    // space, so tab-indented and space-indented lists nest alike.
    if (char === "\t") width += SPACES_PER_INDENT - (width % SPACES_PER_INDENT);
    else width += 1;
  }
  return Math.floor(width / SPACES_PER_INDENT);
}

const HEADING = /^(#{1,4})\s+(.*)$/;
const BULLET = /^([ \t]*)[-*+]\s+(.*)$/;
const ORDERED = /^([ \t]*)\d+[.)]\s+(.*)$/;
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;

interface RawItem {
  depth: number;
  text: string;
}

/** Fold a flat run of indented items into a tree. */
function nest(raw: RawItem[]): MarkdownListItem[] {
  const roots: MarkdownListItem[] = [];
  // Stack of open items by depth; index 0 holds the shallowest.
  const stack: MarkdownListItem[] = [];

  for (const entry of raw) {
    const item: MarkdownListItem = {
      inline: parseInline(entry.text),
      children: [],
    };
    // Over-indenting by more than one level is treated as one level —
    // people indent by feel, and a lost item is worse than a flat one.
    const depth = Math.min(entry.depth, stack.length);
    stack.length = depth;

    if (depth === 0) roots.push(item);
    else stack[depth - 1].children.push(item);

    stack.push(item);
  }

  return roots;
}

/**
 * Split prose into blocks. Unrecognized lines are paragraph text, so a
 * note written as plain prose renders exactly as it always did.
 */
export function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");

  let paragraph: string[] = [];
  let list: { ordered: boolean; raw: RawItem[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: "paragraph", inline: parseInline(paragraph.join("\n")) });
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    blocks.push({ type: "list", ordered: list.ordered, items: nest(list.raw) });
    list = null;
  };
  const flush = () => {
    flushParagraph();
    flushList();
  };

  for (const line of lines) {
    if (line.trim() === "") {
      flush();
      continue;
    }

    // A rule is checked before bullets: "---" matches both patterns.
    if (RULE.test(line)) {
      flush();
      blocks.push({ type: "rule" });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3 | 4,
        inline: parseInline(heading[2]),
      });
      continue;
    }

    const bullet = BULLET.exec(line);
    const ordered = bullet ? null : ORDERED.exec(line);
    const match = bullet ?? ordered;
    if (match) {
      flushParagraph();
      const isOrdered = bullet === null;
      // A switch between bullet and numbered starts a new list rather
      // than mixing markers inside one.
      if (list && list.ordered !== isOrdered) flushList();
      list ??= { ordered: isOrdered, raw: [] };
      list.raw.push({ depth: indentWidth(match[1]), text: match[2] });
      continue;
    }

    // A plain line under a list item continues that item's text.
    if (list && /^[ \t]/.test(line)) {
      const last = list.raw[list.raw.length - 1];
      if (last) {
        last.text += ` ${line.trim()}`;
        continue;
      }
    }

    flushList();
    paragraph.push(line);
  }

  flush();
  return blocks;
}

/**
 * `**bold**`, `*italic*` / `_italic_`, and `` `code` ``.
 *
 * Scanned left to right rather than by regex replacement so nesting
 * works and an unmatched marker stays literal — a lone asterisk in
 * prose should read as an asterisk, not swallow the rest of the line.
 */
export function parseInline(source: string): MarkdownInline[] {
  const nodes: MarkdownInline[] = [];
  let text = "";

  const pushText = () => {
    if (text === "") return;
    nodes.push({ type: "text", text });
    text = "";
  };

  let index = 0;
  while (index < source.length) {
    const rest = source.slice(index);

    // Code first: markers inside a span are literal.
    const code = /^`([^`]+)`/.exec(rest);
    if (code) {
      pushText();
      nodes.push({ type: "code", text: code[1] });
      index += code[0].length;
      continue;
    }

    const strong = /^(\*\*|__)(?=\S)([\s\S]*?\S)\1/.exec(rest);
    if (strong) {
      pushText();
      nodes.push({ type: "strong", children: parseInline(strong[2]) });
      index += strong[0].length;
      continue;
    }

    const em = /^(\*|_)(?=\S)([\s\S]*?\S)\1(?!\1)/.exec(rest);
    if (em) {
      pushText();
      nodes.push({ type: "em", children: parseInline(em[2]) });
      index += em[0].length;
      continue;
    }

    text += source[index];
    index += 1;
  }

  pushText();
  return nodes;
}

/**
 * The same prose with its formatting stripped — for previews, search
 * snippets, and anywhere the marks would be read out as punctuation.
 */
export function markdownToPlainText(source: string): string {
  return parseMarkdown(source)
    .flatMap((block) => {
      switch (block.type) {
        case "heading":
        case "paragraph":
          return [inlineToPlainText(block.inline)];
        case "list":
          return flattenItems(block.items);
        case "rule":
          return [];
      }
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function flattenItems(items: MarkdownListItem[]): string[] {
  return items.flatMap((item) => [
    inlineToPlainText(item.inline),
    ...flattenItems(item.children),
  ]);
}

function inlineToPlainText(nodes: MarkdownInline[]): string {
  return nodes
    .map((node) =>
      node.type === "text" || node.type === "code"
        ? node.text
        : inlineToPlainText(node.children),
    )
    .join("");
}
