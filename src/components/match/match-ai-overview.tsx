"use client";

import { useEffect, useState } from "react";

import type { ReferenceResolver, ReferenceTarget } from "@/lib/match-references";
import { MatchRichText } from "./match-rich-text";

type Phase = "loading" | "streaming" | "done" | "failed";

/**
 * Drop a half-typed citation from the tail.
 *
 * The answer arrives a few characters at a time, so mid-stream the tail
 * is often a partial token like "[[project:Simple C Comp". Rendering that
 * flashes raw syntax at the reader, so the incomplete tail is withheld
 * until its closing brackets arrive.
 *
 * Applied in every phase, not just while streaming: a stream that dies
 * mid-citation would otherwise leave the raw fragment on screen for good.
 * On a complete answer every token is closed, so this is a no-op.
 */
function withoutPartialToken(text: string): string {
  const open = text.lastIndexOf("[[");
  if (open === -1) return text;
  const close = text.indexOf("]]", open);
  return close === -1 ? text.slice(0, open) : text;
}

interface OverviewProps {
  query: string;
  resolver: ReferenceResolver;
  onOpen: (target: ReferenceTarget) => void;
}

/**
 * Google's AI Overview, for this profile. Streams a grounded answer above
 * the results list, with citations rendered as chips that open the
 * reference pane.
 *
 * Anything other than success renders nothing at all. The keyword results
 * below are the real floor of the feature, and a broken card sitting on
 * top of working results is worse than no card.
 *
 * Keyed on the query so a new search remounts the card. That is what
 * clears the previous answer — resetting state from inside the effect
 * would render the stale answer for a frame first, and cascade a render.
 */
export function MatchAiOverview(props: OverviewProps) {
  return <Overview key={props.query} {...props} />;
}

function Overview({ query, resolver, onOpen }: OverviewProps) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("loading");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch("/api/match/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          // 429 is worth surfacing — the reader should know why the
          // overview vanished. Everything else stays silent.
          if (response.status === 429) {
            const body = await response.json().catch(() => null);
            setNotice(
              (body as { error?: string } | null)?.error ??
                "Too many questions for now.",
            );
          }
          setPhase("failed");
          return;
        }

        setPhase("streaming");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let received = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          received += decoder.decode(value, { stream: true });
          setText(received);
        }

        setText(received);
        setPhase(received.trim() ? "done" : "failed");
      } catch (error: unknown) {
        if ((error as Error)?.name === "AbortError") return;
        setPhase("failed");
      }
    })();

    return () => controller.abort();
  }, [query]);

  if (phase === "failed" && !notice) return null;

  if (notice) {
    return (
      <div className="mt-4 rounded-2xl border border-[#dadce0] bg-white px-5 py-3">
        <p className="text-[13px] text-[#5f6368]">{notice}</p>
      </div>
    );
  }

  const visible = withoutPartialToken(text);

  return (
    <section
      aria-label="AI overview"
      aria-busy={phase !== "done"}
      className="mt-4 rounded-2xl border border-[#dadce0] bg-white p-5"
    >
      <h2 className="flex items-center gap-2 text-[13px] font-medium text-[#5f6368]">
        <SparkIcon />
        AI overview
      </h2>

      {phase === "loading" ? (
        <ShimmerLines />
      ) : (
        <p className="mt-3 text-[15px] leading-7 text-[#3c4043]">
          <MatchRichText text={visible} resolver={resolver} onOpen={onOpen} />
          {phase === "streaming" ? (
            <span
              aria-hidden
              className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.18em] bg-[#1a73e8] [animation:pane-fade_1s_ease-in-out_infinite_alternate]"
            />
          ) : null}
        </p>
      )}

      {phase === "done" ? (
        <p className="mt-3 border-t border-[#f1f3f4] pt-2.5 text-[11px] text-[#9aa0a6]">
          Generated from this page&apos;s content. Check the results below for
          the full detail.
        </p>
      ) : null}
    </section>
  );
}

/**
 * The sparkle that marks generated content.
 *
 * Deliberately not the page's four-colour gradient: at 16px the gradient
 * collapses into a single muddy orange that fights the blue links beside
 * it. Two blue sparks read correctly at this size.
 */
function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        d="M10 2.5l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1L3 9.5l5.1-1.9z"
        fill="#4285F4"
      />
      <path
        d="M18 14l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z"
        fill="#4285F4"
        opacity="0.55"
      />
    </svg>
  );
}

function ShimmerLines() {
  return (
    <div className="mt-3 space-y-2" aria-hidden>
      {["w-full", "w-[92%]", "w-[68%]"].map((width) => (
        <div
          key={width}
          className={`h-3.5 ${width} rounded [animation:match-shimmer_1.1s_ease-in-out_infinite_alternate]`}
        />
      ))}
    </div>
  );
}
