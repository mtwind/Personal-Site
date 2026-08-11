"use client";

import { useMemo, useState } from "react";

import { selectQuestions } from "@/lib/people-also-ask";
import type { RelatedQuestion } from "@/lib/questions-data";
import { MatchRichText } from "./match-rich-text";

/**
 * "People also ask", under the results.
 *
 * The overview answers what a visitor typed. This answers what they
 * didn't: the questions a recruiter has about a candidate but wouldn't
 * think to type into a profile — when he can start, whether he needs
 * sponsorship, what he's actually looking for. Volunteering them is the
 * whole point, so the block shows even when nothing was tagged for this
 * particular search.
 *
 * One row open at a time, like Google's — an accordion that lets every
 * row open is a page of prose with chevrons on it.
 */
export function PeopleAlsoAsk({
  questions,
  query,
}: {
  questions: RelatedQuestion[];
  query: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const shown = useMemo(
    () => selectQuestions(questions, query),
    [questions, query],
  );

  if (shown.length === 0) return null;

  return (
    <section aria-label="People also ask" className="mt-6">
      <h2 className="text-[19px] font-normal text-[#202124]">
        People also ask
      </h2>
      <ul className="mt-3 divide-y divide-[#ecedef] overflow-hidden rounded-2xl border border-[#dadce0] bg-white">
        {shown.map((entry) => {
          const open = openId === entry.id;
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : entry.id)}
                aria-expanded={open}
                className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-[#f8f9fa]"
              >
                <span className="text-[15px] leading-6 text-[#202124]">
                  {entry.question}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-4 w-4 shrink-0 text-[#5f6368] transition-transform duration-200 ${
                    open ? "rotate-180" : ""
                  }`}
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {open ? (
                <div className="px-5 pb-4 text-[14px] leading-6 whitespace-pre-line text-[#4d5156]">
                  {entry.answer ? (
                    <MatchRichText text={entry.answer} />
                  ) : (
                    <span className="text-[#80868b] italic">
                      No answer written yet.
                    </span>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
