"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { submitFeedback } from "@/lib/actions/team-match";
import type { ActionResult } from "@/lib/actions/validation";

const ROLES: [string, string][] = [
  ["recruiter", "Recruiter"],
  ["hiring_manager", "Hiring manager"],
  ["googler", "Googler"],
  ["other", "Other"],
];

/** Leaving the hidden page lands on the public profile. */
const LEAVE_URL = "/";

interface ExitDialogProps {
  onDismiss: () => void;
}

/** Quick exit survey shown when a visitor chooses to leave the page. */
export function ExitDialog({ onDismiss }: ExitDialogProps) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    submitFeedback,
    null,
  );
  const [wantsCall, setWantsCall] = useState(false);

  if (state?.ok) {
    return (
      <Overlay>
        <h2 className="text-xl font-medium text-[#202124]">Thank you!</h2>
        <p className="mt-2 text-sm text-[#5f6368]">
          Your feedback is in{wantsCall ? " — I’ll reach out about that call." : "."}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full px-4 py-2 text-sm font-medium text-[#1a73e8] hover:bg-[#f1f6fe]"
          >
            Stay a bit longer
          </button>
          <a
            href={LEAVE_URL}
            className="rounded-full bg-[#1a73e8] px-5 py-2 text-sm font-medium text-white hover:bg-[#1765cc]"
          >
            Leave page
          </a>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay>
      <h2 className="text-xl font-medium text-[#202124]">
        Before you go — 20 seconds?
      </h2>
      <form action={formAction} className="mt-4 space-y-5">
        {/* Honeypot: hidden from humans, tempting to bots. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden
        />

        <fieldset>
          <legend className="text-sm font-medium text-[#202124]">
            I&apos;m a…
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {ROLES.map(([value, label]) => (
              <label
                key={value}
                className="cursor-pointer rounded-full border border-[#dadce0] px-4 py-1.5 text-sm text-[#3c4043] transition-colors has-checked:border-[#1a73e8] has-checked:bg-[#e8f0fe] has-checked:text-[#1a73e8]"
              >
                <input
                  type="radio"
                  name="role"
                  value={value}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="exit-note"
            className="text-sm font-medium text-[#202124]"
          >
            Anything about this profile I could improve?
          </label>
          <textarea
            id="exit-note"
            name="improvementNote"
            rows={3}
            className="mt-2 w-full rounded-lg border border-[#dadce0] bg-white px-3 py-2 text-sm text-[#202124] placeholder:text-[#9aa0a6] focus:border-[#1a73e8] focus:outline-none"
            placeholder="Optional — honest notes welcome"
          />
        </div>

        <div>
          <label className="flex items-start gap-2 text-sm text-[#3c4043]">
            <input
              type="checkbox"
              name="wantsCall"
              checked={wantsCall}
              onChange={(event) => setWantsCall(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#1a73e8]"
            />
            I&apos;d be open to a quick call about this
          </label>
          {wantsCall ? (
            <input
              type="email"
              name="visitorEmail"
              required
              placeholder="Your email — I’ll reach out to schedule"
              className="mt-2 w-full rounded-lg border border-[#dadce0] bg-white px-3 py-2 text-sm text-[#202124] placeholder:text-[#9aa0a6] focus:border-[#1a73e8] focus:outline-none"
            />
          ) : null}
        </div>

        {state && !state.ok ? (
          <p role="alert" className="text-sm text-[#d93025]">
            {state.error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <a
            href={LEAVE_URL}
            className="text-sm text-[#5f6368] underline-offset-2 hover:underline"
          >
            Skip and leave
          </a>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full px-4 py-2 text-sm font-medium text-[#5f6368] hover:bg-[#f1f3f4]"
            >
              Cancel
            </button>
            <SubmitButton />
          </div>
        </div>
      </form>
    </Overlay>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-[#1a73e8] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1765cc] disabled:opacity-50"
    >
      {pending ? "Sending…" : "Submit & continue"}
    </button>
  );
}
