import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { getServerEnv } from "@/lib/env";
import { DOCUMENT_TYPES } from "@/lib/upload-limits";
import { UserFacingError } from "@/lib/user-facing-error";

/**
 * Turn an uploaded document into text the AI overview can be grounded on.
 *
 * A PDF sitting in storage is invisible to the model, so a document is
 * only useful once it has been read out. Claude does the reading — it
 * handles scans and photographs, which a PDF text-layer parser cannot —
 * and the result lands in an editable field rather than going straight
 * to visitors. Extraction is a first draft, and the editor is the one
 * who decides it is right.
 */

/** Claude Opus 5 — this is transcription of someone's own documents. */
const MODEL = "claude-opus-5";

/**
 * Room for a long document. Thinking is on by default on this model and
 * shares the budget with the transcription, so this is deliberately
 * generous; the request streams, which is what keeps a long extraction
 * from tripping the SDK's HTTP timeout.
 */
const MAX_TOKENS = 32000;

/** Error whose message is safe to show the editor. */
export class ExtractionError extends UserFacingError {}

const INSTRUCTIONS = `You transcribe documents into plain text for a personal website's private knowledge base.

Transcribe the document faithfully and completely:
- Reproduce the wording as it appears. Do not summarize, paraphrase, correct, or editorialize.
- Keep the structure with light Markdown: headings, lists, and tables as Markdown tables.
- Drop pure layout furniture — page numbers, repeated headers and footers, decorative rules.
- Where the source is genuinely illegible, write [illegible] rather than guessing at it.
- Output only the transcription. No preamble, no closing remark, no commentary about the document.`;

/** Whether extraction is configured at all. */
export function extractionAvailable(): boolean {
  return Boolean(getServerEnv().ANTHROPIC_API_KEY);
}

/**
 * Read a file's text. Plain-text uploads are read directly — sending
 * text to a model to have it read back is a round trip that can only
 * introduce errors.
 */
export async function extractDocumentText(file: File): Promise<string> {
  const kind = DOCUMENT_TYPES[file.type];
  if (!kind) {
    throw new ExtractionError(
      "Unsupported file — use a PDF, a text or Markdown file, or an image.",
    );
  }

  if (kind === "text") {
    return (await file.text()).trim();
  }

  const apiKey = getServerEnv().ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ExtractionError(
      "No Anthropic key is configured, so PDFs and images can't be read. Paste the text in by hand instead.",
    );
  }

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const source =
    kind === "pdf"
      ? ({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data,
          },
        } as const)
      : ({
          type: "image",
          source: {
            type: "base64",
            media_type: file.type as
              | "image/jpeg"
              | "image/png"
              | "image/webp"
              | "image/gif",
            data,
          },
        } as const);

  const client = new Anthropic({ apiKey });

  let message;
  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: INSTRUCTIONS,
      messages: [
        {
          role: "user",
          content: [source, { type: "text", text: "Transcribe this document." }],
        },
      ],
    });
    message = await stream.finalMessage();
  } catch (error: unknown) {
    console.error("Document extraction failed:", error);
    throw new ExtractionError(
      "Couldn't read that document. Try again, or paste the text in by hand.",
    );
  }

  // A refusal is a successful response with nothing in it — check before
  // reading content, or a declined document reads as an empty note.
  if (message.stop_reason === "refusal") {
    throw new ExtractionError(
      "That document was declined by the model's safety filters. You can still paste the text in by hand.",
    );
  }

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!text) {
    throw new ExtractionError(
      "Nothing readable came back from that document. Paste the text in by hand instead.",
    );
  }

  // Truncation is worth saying out loud: the tail is missing, and the
  // editor is about to save this as if it were the whole document.
  if (message.stop_reason === "max_tokens") {
    return `${text}\n\n[Extraction stopped early — this document was too long to read in one pass. Add the rest by hand.]`;
  }

  return text;
}
