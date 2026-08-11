import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import {
  MAX_QUERY_LENGTH,
  checkAskLimits,
  clientIp,
  hashIp,
  logAsk,
} from "@/lib/ask-limits";
import { askInstructions, buildProfileCorpus } from "@/lib/ask-prompt";
import { getServerEnv } from "@/lib/env";
import { buildReferenceIndex } from "@/lib/match-references";
import { getProfileData } from "@/lib/profile-data";
import { getTeamMatchPage } from "@/lib/team-match-data";

/** Claude Opus 5 — chosen for its judgment about what it does not know. */
const MODEL = "claude-opus-5";

/**
 * A search overview is a few sentences. Capping output keeps a runaway
 * generation from turning one question into a large bill.
 */
const MAX_TOKENS = 700;

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
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && "query" in body) {
      query = String((body as { query: unknown }).query ?? "").trim();
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

  const verdict = await checkAskLimits(ipHash);
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

  const [profile, page] = await Promise.all([
    getProfileData(),
    getTeamMatchPage(),
  ]);
  if (!page) {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }

  const ownerName = profile.about?.name ?? "Matthew Wind";
  const corpus = buildProfileCorpus(buildReferenceIndex(profile), page);

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
          messages: [{ role: "user", content: query }],
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

        await logAsk({
          query,
          ipHash,
          outcome: "ok",
          answer,
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
