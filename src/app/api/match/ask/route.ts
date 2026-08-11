import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import {
  MAX_QUERY_LENGTH,
  type LimitVerdict,
  checkAskLimits,
  clientIp,
  hashIp,
  logAsk,
} from "@/lib/ask-limits";
import { askInstructions, buildProfileCorpus } from "@/lib/ask-prompt";
import { getServerEnv } from "@/lib/env";
import { getGroundingNotes } from "@/lib/knowledge-data";
import { buildReferenceIndex } from "@/lib/match-references";
import { getProfileData } from "@/lib/profile-data";
import { getTeamMatchPage } from "@/lib/team-match-data";

/** Claude Opus 5 — chosen for its judgment about what it does not know. */
const MODEL = "claude-opus-5";

/**
 * The cap covers thinking *and* the visible answer together, and Opus 5
 * thinks by default. A budget sized for the two or three sentences the
 * reader sees gets spent entirely on reasoning, and the request completes
 * with zero text — a card that loads and then vanishes. Leave real room:
 * the answer is short, so the extra ceiling is almost never reached.
 */
const MAX_TOKENS = 4000;

/**
 * How much prior conversation to carry. Each turn is re-sent in full on
 * every follow-up, so this bounds both the bill and how far a thread can
 * drift from the profile it is supposed to be about.
 */
const MAX_HISTORY_TURNS = 6;

/** Longest prior answer echoed back into a follow-up. */
const MAX_HISTORY_ANSWER = 2000;

interface AskTurn {
  question: string;
  answer: string;
}

/**
 * Rebuild the conversation from whatever the client sent.
 *
 * The history arrives from the browser, so it is untrusted: a crafted
 * client could put words in the assistant's mouth. Two things keep that
 * boring — every entry is rebuilt into a strict user/assistant pair
 * (roles and alternation can't be forged), and both sides are length
 * capped. The grounding rules still apply to every turn, so the worst
 * available outcome is a visitor misleading themselves.
 */
function parseHistory(raw: unknown): AskTurn[] {
  if (!Array.isArray(raw)) return [];

  const turns: AskTurn[] = [];
  for (const item of raw.slice(-MAX_HISTORY_TURNS)) {
    if (!item || typeof item !== "object") continue;
    const entry = item as { question?: unknown; answer?: unknown };
    const question = String(entry.question ?? "")
      .trim()
      .slice(0, MAX_QUERY_LENGTH);
    const answer = String(entry.answer ?? "")
      .trim()
      .slice(0, MAX_HISTORY_ANSWER);
    // A turn with only one side would break alternation; drop it.
    if (question && answer) turns.push({ question, answer });
  }
  return turns;
}

/**
 * Streaming answer endpoint for the team-matching search bar.
 *
 * Every failure mode returns a non-200 rather than a half-answer, because
 * the client treats any failure as "show keyword results only" — the
 * feature degrades to a working search instead of a broken page.
 */
export async function POST(request: Request) {
  const env = getServerEnv();
  const ipHash = hashIp(clientIp(request.headers));

  let query = "";
  let history: AskTurn[] = [];
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object") {
      query = String((body as { query?: unknown }).query ?? "").trim();
      history = parseHistory((body as { history?: unknown }).history);
    }
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (query.length === 0) {
    return NextResponse.json({ error: "Empty question." }, { status: 400 });
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: "Question too long." }, { status: 400 });
  }

  // No key configured is a normal state, not an error: the search bar
  // works without it, so say so quietly and let the client fall back.
  if (!env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI overview is not configured." },
      { status: 503 },
    );
  }

  // Fail closed if the ledger can't be read at all — an unmigrated
  // database, a connection failure. Those two counts are the only thing
  // bounding spend on a public endpoint, so "I can't check the limit" has
  // to mean no call rather than a free pass. Answering 503 also keeps a
  // missing table from 500ing the route: the client treats it like any
  // other unavailable overview and the keyword results carry on.
  let verdict: LimitVerdict;
  try {
    verdict = await checkAskLimits(ipHash);
  } catch (error: unknown) {
    console.error("ask limit check failed:", error);
    return NextResponse.json(
      { error: "AI overview is unavailable." },
      { status: 503 },
    );
  }

  if (!verdict.allowed) {
    await logAsk({ query, ipHash, outcome: "rate_limited" });
    return NextResponse.json(
      {
        error:
          verdict.reason === "per_ip"
            ? "You've asked a lot of questions in a short time — the overview is paused for a bit. Keyword search still works."
            : "The overview has hit its daily limit. Keyword search still works.",
      },
      { status: 429 },
    );
  }

  const [profile, page, notes] = await Promise.all([
    getProfileData(),
    getTeamMatchPage(),
    getGroundingNotes(),
  ]);
  if (!page) {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }

  const ownerName = profile.about?.name ?? "Matthew Wind";
  const corpus = buildProfileCorpus(
    buildReferenceIndex(profile, notes),
    page,
    notes,
  );

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const encoder = new TextEncoder();
  let answer = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const message = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          // Low effort: a grounded lookup over a small corpus needs speed,
          // not deliberation. Thinking stays on — disabling it on Opus 5
          // risks leaking reasoning tags into the visible answer.
          thinking: { type: "adaptive" },
          output_config: { effort: "low" },
          system: [
            {
              type: "text",
              text: `${askInstructions(ownerName)}\n\n# Profile\n\n${corpus}`,
              // The corpus is identical across requests, so it caches.
              // The question lives in the user turn, after this breakpoint.
              cache_control: { type: "ephemeral" },
            },
          ],
          // Prior turns live here, after the cached breakpoint, so a
          // follow-up still reads the corpus from cache.
          messages: [
            ...history.flatMap(
              (turn) =>
                [
                  { role: "user" as const, content: turn.question },
                  { role: "assistant" as const, content: turn.answer },
                ] as const,
            ),
            { role: "user", content: query },
          ],
        });

        for await (const event of message) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            answer += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        const final = await message.finalMessage();
        controller.close();

        if (answer.trim().length === 0) {
          console.error(
            `ask produced no text (stop_reason: ${final.stop_reason}, ` +
              `output_tokens: ${final.usage.output_tokens})`,
          );
        }

        await logAsk({
          query,
          ipHash,
          // Record the stop reason in place of the answer so a silent
          // empty response is diagnosable from the ledger alone.
          outcome: answer.trim() ? "ok" : "empty",
          answer: answer.trim() || `[no text — ${final.stop_reason}]`,
          model: final.model,
          inputTokens: final.usage.input_tokens,
          outputTokens: final.usage.output_tokens,
          cachedTokens: final.usage.cache_read_input_tokens ?? 0,
        });
      } catch (error: unknown) {
        console.error("ask stream failed:", error);
        // Mid-stream failure: close rather than error the stream so the
        // reader keeps whatever arrived instead of losing the whole card.
        controller.close();
        await logAsk({
          query,
          ipHash,
          outcome: "error",
          answer: answer || null,
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
