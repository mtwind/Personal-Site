"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import type { ReferenceResolver, ReferenceTarget } from "@/lib/match-references";
import { ReferenceChip } from "./match-rich-text";

type Phase = "loading" | "streaming" | "done" | "failed";

/** One exchange in the thread. */
interface Turn {
  question: string;
  answer: string;
}

/**
 * Reveal tuning.
 *
 * The reveal is driven by elapsed time, not by frames or by deltas, so the
 * pace is a property of the clock rather than of however the network
 * happened to chunk the response. Rate changes are low-passed, so it
 * accelerates and eases instead of stepping — a sudden change in speed
 * reads as lag just as much as a jump does.
 *
 * `LEAD_SECONDS` is how far behind the stream the reveal aims to stay.
 * Deriving the rate from that backlog makes it self-regulating: it eases
 * off when the model generates slowly, so it never catches up and stalls
 * mid-word, and speeds up when there is plenty in hand.
 */
const LEAD_SECONDS = 1.3;

/** Once the answer is complete there is nothing to hold back for. */
const TAIL_SECONDS = 0.7;

const MIN_CPS = 20; // never appear frozen
const MAX_CPS = 250; // still reads as typing, not as a paste
const RATE_EASING = 4; // how fast the rate approaches its target, per second

/**
 * Characters to bank before showing anything. The loading bar covers this
 * so the reveal opens on a sentence already in hand and never starves
 * mid-word waiting for the next delta.
 */
const PREBUFFER_CHARS = 110;

/** Longest the loader holds when generation is slower than the prebuffer. */
const MAX_PREBUFFER_MS = 1600;

/** Guards the cursor against a huge dt after the tab was backgrounded. */
const MAX_FRAME_S = 0.05;

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
  // the floor, and an empty card on top of them is worse than none. While
  // still working, the card is present and shows the loading bar; gating
  // this on `answered` alone made it pop in cold on the first character.
  if (!busy && !answered && !notice) return null;

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
          <Answer
            key={index}
            text={turn.answer}
            live={index === visible.length - 1 && busy}
            resolver={resolver}
            onOpen={onOpen}
          />
        </div>
      ))}

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
 * One answer, revealed continuously.
 *
 * Three things make the reveal seamless rather than "lagging into place":
 *
 * - It is driven by elapsed time, so the pace is smooth regardless of how
 *   the network chunked the response or what the frame rate is doing.
 * - Nothing shows until a sentence or so is banked, so the reveal never
 *   catches up to the stream and stalls mid-word. The loading bar covers
 *   that wait.
 * - Reveal is measured in *rendered* characters, so a citation label types
 *   out like any other word. Counting raw characters meant the text froze
 *   for the length of `[[project:Simple C Compiler]]` and then popped the
 *   label in whole.
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

  // Half-typed citations are cut before parsing: an unclosed token would
  // otherwise parse as literal text and flash its brackets on screen.
  const segments = useMemo(
    () => resolver.parse(withoutPartialToken(text)),
    [resolver, text],
  );
  const total = useMemo(
    () =>
      segments.reduce(
        (sum, segment) =>
          sum + (segment.type === "text" ? segment.text.length : segment.label.length),
        0,
      ),
    [segments],
  );

  // The loop reads these rather than depending on them, so it runs once
  // for the life of the answer instead of restarting on every delta.
  const totalRef = useRef(total);
  const liveRef = useRef(live);
  useEffect(() => {
    totalRef.current = total;
    liveRef.current = live;
  }, [total, live]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let firstCharAt = 0;
    let cursor = 0; // fractional characters revealed
    let rate = MIN_CPS;
    let opened = false;

    // Motion is the whole point here, so a reader who asked for less of
    // it gets the text immediately.
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")
      .matches;

    const tick = (now: number) => {
      const available = totalRef.current;
      const settled = !liveRef.current;
      const elapsed = Math.min((now - last) / 1000, MAX_FRAME_S);
      last = now;

      if (available > 0 && firstCharAt === 0) firstCharAt = now;

      // Hold until there is a buffer worth reading — or until the stream
      // is done, or it has simply taken too long to fill.
      if (!opened) {
        opened =
          reduce ||
          available >= PREBUFFER_CHARS ||
          (settled && available > 0) ||
          (firstCharAt > 0 && now - firstCharAt > MAX_PREBUFFER_MS);
      }

      if (opened) {
        if (reduce) {
          cursor = available;
        } else {
          // Drain the backlog over a fixed horizon, then ease toward that
          // rate rather than snapping to it — a step change in speed reads
          // as lag just as much as a jump does.
          const backlog = available - cursor;
          const horizon = settled ? TAIL_SECONDS : LEAD_SECONDS;
          const target = Math.min(MAX_CPS, Math.max(MIN_CPS, backlog / horizon));
          rate += (target - rate) * Math.min(1, elapsed * RATE_EASING);
          cursor = Math.min(available, cursor + rate * elapsed);
        }
      }

      const next = Math.floor(cursor);
      setShown((prev) => (prev === next ? prev : next));

      // Keep going until the answer is complete and fully revealed.
      if (!settled || cursor < available) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const revealing = shown < total || live;

  // The loader is part of the answer, not a sibling that gets swapped
  // out — so opening the reveal is one transition, not two.
  if (shown === 0) return revealing ? <SearchingBar /> : null;

  let budget = shown;
  const nodes: React.ReactNode[] = [];
  for (const [index, segment] of segments.entries()) {
    if (budget <= 0) break;
    if (segment.type === "text") {
      const slice = segment.text.slice(0, budget);
      budget -= slice.length;
      nodes.push(<Fragment key={index}>{slice}</Fragment>);
    } else {
      const label = segment.label.slice(0, budget);
      budget -= label.length;
      nodes.push(
        <ReferenceChip
          key={index}
          label={label}
          partial={label.length < segment.label.length}
          onOpen={() => onOpen({ kind: segment.kind, id: segment.id })}
        />,
      );
    }
  }

  return (
    <p className="text-[15px] leading-7 text-[#3c4043]">
      {nodes}
      {revealing ? (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.18em] bg-[#1a73e8] [animation:pane-fade_1s_ease-in-out_infinite_alternate]"
        />
      ) : null}
    </p>
  );
}

/**
 * Google's indeterminate loading bar, shown while the answer banks up.
 *
 * The box reserves about the height the first couple of lines will occupy,
 * so the card does not jump when the bar gives way to text.
 */
function SearchingBar() {
  return (
    <div className="min-h-[3.5rem] pt-1" aria-hidden>
      <div className="h-[3px] w-full overflow-hidden rounded-full bg-[#f1f3f4]">
        <div
          className="h-full w-[200%] [animation:match-sweep_1.5s_linear_infinite]"
          style={{
            background:
              "linear-gradient(90deg,#4285F4,#EA4335,#FBBC04,#34A853,#4285F4,#EA4335,#FBBC04,#34A853,#4285F4)",
          }}
        />
      </div>
    </div>
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

