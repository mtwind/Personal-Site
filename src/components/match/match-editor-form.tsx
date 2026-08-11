"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import { saveTeamMatchPage } from "@/lib/actions/team-match";
import type { ActionResult } from "@/lib/actions/validation";
import {
  featureCandidates,
  type FeatureCandidate,
  type FeaturedEntry,
} from "@/lib/match-featured";
import {
  KIND_LABEL,
  type MatchReferenceIndex,
} from "@/lib/match-references";
import { referenceOptions, type ReferenceOption } from "@/lib/reference-options";
import type { TeamMatchPage } from "@/lib/team-match-data";
import { MAX_PDF_LABEL, isPdfTooLarge } from "@/lib/upload-limits";
import {
  CancelButton,
  Field,
  FormError,
  SubmitButton,
  inputClass,
} from "@/components/edit/form-fields";
import { ProseEditor } from "@/components/edit/prose-editor";
import { useMatch } from "./match-shell";

interface MatchEditorFormProps {
  page: TeamMatchPage;
  /** The home listing as stored, already validated. */
  featured: FeaturedEntry[];
  referenceIndex: MatchReferenceIndex;
}

/** A row being arranged, with a key React can keep hold of. */
interface FeaturedRow extends FeaturedEntry {
  key: number;
}

/** Editor-only form for the hidden page, incl. its own résumé upload. */
export function MatchEditorForm({
  page,
  featured,
  referenceIndex,
}: MatchEditorFormProps) {
  const { base } = useMatch();
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    saveTeamMatchPage,
    null,
  );
  const [rows, setRows] = useState<FeaturedRow[]>(() =>
    featured.map((entry, index) => ({ key: index, ...entry })),
  );
  const [nextKey, setNextKey] = useState(featured.length);
  const [resumeName, setResumeName] = useState<string | null>(null);

  useEffect(() => {
    if (state?.ok) router.push(base);
  }, [state, router, base]);

  const candidates = useMemo(
    () => featureCandidates(referenceIndex),
    [referenceIndex],
  );
  // The same list the page editor's picker uses: anything with a page of
  // its own can be linked from anything else that carries prose.
  const linkOptions = useMemo(
    () => referenceOptions(referenceIndex),
    [referenceIndex],
  );
  const byId = useMemo(
    () => new Map(candidates.map((entry) => [entry.id, entry])),
    [candidates],
  );

  function update(key: number, patch: Partial<FeaturedEntry>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  /** Move a row one place; the arrangement *is* the reading order. */
  function move(key: number, direction: -1 | 1) {
    setRows((current) => {
      const at = current.findIndex((row) => row.key === key);
      const to = at + direction;
      if (at === -1 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[at], next[to]] = [next[to], next[at]];
      return next;
    });
  }

  const featuredJson = JSON.stringify(
    rows.map(({ kind, id, title, snippet }) => ({
      kind,
      id,
      title,
      snippet,
    })),
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
        <ProseEditor
          id="match-intro"
          name="intro"
          initial={page.intro}
          rows={3}
          placeholder="What this page is, in a couple of sentences."
          options={linkOptions}
          compact
        />
      </Field>

      <Field label="Results on the home page" htmlFor="featured">
        <input type="hidden" name="featured" value={featuredJson} />
        <div className="space-y-3">
          <p className="font-sans text-xs text-(--dim)">
            Anything on this site can be listed here — a page, a role, a
            project, a course, a skill — in the order you arrange them. Each
            one shows its own title and description unless you write something
            different for this listing.
          </p>

          {rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-(--line) px-4 py-6 text-center font-sans text-xs text-(--dim)">
              Nothing listed yet, so the home page is the headline and intro
              alone.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row, index) => (
                <li key={row.key}>
                  <FeaturedRowEditor
                    row={row}
                    entry={byId.get(row.id) ?? null}
                    isFirst={index === 0}
                    isLast={index === rows.length - 1}
                    linkOptions={linkOptions}
                    onChange={(patch) => update(row.key, patch)}
                    onMove={(direction) => move(row.key, direction)}
                    onRemove={() =>
                      setRows((current) =>
                        current.filter((candidate) => candidate.key !== row.key),
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}

          <FeaturePicker
            candidates={candidates}
            // An entry listed twice is a mistake, not an arrangement.
            chosen={new Set(rows.map((row) => row.id))}
            onPick={(candidate) => {
              setRows((current) => [
                ...current,
                {
                  key: nextKey,
                  kind: candidate.kind,
                  id: candidate.id,
                  title: null,
                  snippet: null,
                },
              ]);
              setNextKey((key) => key + 1);
            }}
          />
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
 * One listed result.
 *
 * The overrides are empty by default and stay that way unless there is a
 * reason: a blank box means "use the entry's own words", so a project
 * that gets renamed or re-described keeps the home page current without
 * anyone editing it twice.
 */
function FeaturedRowEditor({
  row,
  entry,
  isFirst,
  isLast,
  linkOptions,
  onChange,
  onMove,
  onRemove,
}: {
  row: FeaturedRow;
  /** Null when the entry has since been deleted or unpublished. */
  entry: FeatureCandidate | null;
  isFirst: boolean;
  isLast: boolean;
  linkOptions: ReferenceOption[];
  onChange: (patch: Partial<FeaturedEntry>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-[#dadce0] p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[10px] tracking-[0.14em] text-(--dim) uppercase">
            {KIND_LABEL[row.kind]}
            {entry?.detail ? ` · ${entry.detail}` : ""}
          </p>
          <p className="truncate text-[15px] text-(--title)">
            {entry?.title ?? "No longer on the site — remove this row"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={isFirst}
            aria-label="Move up"
            className="rounded p-1 text-(--dim) hover:text-(--accent) disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={isLast}
            aria-label="Move down"
            className="rounded p-1 text-(--dim) hover:text-(--accent) disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove from the home page"
            className="rounded p-1 text-(--dim) hover:text-(--danger)"
          >
            ✕
          </button>
        </div>
      </div>

      <input
        value={row.title ?? ""}
        onChange={(event) => onChange({ title: event.target.value || null })}
        placeholder={entry ? `Title on the home page (${entry.title})` : "Title"}
        className={inputClass}
      />
      <ProseEditor
        initial={row.snippet ?? ""}
        value={row.snippet ?? ""}
        onChange={(next) => onChange({ snippet: next || null })}
        rows={2}
        placeholder="Description on the home page — leave blank to use its own"
        options={linkOptions}
        compact
      />
    </div>
  );
}

/** How many matches the picker offers before asking for a better query. */
const PICKER_LIMIT = 8;

function FeaturePicker({
  candidates,
  chosen,
  onPick,
}: {
  candidates: FeatureCandidate[];
  chosen: Set<string>;
  onPick: (candidate: FeatureCandidate) => void;
}) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return candidates
      .filter((candidate) => !chosen.has(candidate.id))
      .filter(
        (candidate) =>
          needle === "" ||
          candidate.title.toLowerCase().includes(needle) ||
          (candidate.detail ?? "").toLowerCase().includes(needle),
      )
      .slice(0, PICKER_LIMIT);
  }, [candidates, chosen, query]);

  return (
    <div className="rounded-lg border border-(--line) p-3">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          // Enter inside this box adds a result; it must not submit the
          // form the box happens to sit in.
          event.preventDefault();
          if (matches[0]) {
            onPick(matches[0]);
            setQuery("");
          }
        }}
        placeholder="Add a result — search pages, roles, projects, courses, skills…"
        className={inputClass}
      />
      {matches.length === 0 ? (
        <p className="mt-2 font-sans text-xs text-(--dim)">
          {candidates.length === 0
            ? "Nothing to list yet — write a page or add work on the main site."
            : `Nothing left matching “${query.trim()}”.`}
        </p>
      ) : (
        <ul className="mt-2 space-y-0.5">
          {matches.map((candidate) => (
            <li key={`${candidate.kind}:${candidate.id}`}>
              <button
                type="button"
                onClick={() => {
                  onPick(candidate);
                  setQuery("");
                }}
                className="flex w-full items-baseline gap-2 rounded px-2 py-1 text-left font-sans text-sm text-(--text) transition-colors duration-150 hover:bg-(--hover-bg)"
              >
                <span className="shrink-0 font-sans text-[10px] tracking-[0.1em] text-(--dim) uppercase">
                  {KIND_LABEL[candidate.kind]}
                </span>
                <span className="min-w-0 truncate">{candidate.title}</span>
                {candidate.detail ? (
                  <span className="ml-auto shrink-0 truncate font-sans text-xs text-(--dim)">
                    {candidate.detail}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
