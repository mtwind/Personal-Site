"use client";

import { useState } from "react";

import type { TeamMatchPage } from "@/lib/team-match-data";
import { ExitDialog } from "./exit-dialog";
import { MatchEditorForm } from "./match-editor-form";

export interface MatchPageProps {
  page: TeamMatchPage;
  isEditor: boolean;
  ownerName: string;
  contactEmail: string | null;
}

const GOOGLE_DOTS = ["#4285F4", "#EA4335", "#FBBC04", "#34A853"];

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
}: MatchPageProps) {
  const [editing, setEditing] = useState(false);
  const [exiting, setExiting] = useState(false);

  const meetingHref =
    page.meetingUrl ??
    (contactEmail
      ? `mailto:${contactEmail}?subject=Team%20matching%20chat`
      : null);

  return (
    <div className="min-h-screen flex-1 bg-[#f8f9fa] font-sans text-[#3c4043] [--accent:#1a73e8] [--bg:#f8f9fa] [--bg-elev:#ffffff] [--danger:#d93025] [--dim:#5f6368] [--hover-bg:rgba(26,115,232,0.05)] [--line:#dadce0] [--title:#202124]">
      <header className="border-b border-[#dadce0] bg-white">
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
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full border border-[#dadce0] px-4 py-1.5 text-sm font-medium text-[#1a73e8] transition-colors hover:bg-[#f1f6fe]"
            >
              Edit page
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        {editing ? (
          <MatchEditorForm page={page} onClose={() => setEditing(false)} />
        ) : (
          <>
            <h1 className="text-[32px] leading-tight font-normal text-[#202124]">
              {page.headline || "Team Matching Profile"}
            </h1>
            {page.intro ? (
              <p className="mt-3 max-w-[65ch] text-[16px] leading-7 whitespace-pre-line">
                {page.intro}
              </p>
            ) : null}

            <div className="mt-8 space-y-4">
              {page.sections.map((section, index) => (
                <section
                  key={index}
                  className="rounded-2xl border border-[#dadce0] bg-white p-6"
                >
                  <h2 className="text-lg font-medium text-[#202124]">
                    {section.title}
                  </h2>
                  <p className="mt-2 text-[15px] leading-7 whitespace-pre-line">
                    {section.body}
                  </p>
                </section>
              ))}

              {page.resumeUrl ? (
                <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dadce0] bg-white p-6">
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
                <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dadce0] bg-white p-6">
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
          </>
        )}
      </main>

      {exiting ? <ExitDialog onDismiss={() => setExiting(false)} /> : null}
    </div>
  );
}
