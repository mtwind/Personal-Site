import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { adminReturn } from "@/lib/admin-return";
import { getAuthState } from "@/lib/auth";
import {
  getFeedbackSubmissions,
  type FeedbackSubmission,
} from "@/lib/feedback-data";

/** Editor-only admin view; invisible (404) to everyone else. */
export const metadata: Metadata = {
  title: "Feedback",
  robots: { index: false, follow: false },
};

const ROLE_LABELS: Record<string, string> = {
  recruiter: "Recruiter",
  hiring_manager: "Hiring manager",
  googler: "Googler",
  other: "Other",
};

const SOURCE_LABELS: Record<string, string> = {
  exit_form: "Exit survey",
  contact: "Contact form",
};

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/New_York",
});

function SubmissionCard({ submission }: { submission: FeedbackSubmission }) {
  const meta = [
    DATE_FORMAT.format(submission.createdAt),
    SOURCE_LABELS[submission.source] ?? submission.source,
    submission.role ? (ROLE_LABELS[submission.role] ?? submission.role) : null,
  ].filter(Boolean);

  return (
    <article className="rounded-md border border-(--line) bg-(--bg-elev) px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-2 font-sans text-[11px] font-semibold tracking-[0.14em] text-(--dim) uppercase">
        {meta.map((part, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>·</span>}
            {part}
          </span>
        ))}
      </div>
      {submission.improvementNote ? (
        <p className="mt-3 text-[15px] leading-6 text-(--text)">
          {submission.improvementNote}
        </p>
      ) : (
        <p className="mt-3 font-sans text-sm text-(--dim) italic">
          No note left.
        </p>
      )}
      {submission.wantsCall && (
        <p className="mt-3 font-sans text-[12.5px] text-(--accent)">
          Open to a call
          {submission.visitorEmail ? (
            <>
              {" — "}
              <a
                href={`mailto:${submission.visitorEmail}`}
                className="underline-offset-2 hover:underline"
              >
                {submission.visitorEmail}
              </a>
            </>
          ) : null}
          {submission.bookedEventId ? " · call booked" : null}
        </p>
      )}
    </article>
  );
}

export default async function FeedbackAdminPage() {
  const { isEditor } = await getAuthState();
  if (!isEditor) notFound();

  const [submissions, back] = await Promise.all([
    getFeedbackSubmissions(),
    adminReturn(),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <Link
        href={back.href}
        className="font-sans text-[11px] font-semibold tracking-[0.18em] text-(--dim) uppercase transition-colors duration-200 hover:text-(--accent)"
      >
        {back.label}
      </Link>
      <h1 className="mt-6 text-3xl text-(--title)">Feedback</h1>
      <p className="mt-1 font-sans text-[12.5px] text-(--dim)">
        {submissions.length === 0
          ? "No submissions yet."
          : `${submissions.length} submission${submissions.length === 1 ? "" : "s"}, newest first.`}
      </p>
      {submissions.length > 0 && (
        <div className="mt-8 space-y-4">
          {submissions.map((submission) => (
            <SubmissionCard key={submission.id} submission={submission} />
          ))}
        </div>
      )}
    </main>
  );
}
