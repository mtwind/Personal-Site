"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import {
  createReferenceResolver,
  type MatchReferenceIndex,
  type ReferenceTarget,
} from "@/lib/match-references";
import type { TeamMatchPage } from "@/lib/team-match-data";
import { ExitDialog } from "./exit-dialog";
import { MatchEditorForm } from "./match-editor-form";
import { MatchRichText } from "./match-rich-text";
import { ReferencePane } from "./reference-pane";

export interface MatchPageProps {
  page: TeamMatchPage;
  isEditor: boolean;
  ownerName: string;
  contactEmail: string | null;
  /** Projects, experiences and skills that prose can reference inline. */
  referenceIndex: MatchReferenceIndex;
  /** Roboto class from next/font, applied to this page only. */
  fontClass: string;
}

const GOOGLE_DOTS = ["#4285F4", "#EA4335", "#FBBC04", "#34A853"];

const FOUR_COLOR_GRADIENT =
  "linear-gradient(90deg,#4285F4 0%,#4285F4 25%,#EA4335 25%,#EA4335 50%,#FBBC04 50%,#FBBC04 75%,#34A853 75%,#34A853 100%)";

/** Material elevation-on-hover for content cards. */
const CARD =
  "rounded-2xl border border-[#dadce0] bg-white p-6 transition-shadow duration-300 hover:shadow-[0_1px_3px_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]";

/** Soft Google-colored orbs drifting behind the page (CSS-only). */
function FloatingOrbs() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <span className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#4285F4] opacity-15 blur-3xl [animation:g-float_18s_ease-in-out_infinite_alternate]" />
      <span className="absolute top-1/3 -right-28 h-[26rem] w-[26rem] rounded-full bg-[#EA4335] opacity-10 blur-3xl [animation:g-float_23s_ease-in-out_infinite_alternate-reverse]" />
      <span
        className="absolute bottom-8 left-1/4 h-80 w-80 rounded-full bg-[#FBBC04] opacity-15 blur-3xl [animation:g-float_20s_ease-in-out_infinite_alternate]"
        style={{ animationDelay: "-6s" }}
      />
      <span
        className="absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-[#34A853] opacity-15 blur-3xl [animation:g-float_26s_ease-in-out_infinite_alternate-reverse]"
        style={{ animationDelay: "-10s" }}
      />
    </div>
  );
}

/**
 * Google-styled shell for the hidden team-matching page. The wrapper
 * overrides the site's CSS variables to a Google-light palette so the
 * shared form components blend in when editing.
 */
export function MatchPageClient({
  page,
  isEditor,
  ownerName,
  contactEmail,
  referenceIndex,
  fontClass,
}: MatchPageProps) {
  const [editing, setEditing] = useState(false);
  const [exiting, setExiting] = useState(false);
  /** Reference pane history; empty means the pane is closed. */
  const [refStack, setRefStack] = useState<ReferenceTarget[]>([]);

  const resolver = useMemo(
    () => createReferenceResolver(referenceIndex),
    [referenceIndex],
  );

  /** Opening from the prose starts a fresh trail. */
  const openRef = useCallback((target: ReferenceTarget) => {
    setRefStack([target]);
  }, []);

  /** Drilling in from inside the pane extends the trail. */
  const pushRef = useCallback((target: ReferenceTarget) => {
    setRefStack((stack) => {
      const top = stack[stack.length - 1];
      if (top && top.kind === target.kind && top.id === target.id) return stack;
      return [...stack, target];
    });
  }, []);

  const popRef = useCallback(() => {
    setRefStack((stack) => stack.slice(0, -1));
  }, []);

  const closeRef = useCallback(() => setRefStack([]), []);

  const meetingHref =
    page.meetingUrl ??
    (contactEmail
      ? `mailto:${contactEmail}?subject=Team%20matching%20chat`
      : null);

  return (
    <div
      className={`${fontClass} min-h-screen flex-1 bg-[#f8f9fa] text-[#3c4043] [--accent:#1a73e8] [--bg:#f8f9fa] [--bg-elev:#ffffff] [--danger:#d93025] [--dim:#5f6368] [--hover-bg:rgba(26,115,232,0.05)] [--line:#dadce0] [--title:#202124]`}
    >
      <FloatingOrbs />

      <header className="relative z-10 border-b border-[#dadce0] bg-white/85 backdrop-blur">
        <div className="h-[3px] w-full" style={{ background: FOUR_COLOR_GRADIENT }} />
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1" aria-hidden>
              {GOOGLE_DOTS.map((color) => (
                <span
                  key={color}
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: color }}
                />
              ))}
            </span>
            <span className="text-[17px] text-[#5f6368]">
              Team Matching ·{" "}
              <span className="font-medium text-[#202124]">{ownerName}</span>
            </span>
          </div>
          {isEditor && !editing ? (
            <div className="flex items-center gap-2">
              <Link
                href="/admin/feedback"
                className="rounded-full border border-[#dadce0] px-4 py-1.5 text-sm font-medium text-[#1a73e8] transition-colors hover:bg-[#f1f6fe]"
              >
                Feedback
              </Link>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-full border border-[#dadce0] px-4 py-1.5 text-sm font-medium text-[#1a73e8] transition-colors hover:bg-[#f1f6fe]"
              >
                Edit page
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-10">
        {editing ? (
          <MatchEditorForm
            page={page}
            referenceIndex={referenceIndex}
            onClose={() => setEditing(false)}
          />
        ) : (
          <>
            <div className="flex w-fit items-center gap-3 rounded-full border border-[#dadce0] bg-white px-5 py-2.5 shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4285F4"
                strokeWidth="2.4"
                strokeLinecap="round"
                className="h-4.5 w-4.5"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.8-3.8" />
              </svg>
              <span className="text-[15px] text-[#202124] lowercase">
                {ownerName} · team matching
              </span>
            </div>

            <h1 className="mt-6 text-[32px] leading-tight font-normal text-[#202124]">
              {page.headline || "Team Matching Profile"}
            </h1>
            <div
              className="mt-3 h-1 w-28 rounded-full"
              style={{ background: FOUR_COLOR_GRADIENT }}
              aria-hidden
            />
            {page.intro ? (
              <p className="mt-5 max-w-[65ch] text-[16px] leading-7 whitespace-pre-line">
                <MatchRichText
                  text={page.intro}
                  resolver={resolver}
                  onOpen={openRef}
                />
              </p>
            ) : null}

            <div className="mt-8 space-y-4">
              {page.sections.map((section, index) => (
                <section key={index} className={CARD}>
                  <h2 className="flex items-center gap-2.5 text-lg font-medium text-[#202124]">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: GOOGLE_DOTS[index % GOOGLE_DOTS.length],
                      }}
                      aria-hidden
                    />
                    {section.title}
                  </h2>
                  <p className="mt-2 text-[15px] leading-7 whitespace-pre-line">
                    <MatchRichText
                      text={section.body}
                      resolver={resolver}
                      onOpen={openRef}
                    />
                  </p>
                </section>
              ))}

              {page.resumeUrl ? (
                <section
                  className={`${CARD} flex flex-wrap items-center justify-between gap-3`}
                >
                  <div>
                    <h2 className="text-lg font-medium text-[#202124]">
                      Résumé
                    </h2>
                    <p className="mt-1 text-sm text-[#5f6368]">
                      Team-matching edition — more detail than the public one.
                    </p>
                  </div>
                  <a
                    href={page.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-[#1a73e8] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1765cc]"
                  >
                    View PDF
                  </a>
                </section>
              ) : null}

              {meetingHref ? (
                <section
                  className={`${CARD} flex flex-wrap items-center justify-between gap-3`}
                >
                  <div>
                    <h2 className="text-lg font-medium text-[#202124]">
                      Want to talk?
                    </h2>
                    <p className="mt-1 text-sm text-[#5f6368]">
                      I&apos;m happy to chat about teams, roles, or anything on
                      this page.
                    </p>
                  </div>
                  <a
                    href={meetingHref}
                    target={meetingHref.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="rounded-full bg-[#1a73e8] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1765cc]"
                  >
                    Set up a meeting
                  </a>
                </section>
              ) : null}
            </div>

            <div className="mt-12 flex justify-center border-t border-[#dadce0] pt-8">
              <button
                type="button"
                onClick={() => setExiting(true)}
                className="rounded-full border border-[#dadce0] bg-white px-6 py-2.5 text-sm font-medium text-[#1a73e8] transition-colors hover:bg-[#f1f6fe]"
              >
                Done viewing — leave page
              </button>
            </div>
            <p className="mt-6 text-center text-[11px] text-[#9aa0a6]">
              Inspired by Google&apos;s design language — not affiliated with
              Google.
            </p>
          </>
        )}
      </main>

      {refStack.length > 0 ? (
        <ReferencePane
          stack={refStack}
          resolver={resolver}
          onNavigate={pushRef}
          onBack={popRef}
          onClose={closeRef}
        />
      ) : null}

      {exiting ? <ExitDialog onDismiss={() => setExiting(false)} /> : null}
    </div>
  );
}
