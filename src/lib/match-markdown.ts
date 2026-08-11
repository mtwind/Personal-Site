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

/** A heading in the source, as its plain text and its level. */
export interface MarkdownHeading {
  level: 1 | 2 | 3 | 4;
  text: string;
}

/**
 * Every heading in a document, in order.
 *
 * This is what turns a long page into a set of destinations: each one
 * gets an anchor on the page, and a search result lists the ones the
 * query actually hit so a reader lands on the part they asked about
 * rather than at the top.
 *
 * Anchors aren't minted here — the id has to agree with how the rest of
 * the site slugs names, and that lives with the reference index.
 */
export function markdownHeadings(source: string): MarkdownHeading[] {
  return parseMarkdown(source).flatMap((block) =>
    block.type === "heading"
      ? [{ level: block.level, text: inlineToPlainText(block.inline) }]
      : [],
  );
}

/**
 * The prose before the first heading — a document's own lead.
 *
 * What a result shows under its title should read like an opening, and
 * flattening the whole document would splice the headings into it: "…
 * Team Something about teams Location …", with those same headings
 * listed again underneath as jump links.
 *
 * A page that opens straight into a heading has no lead of its own, so
 * its first section stands in — still prose, still its beginning, still
 * without the heading word doubled.
 */
export function markdownLeadText(source: string): string {
  const blocks = parseMarkdown(source);
  const lead: string[] = [];

  for (const block of blocks) {
    if (block.type === "heading") break;
    if (block.type === "paragraph") lead.push(inlineToPlainText(block.inline));
    else if (block.type === "list") lead.push(...flattenItems(block.items));
  }

  const text = lead.join(" ").replace(/\s+/g, " ").trim();
  if (text !== "") return text;

  const firstSection = markdownSectionText(source, 0);
  return firstSection === "" ? markdownToPlainText(source) : firstSection;
}

/**
 * The prose that sits *under* a heading, up to the next one of the same
 * level or shallower. Search snippets read from this, so a jump link can
 * describe where it lands instead of repeating the page's opening line.
 */
export function markdownSectionText(
  source: string,
  /** Index into `markdownHeadings(source)`. */
  headingIndex: number,
): string {
  const blocks = parseMarkdown(source);
  const starts = blocks.flatMap((block, index) =>
    block.type === "heading" ? [index] : [],
  );
  const start = starts[headingIndex];
  if (start === undefined) return "";

  const level = (blocks[start] as { level: number }).level;
  const body: string[] = [];

  for (const block of blocks.slice(start + 1)) {
    if (block.type === "heading" && block.level <= level) break;
    switch (block.type) {
      case "heading":
      case "paragraph":
        body.push(inlineToPlainText(block.inline));
        break;
      case "list":
        body.push(...flattenItems(block.items));
        break;
      case "rule":
        break;
    }
  }

  return body.join(" ").replace(/\s+/g, " ").trim();
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
