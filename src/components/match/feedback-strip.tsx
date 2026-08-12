"use client";

import { useState, useSyncExternalStore, useTransition } from "react";

import { addFeedbackDetail, startFeedback } from "@/lib/actions/team-match";
import {
  getFeedbackVisit,
  getServerFeedbackVisit,
  subscribeFeedbackVisit,
  writeFeedbackVisit,
} from "@/lib/feedback-visit";
import { useMatch } from "./match-shell";

/** The four answers, and what each is called. */
export const FEEDBACK_ROLES: [string, string][] = [
  ["recruiter", "Recruiter"],
  ["hiring_manager", "Hiring manager"],
  ["googler", "Googler"],
  ["other", "Someone else"],
];

/**
 * The question at the foot of every page.
 *
 * Built around one idea: the first answer has to be free. A tap on
 * "Recruiter" is stored the moment it happens, so a reader who does
 * nothing else has still told the page who it was written for — and the
 * two questions that used to stand between them and that (a text box and
 * an email address) now come *after* the answer instead of guarding it.
 *
 * It also asks where reading actually ends, rather than only under a
 * button marked "leave". Most people never press that button; they close
 * the tab from whatever they were reading, which is where this is.
 */
export function FeedbackStrip() {
  const { isVisitor } = useMatch();
  // What this visit already said decides which half to show, and only
  // the browser knows it: the server renders the opening question, and
  // the store corrects it on hydration. At the foot of the page, below
  // the fold, there is nothing to see either way.
  const visit = useSyncExternalStore(
    subscribeFeedbackVisit,
    getFeedbackVisit,
    getServerFeedbackVisit,
  );
  // Finishing here says thank you; finishing on the *last* page is why
  // the strip is absent on this one. Same stored state, different sides
  // of this mount, so it can't be read off the store alone.
  const [thanked, setThanked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startPending] = useTransition();

  // The owner's own browsing would otherwise be most of this data.
  if (!isVisitor) return null;
  if (!thanked && (visit.dismissed || visit.done)) return null;

  const step = thanked ? "thanks" : visit.id ? "details" : "role";

  function pickRole(role: string) {
    setError(null);
    startPending(async () => {
      const result = await startFeedback({ role });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      writeFeedbackVisit({ id: result.id });
    });
  }

  function finish() {
    writeFeedbackVisit({ done: true });
    setThanked(true);
  }

  return (
    <section
      aria-label="Feedback"
      className="relative mt-10 rounded-2xl border border-[#dadce0] bg-white p-5"
    >
      {step === "thanks" ? null : (
        <button
          type="button"
          onClick={() => writeFeedbackVisit({ dismissed: true })}
          aria-label="Hide this"
          title="Hide this"
          className="absolute top-3 right-3 cursor-pointer rounded-full p-1.5 text-[#80868b] transition-colors hover:bg-[#f1f3f4] hover:text-[#202124]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-3.5 w-3.5"
            aria-hidden
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}

      {step === "role" ? (
        <>
          <h2 className="pr-8 text-[15px] font-medium text-[#202124]">
            One tap, while you&apos;re here — who am I talking to?
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-[#5f6368]">
            It tells me who this page is actually reaching, which is the
            thing I can&apos;t see from my side.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FEEDBACK_ROLES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                disabled={pending}
                onClick={() => pickRole(value)}
                className="cursor-pointer rounded-full border border-[#dadce0] px-4 py-1.5 text-[14px] text-[#3c4043] transition-colors hover:border-[#1a73e8] hover:bg-[#f1f6fe] hover:text-[#1a73e8] disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
          {error ? (
            <p role="alert" className="mt-3 text-[13px] text-[#d93025]">
              {error}
            </p>
          ) : null}
        </>
      ) : step === "details" && visit.id ? (
        <>
          <h2 className="pr-8 text-[15px] font-medium text-[#202124]">
            Thanks — that&apos;s the useful part.
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-[#5f6368]">
            Anything else is a bonus.
          </p>
          <FeedbackDetails id={visit.id} onDone={finish} onSkip={finish} />
        </>
      ) : (
        <p className="text-[15px] text-[#202124]">
          Thanks — that&apos;s genuinely useful.
        </p>
      )}
    </section>
  );
}

/**
 * The optional half: what to improve, and whether they want a call.
 *
 * Shared with the exit dialog, which reaches this same step for anyone
 * who already tapped a role on their way through — so leaving asks for
 * what's missing rather than starting the whole survey again.
 */
export function FeedbackDetails({
  id,
  onDone,
  onSkip,
}: {
  id: string;
  onDone: () => void;
  /** Rendered as "no thanks" when given; the row keeps its role. */
  onSkip?: () => void;
}) {
  const [note, setNote] = useState("");
  const [wantsCall, setWantsCall] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startPending] = useTransition();

  function send() {
    setError(null);
    startPending(async () => {
      const result = await addFeedbackDetail({
        id,
        improvementNote: note.trim() || null,
        wantsCall,
        visitorEmail: email.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  const empty = note.trim() === "" && !wantsCall;

  return (
    <div className="mt-3 space-y-3">
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder="Anything about this profile I could improve?"
        className="w-full rounded-lg border border-[#dadce0] bg-white px-3 py-2 text-[14px] text-[#202124] placeholder:text-[#9aa0a6] focus:border-[#1a73e8] focus:outline-none"
      />

      <div>
        <label className="flex items-start gap-2 text-[14px] text-[#3c4043]">
          <input
            type="checkbox"
            checked={wantsCall}
            onChange={(event) => setWantsCall(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#1a73e8]"
          />
          I&apos;d be open to a quick call about this
        </label>
        {wantsCall ? (
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Your email — I’ll reach out to schedule"
            className="mt-2 w-full rounded-lg border border-[#dadce0] bg-white px-3 py-2 text-[14px] text-[#202124] placeholder:text-[#9aa0a6] focus:border-[#1a73e8] focus:outline-none"
          />
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-[13px] text-[#d93025]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={pending || empty}
          className="cursor-pointer rounded-full bg-[#1a73e8] px-5 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[#1765cc] disabled:cursor-default disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send"}
        </button>
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="cursor-pointer text-[13px] text-[#5f6368] underline-offset-2 hover:underline"
          >
            That&apos;s all from me
          </button>
        ) : null}
      </div>
    </div>
  );
}
