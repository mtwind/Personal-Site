"use client";

import { useEffect, useRef, useState } from "react";

import type { ReferenceResolver, ReferenceTarget } from "@/lib/match-references";
import { MatchRichText } from "./match-rich-text";

type Phase = "loading" | "streaming" | "done" | "failed";

/** One exchange in the thread. */
interface Turn {
  question: string;
  answer: string;
}

/** Frames to spend absorbing whatever backlog the stream has handed over. */
const CATCHUP_FRAMES = 6;

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
 * Google's AI Overview, for this profile — a grounded answer above the
 * results, with citations rendered as chips that open the reference pane,
 * and a follow-up field so a reader can keep asking.
 *
 * Anything other than success on the *first* answer renders nothing at
 * all. The keyword results below are the real floor of the feature, and a
 * broken card sitting on top of working results is worse than no card.
 *
 * Keyed on the query so a new search starts a new thread. That is what
 * clears the previous conversation — resetting state from inside the
 * effect would render the stale thread for a frame first.
 */
export function MatchAiOverview(props: OverviewProps) {
  return <Conversation key={props.query} {...props} />;
}

function Conversation({ query, resolver, onOpen }: OverviewProps) {
  const [turns, setTurns] = useState<Turn[]>([{ question: query, answer: "" }]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  // Read inside the effect without making it a dependency: appending a
  // turn is what triggers a fetch, and mutating the last turn's answer
  // mid-stream must not restart one.
  const turnsRef = useRef(turns);
  turnsRef.current = turns;

  const pendingIndex = turns.length - 1;

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      // Everything before the turn being answered is prior context.
      const history = turnsRef.current.slice(0, -1);
      const question = turnsRef.current[turnsRef.current.length - 1].question;

      try {
        const response = await fetch("/api/match/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: question, history }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          // 429 is worth surfacing — the reader should know why the
          // answer stopped coming. Everything else stays silent.
          if (response.status === 429) {
            const body = await response.json().catch(() => null);
            setNotice(
              (body as { error?: string } | null)?.error ??
                "Too many questions for now.",
            );
          } else if (turnsRef.current.length > 1) {
            // Dropping a follow-up without a word would look like the
            // question was never asked.
            setNotice("Couldn't answer that one. Try rephrasing?");
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
          const answer = received;
          setTurns((prev) =>
            prev.map((turn, index) =>
              index === prev.length - 1 ? { ...turn, answer } : turn,
            ),
          );
        }

        if (received.trim()) {
          setPhase("done");
        } else {
          if (turnsRef.current.length > 1) {
            setNotice("Couldn't answer that one. Try rephrasing?");
          }
          setPhase("failed");
        }
      } catch (error: unknown) {
        if ((error as Error)?.name === "AbortError") return;
        if (turnsRef.current.length > 1) {
          setNotice("Couldn't answer that one. Try rephrasing?");
        }
        setPhase("failed");
      }
    })();

    return () => controller.abort();
    // Appending a turn is the signal to fetch; the question itself is
    // read from the ref so streaming updates don't re-trigger this.
  }, [pendingIndex]);

  function askFollowUp(question: string) {
    setNotice(null);
    setPhase("loading");
    setTurns((prev) => [...prev, { question, answer: "" }]);
  }

  const busy = phase === "loading" || phase === "streaming";
  // A failed follow-up leaves its unanswered question stranded; drop it.
  const visible =
    phase === "failed" && turns.length > 1 ? turns.slice(0, -1) : turns;
  const answered = visible.some((turn) => turn.answer.trim().length > 0);

  // The first answer failing means no card at all — the results below are
  // the floor, and an empty card on top of them is worse than none.
  if (!answered && !notice) return null;

  return (
    <section
      aria-label="AI overview"
      aria-busy={busy}
      // Deliberately not a live region: the answer changes a character at
      // a time, and a polite region would queue an announcement for every
      // one of them. `aria-busy` says it is still arriving; the text is
      // there to read once it settles.
      className="mt-4 rounded-2xl border border-[#dadce0] bg-white p-5"
    >
      <h2 className="flex items-center gap-2 text-[13px] font-medium text-[#5f6368]">
        <SparkIcon />
        AI overview
      </h2>

      {visible.map((turn, index) => (
        <div key={index} className={index === 0 ? "mt-3" : "mt-4"}>
          {index > 0 ? (
            <p className="mb-1.5 border-l-2 border-[#dadce0] pl-2.5 text-[14px] leading-6 font-medium text-[#202124]">
              {turn.question}
            </p>
          ) : null}
          {turn.answer.trim() ? (
            <Answer
              key={index}
              text={turn.answer}
              live={index === visible.length - 1 && busy}
              resolver={resolver}
              onOpen={onOpen}
            />
          ) : null}
        </div>
      ))}

      {phase === "loading" ? <ShimmerLines /> : null}

      {notice ? (
        <p className="mt-3 text-[13px] text-[#5f6368]">{notice}</p>
      ) : null}

      {answered ? (
        <div className="mt-4 border-t border-[#f1f3f4] pt-3">
          <FollowUpField
            draft={draft}
            onDraftChange={setDraft}
            disabled={busy}
            onSubmit={() => {
              const question = draft.trim();
              if (!question || busy) return;
              setDraft("");
              askFollowUp(question);
            }}
          />
          <p className="mt-2 text-[11px] text-[#9aa0a6]">
            Generated from this page&apos;s content. Check the results below
            for the full detail.
          </p>
        </div>
      ) : null}
    </section>
  );
}

/**
 * One answer, revealed a character at a time.
 *
 * The stream arrives in bursts — a single delta can carry a dozen
 * characters — so writing each delta straight to the DOM makes the answer
 * land in visible blocks. Revealing at a per-frame rate proportional to
 * how far behind the display is turns those bursts into continuous
 * typing, and guarantees it catches up rather than drifting further
 * behind on a fast stream.
 */
function Answer({
  text,
  live,
  resolver,
  onOpen,
}: {
  text: string;
  live: boolean;
  resolver: ReferenceResolver;
  onOpen: (target: ReferenceTarget) => void;
}) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown >= text.length) return;

    const frame = requestAnimationFrame(() => {
      // Motion is the whole point here, so honour a reader who has asked
      // for less of it by skipping straight to the full text.
      const reduce = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      setShown((count) =>
        reduce
          ? text.length
          : Math.min(
              text.length,
              count + Math.max(1, Math.ceil((text.length - count) / CATCHUP_FRAMES)),
            ),
      );
    });
    return () => cancelAnimationFrame(frame);
    // One frame is scheduled per render; advancing `shown` schedules the
    // next, and the loop stops on its own once it has caught up.
  }, [shown, text]);

  // Cut any half-revealed citation so a chip appears whole or not at all.
  const visible = withoutPartialToken(text.slice(0, shown));
  const typing = live || shown < text.length;

  return (
    <p className="text-[15px] leading-7 text-[#3c4043]">
      <MatchRichText text={visible} resolver={resolver} onOpen={onOpen} />
      {typing ? (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.18em] bg-[#1a73e8] [animation:pane-fade_1s_ease-in-out_infinite_alternate]"
        />
      ) : null}
    </p>
  );
}

/** Ask-a-follow-up field, styled as a quieter sibling of the search bar. */
function FollowUpField({
  draft,
  onDraftChange,
  disabled,
  onSubmit,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  disabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex items-center gap-2 rounded-full border border-[#dadce0] bg-white px-4 py-1.5 transition-shadow focus-within:border-transparent focus-within:shadow-[0_1px_6px_rgba(32,33,36,0.28)]"
    >
      <input
        type="text"
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        disabled={disabled}
        aria-label="Ask a follow-up"
        placeholder={disabled ? "Answering…" : "Ask a follow-up"}
        className="min-w-0 flex-1 bg-transparent text-[14px] text-[#202124] outline-none placeholder:text-[#80868b] disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={disabled || draft.trim().length === 0}
        aria-label="Send follow-up"
        className="shrink-0 cursor-pointer rounded-full p-1 text-[#1a73e8] transition-colors hover:bg-[#e8f0fe] disabled:cursor-not-allowed disabled:text-[#bdc1c6] disabled:hover:bg-transparent"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden
        >
          <path d="M5 12h13M12 5l7 7-7 7" />
        </svg>
      </button>
    </form>
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
