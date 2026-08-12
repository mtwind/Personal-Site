"use client";

import { useState, useSyncExternalStore, useTransition } from "react";

import {
  addFeedbackDetail,
  addFeedbackTeam,
  startFeedback,
} from "@/lib/actions/team-match";
import {
  getFeedbackVisit,
  getServerFeedbackVisit,
  subscribeFeedbackVisit,
  writeFeedbackVisit,
} from "@/lib/feedback-visit";
import { GOOGLE_PRODUCT_AREAS } from "@/lib/google-product-areas";
import { GEMINI_GRADIENT, useMatch } from "./match-shell";

/** The four answers, and what each is called. */
export const FEEDBACK_ROLES: [string, string][] = [
  ["recruiter", "Recruiter"],
  ["hiring_manager", "Hiring manager"],
  ["googler", "Googler"],
  ["other", "Someone else"],
];

/**
 * Who gets asked about their team.
 *
 * A recruiter's team tells me nothing I can act on, and a stranger's
 * even less. A hiring manager's or a Googler's is the single most useful
 * thing on the whole survey — it is the difference between "someone at
 * Google looked at this" and "someone staffing Search Quality looked at
 * this", which is the question this page exists to answer.
 */
export function asksAboutTeam(role: string | null): boolean {
  return role === "hiring_manager" || role === "googler";
}

/* ──────────────────────────── shared bits ───────────────────────────── */

const FIELD =
  "w-full rounded-lg border border-[#dadce0] bg-white px-3 py-2 text-[14px] text-[#202124] placeholder:text-[#9aa0a6] focus:border-[#1a73e8] focus:outline-none";

const PRIMARY =
  "cursor-pointer rounded-full bg-[#1a73e8] px-5 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[#1765cc] disabled:cursor-default disabled:opacity-50";

const QUIET =
  "cursor-pointer text-[13px] text-[#5f6368] underline-offset-2 hover:underline";

/** "Step 2 of 3", as a row of bars rather than a sentence. */
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div
      className="mt-3 flex gap-1.5"
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Step ${step} of ${total}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`h-1 w-6 rounded-full transition-colors ${
            index < step ? "bg-[#1a73e8]" : "bg-[#dadce0]"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * The prompt, in Gemini's outline.
 *
 * A 1.5px gradient ring rather than a filled panel: the survey has to be
 * the thing you notice first now that it sits above the search field,
 * but it is still not the thing the page is *for*. An outline draws the
 * eye without turning the top of the page into an advertisement for a
 * form.
 */
function GeminiFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[17px] p-[1.5px] shadow-[0_1px_3px_rgba(60,64,67,0.12)]"
      style={{ background: GEMINI_GRADIENT }}
    >
      <div className="relative rounded-2xl bg-white p-5">{children}</div>
    </div>
  );
}

/* ─────────────────────────────── strip ──────────────────────────────── */

/**
 * The question at the top of every page.
 *
 * Built around one idea: the first answer has to be free. A tap on
 * "Recruiter" is stored the moment it happens, so a reader who does
 * nothing else has still told the page who it was written for — and the
 * questions that used to stand between them and that now come *after*
 * the answer instead of guarding it.
 *
 * It sits above the search field rather than under the page, because the
 * old position asked its question of the people least likely to still be
 * reading. A survey at the foot of a page is answered by whoever got to
 * the foot of the page.
 */
export function FeedbackStrip() {
  const { isVisitor } = useMatch();
  // What this visit already said decides which half to show, and only
  // the browser knows it: the server renders the opening question, and
  // the store corrects it on hydration.
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
      writeFeedbackVisit({ id: result.id, role });
    });
  }

  function finish() {
    writeFeedbackVisit({ done: true });
    setThanked(true);
  }

  return (
    <section aria-label="Feedback" className="mb-8">
      <GeminiFrame>
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
              One tap, before you start — who am I talking to?
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
          <FeedbackDetails
            id={visit.id}
            role={visit.role}
            onDone={finish}
            onSkip={finish}
          />
        ) : (
          <p className="text-[15px] text-[#202124]">
            Thanks — that&apos;s genuinely useful.
          </p>
        )}
      </GeminiFrame>
    </section>
  );
}

/* ─────────────────────────── the slides after ───────────────────────── */

/**
 * Everything asked after the role, as one slide at a time.
 *
 * Hiring managers and Googlers get three: their team, then what to
 * improve, then how to reach them. Everyone else gets the one short form
 * that was always here — a recruiter has no product area, and pretending
 * otherwise would be three screens to collect two blanks.
 *
 * One question per screen rather than one long form, because each screen
 * is answerable in a couple of seconds and each is stored as it is
 * answered. Someone who leaves after the second slide has still given me
 * the first two.
 *
 * Shared with the exit dialog, which reaches this same point for anyone
 * who already tapped a role on their way through — so leaving asks for
 * what's missing rather than starting the whole survey again.
 */
export function FeedbackDetails({
  id,
  role = null,
  onDone,
  onSkip,
}: {
  id: string;
  /** Decides whether the team slide is asked. */
  role?: string | null;
  onDone: () => void;
  /** Rendered as a way out when given; the row keeps its role. */
  onSkip?: () => void;
}) {
  const multi = asksAboutTeam(role);

  const [slide, setSlide] = useState<"team" | "note" | "contact">(
    multi ? "team" : "note",
  );
  const [team, setTeam] = useState("");
  const [productArea, setProductArea] = useState("");
  const [note, setNote] = useState("");
  const [wantsCall, setWantsCall] = useState(false);
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startPending] = useTransition();

  const total = multi ? 3 : 1;

  /** Store the team slide, then move on whether or not it said anything. */
  function saveTeam(skip: boolean) {
    setError(null);
    const values = {
      id,
      team: skip ? null : team.trim() || null,
      productArea: skip ? null : productArea || null,
    };
    // Nothing to store is not a reason to make a round trip.
    if (values.team === null && values.productArea === null) {
      setSlide("note");
      return;
    }
    startPending(async () => {
      const result = await addFeedbackTeam(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSlide("note");
    });
  }

  /**
   * The last slide, and the only one that submits.
   *
   * An address typed into the contact box is worth recognising as one:
   * it fills the email column too, so a reader who asked for a call and
   * left their address doesn't get told to type it a second time.
   */
  function send(withContact = true) {
    setError(null);
    const typed = withContact ? contact.trim() : "";
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typed);
    const address = multi ? (isEmail ? typed : null) : email.trim() || null;

    startPending(async () => {
      const result = await addFeedbackDetail({
        id,
        improvementNote: note.trim() || null,
        wantsCall,
        visitorEmail: address,
        contactInfo: multi ? typed || null : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  const errorLine = error ? (
    <p role="alert" className="text-[13px] text-[#d93025]">
      {error}
    </p>
  ) : null;

  if (slide === "team") {
    return (
      <>
        <h2 className="pr-8 text-[15px] font-medium text-[#202124]">
          Thanks — which team are you on?
        </h2>
        <p className="mt-1 text-[13px] leading-6 text-[#5f6368]">
          It tells me which part of Google this page is reaching. Skip
          either box if you&apos;d rather not say.
        </p>
        <StepDots step={1} total={total} />
        <div className="mt-3 space-y-3">
          <input
            type="text"
            value={team}
            onChange={(event) => setTeam(event.target.value)}
            placeholder="Team — e.g. Search Quality, Ads Privacy"
            className={FIELD}
          />
          <select
            value={productArea}
            onChange={(event) => setProductArea(event.target.value)}
            aria-label="Product area"
            className={`${FIELD} cursor-pointer`}
          >
            <option value="">Product area…</option>
            {GOOGLE_PRODUCT_AREAS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.areas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {errorLine}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => saveTeam(false)}
              disabled={pending}
              className={PRIMARY}
            >
              {pending ? "Saving…" : "Next"}
            </button>
            <button
              type="button"
              onClick={() => saveTeam(true)}
              className={QUIET}
            >
              Skip
            </button>
          </div>
        </div>
      </>
    );
  }

  if (slide === "note") {
    // The single-slide flow sends from here; the long one carries on.
    const last = !multi;
    return (
      <>
        <h2 className="pr-8 text-[15px] font-medium text-[#202124]">
          {multi
            ? "Anything I could improve?"
            : "Thanks — that's the useful part."}
        </h2>
        <p className="mt-1 text-[13px] leading-6 text-[#5f6368]">
          {multi
            ? "Whatever stood out, good or bad. One line is plenty."
            : "Anything else is a bonus."}
        </p>
        {multi ? <StepDots step={2} total={total} /> : null}

        <div className="mt-3 space-y-3">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder="Anything about this profile I could improve?"
            className={FIELD}
          />

          {last ? (
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
                  className={`mt-2 ${FIELD}`}
                />
              ) : null}
            </div>
          ) : null}

          {errorLine}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={last ? () => send() : () => setSlide("contact")}
              disabled={
                pending || (last && note.trim() === "" && !wantsCall)
              }
              className={PRIMARY}
            >
              {pending ? "Sending…" : last ? "Send" : "Next"}
            </button>
            {last ? (
              onSkip ? (
                <button type="button" onClick={onSkip} className={QUIET}>
                  That&apos;s all from me
                </button>
              ) : null
            ) : (
              <button
                type="button"
                onClick={() => setSlide("contact")}
                className={QUIET}
              >
                Skip
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="pr-8 text-[15px] font-medium text-[#202124]">
        Last one — anywhere I can reach you?
      </h2>
      <p className="mt-1 text-[13px] leading-6 text-[#5f6368]">
        Email, LinkedIn, an @google.com handle — whatever you&apos;re
        comfortable leaving. Entirely optional.
      </p>
      <StepDots step={3} total={total} />

      <div className="mt-3 space-y-3">
        <input
          type="text"
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          placeholder="you@google.com, or a LinkedIn URL"
          className={FIELD}
        />
        <label className="flex items-start gap-2 text-[14px] text-[#3c4043]">
          <input
            type="checkbox"
            checked={wantsCall}
            onChange={(event) => setWantsCall(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#1a73e8]"
          />
          I&apos;d be open to a quick call about this
        </label>

        {errorLine}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => send()}
            disabled={pending}
            className={PRIMARY}
          >
            {pending ? "Sending…" : "Send"}
          </button>
          {/* Still a submission — the note and the call box are already
              answered by this point, so leaving without contact details
              sends those rather than throwing them away. */}
          <button
            type="button"
            onClick={() => send(false)}
            disabled={pending}
            className={QUIET}
          >
            Send without it
          </button>
        </div>
      </div>
    </>
  );
}
