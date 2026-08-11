"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { saveTeamMatchPage } from "@/lib/actions/team-match";
import type { ActionResult } from "@/lib/actions/validation";
import type { MatchReferenceIndex } from "@/lib/match-references";
import type { TeamMatchPage } from "@/lib/team-match-data";
import { MAX_PDF_LABEL, isPdfTooLarge } from "@/lib/upload-limits";
import {
  CancelButton,
  Field,
  FormError,
  SubmitButton,
  inputClass,
} from "@/components/edit/form-fields";
import { useMatch } from "./match-shell";

interface SectionRow {
  key: number;
  title: string;
  body: string;
}

interface MatchEditorFormProps {
  page: TeamMatchPage;
  referenceIndex: MatchReferenceIndex;
}

/** Editor-only form for the hidden page, incl. its own résumé upload. */
export function MatchEditorForm({ page, referenceIndex }: MatchEditorFormProps) {
  const { base } = useMatch();
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    saveTeamMatchPage,
    null,
  );
  const [sections, setSections] = useState<SectionRow[]>(() =>
    page.sections.map((section, index) => ({ key: index, ...section })),
  );
  const [nextKey, setNextKey] = useState(page.sections.length + 1);
  const [resumeName, setResumeName] = useState<string | null>(null);

  useEffect(() => {
    if (state?.ok) router.push(base);
  }, [state, router, base]);

  function updateSection(key: number, patch: Partial<SectionRow>) {
    setSections((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  const sectionsJson = JSON.stringify(
    sections.map(({ title, body }) => ({ title, body })),
  );

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-[#dadce0] bg-white p-6"
    >
      <div className="rounded-lg bg-[#f1f6fe] px-4 py-2.5 font-sans text-xs text-[#1a73e8]">
        Private page — only people with the exact link can see it:{" "}
        <span className="font-mono">/match/{page.slug}</span>
      </div>

      <Field label="Headline" htmlFor="match-headline">
        <input
          id="match-headline"
          name="headline"
          defaultValue={page.headline}
          className={inputClass}
        />
      </Field>
      <Field label="Intro" htmlFor="match-intro">
        <textarea
          id="match-intro"
          name="intro"
          defaultValue={page.intro}
          rows={3}
          className={inputClass}
        />
      </Field>

      <ReferenceHelp index={referenceIndex} />

      <p className="font-sans text-xs text-(--dim)">
        Each section below is its own page, at{" "}
        <span className="font-mono">/match/{page.slug}/&lt;title&gt;</span>, and
        gets a card on the home page. A section titled{" "}
        <span className="font-medium">My Strongest Skills</span> also lists your
        tagged skills automatically, ranked by how much work uses them.
      </p>

      <Field label="Sections" htmlFor="sections">
        <input type="hidden" name="sections" value={sectionsJson} />
        <div className="space-y-4">
          {sections.map((section) => (
            <div
              key={section.key}
              className="space-y-2 rounded-lg border border-[#dadce0] p-3"
            >
              <div className="flex items-center gap-2">
                <input
                  value={section.title}
                  onChange={(event) =>
                    updateSection(section.key, { title: event.target.value })
                  }
                  placeholder="Section title"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() =>
                    setSections((current) =>
                      current.filter((row) => row.key !== section.key),
                    )
                  }
                  aria-label="Remove section"
                  className="rounded p-1 text-(--dim) hover:text-(--danger)"
                >
                  ✕
                </button>
              </div>
              <textarea
                value={section.body}
                onChange={(event) =>
                  updateSection(section.key, { body: event.target.value })
                }
                rows={4}
                placeholder="Section content…"
                className={inputClass}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setSections((current) => [
                ...current,
                { key: nextKey, title: "", body: "" },
              ]);
              setNextKey((k) => k + 1);
            }}
            className="font-sans text-xs font-medium text-(--accent) underline-offset-2 hover:underline"
          >
            + Add section
          </button>
        </div>
      </Field>

      <Field label="Meeting link (optional)" htmlFor="match-meeting">
        <input
          id="match-meeting"
          name="meetingUrl"
          type="url"
          defaultValue={page.meetingUrl ?? ""}
          placeholder="https://cal.com/… (falls back to email)"
          className={inputClass}
        />
      </Field>

      <Field label="Résumé for this page (PDF)" htmlFor="match-resume">
        <div className="space-y-2">
          {page.resumeUrl ? (
            <a
              href={page.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-xs text-(--accent) underline-offset-2 hover:underline"
            >
              View current résumé ↗
            </a>
          ) : null}
          <input
            id="match-resume"
            type="file"
            name="resume"
            accept="application/pdf"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (!file) {
                setResumeName(null);
                return;
              }
              if (file.type !== "application/pdf") {
                window.alert("Résumé must be a PDF file.");
                event.currentTarget.value = "";
                setResumeName(null);
                return;
              }
              if (isPdfTooLarge(file)) {
                window.alert(`PDF is too large (max ${MAX_PDF_LABEL}).`);
                event.currentTarget.value = "";
                setResumeName(null);
                return;
              }
              setResumeName(file.name);
            }}
            className="block font-sans text-sm text-(--dim) file:mr-3 file:rounded-md file:border file:border-(--line) file:bg-(--bg-elev) file:px-3 file:py-1.5 file:font-sans file:text-sm file:font-medium file:text-(--text) hover:file:bg-(--hover-bg)"
          />
          {resumeName ? (
            <p className="font-sans text-xs text-(--dim)">
              Selected: {resumeName}
            </p>
          ) : null}
          {page.resumeUrl && !resumeName ? (
            <label className="flex items-center gap-2 font-sans text-xs text-(--dim)">
              <input
                type="checkbox"
                name="removeResume"
                className="h-3.5 w-3.5"
              />
              Remove current résumé
            </label>
          ) : null}
        </div>
      </Field>

      <FormError message={state && !state.ok ? state.error : null} />
      <div className="flex gap-2">
        <SubmitButton>Save page</SubmitButton>
        <CancelButton onClick={() => router.push(base)} />
      </div>
    </form>
  );
}

/**
 * Cheat sheet for inline references. The intro and every section body
 * accept these tokens; unrecognized names quietly render as plain text,
 * so a typo degrades instead of leaking syntax onto the page.
 */
function ReferenceHelp({ index }: { index: MatchReferenceIndex }) {
  const sampleProject = index.projects[0]?.name ?? "Simple C Compiler";

  return (
    <details className="rounded-lg border border-(--line) bg-(--bg) px-4 py-2.5 font-sans text-xs text-(--dim)">
      <summary className="cursor-pointer font-medium text-(--text)">
        Linking projects and skills in your text
      </summary>
      <div className="mt-3 space-y-3">
        <p>
          Mention a project, skill or course by name and it becomes a link
          to that entry&apos;s own page:
        </p>
        <ul className="space-y-1">
          <li>
            <code className="font-mono">[[project:{sampleProject}]]</code>
          </li>
          <li>
            <code className="font-mono">[[skill:C]]</code>
          </li>
          <li>
            <code className="font-mono">[[course:CS 4120]]</code>
          </li>
          <li>
            <code className="font-mono">
              [[project:{sampleProject}|my compiler]]
            </code>{" "}
            — custom link text
          </li>
        </ul>
        <ReferenceNameList
          label="Projects"
          names={index.projects.map((project) => project.name)}
        />
        <ReferenceNameList
          label="Courses"
          names={index.courses.map((course) => course.courseNumber)}
        />
        <ReferenceNameList
          label="Skills"
          names={index.skills.map((skill) => skill.name)}
        />
      </div>
    </details>
  );
}

function ReferenceNameList({
  label,
  names,
}: {
  label: string;
  names: string[];
}) {
  if (names.length === 0) return null;

  return (
    <div>
      <p className="font-medium text-(--text)">{label}</p>
      <p className="mt-1 leading-5">
        {[...names].sort((a, b) => a.localeCompare(b)).join(" · ")}
      </p>
    </div>
  );
}
