"use client";

import { useActionState, useEffect, useState } from "react";

import {
  CancelButton,
  Field,
  FormError,
  SubmitButton,
  inputClass,
} from "@/components/edit/form-fields";
import { deleteSitePage, saveSitePage } from "@/lib/actions/pages";
import type { ActionResult } from "@/lib/actions/validation";
import {
  SkillPickerField,
  toSkillSelections,
} from "@/components/edit/skill-picker-field";
import type { SitePage } from "@/lib/pages-data";
import type { ReferenceOption } from "@/lib/reference-options";
import { markdownToPlainText } from "@/lib/match-markdown";
import { ProseEditor } from "@/components/edit/prose-editor";
import {
  VISIBILITIES,
  VISIBILITY_HELP,
  VISIBILITY_LABEL,
  type PageVisibility,
} from "@/lib/page-visibility";
import {
  DOCUMENT_ACCEPT,
  MAX_DOCUMENT_LABEL,
  isDocumentTooLarge,
} from "@/lib/upload-limits";

interface PagesManagerProps {
  pages: SitePage[];
  /** False when no Anthropic key is set: uploads can't be transcribed. */
  extractionEnabled: boolean;
  /** Everything a page's prose can link to, for the editor's picker. */
  referenceOptions: ReferenceOption[];
}

/** A draft row the editor is composing but hasn't saved. */
type Draft = { kind: "page" | "document" } | null;

export function PagesManager({
  pages,
  extractionEnabled,
  referenceOptions,
}: PagesManagerProps) {
  const [draft, setDraft] = useState<Draft>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const grounding = pages.filter((page) => page.visibility !== "draft");
  const characters = grounding.reduce(
    (total, page) => total + page.title.length + page.body.length,
    0,
  );

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-md border border-(--line) bg-(--bg-elev) px-5 py-4">
        <h2 className="font-sans text-[11px] font-semibold tracking-[0.14em] text-(--dim) uppercase">
          How this reaches people
        </h2>
        <p className="mt-2 text-[14px] leading-6 text-(--text)">
          Everything here that isn&apos;t a draft is read by the AI overview on
          the team-matching page and can be <em>quoted back to a visitor</em>{" "}
          word for word. &ldquo;Private&rdquo; means the page has no URL of its
          own, not that it stays unsaid — park anything you wouldn&apos;t tell a
          recruiter as a draft.
        </p>
        <p className="mt-2 font-sans text-xs text-(--dim)">
          {grounding.length === 0
            ? "Nothing is grounding answers yet."
            : `${grounding.length} of ${pages.length} ${
                pages.length === 1 ? "page" : "pages"
              } ground answers — about ${characters.toLocaleString()} characters added to every question asked.`}
        </p>
      </section>

      {draft ? (
        <PageForm
          kind={draft.kind}
          page={null}
          extractionEnabled={extractionEnabled}
          referenceOptions={referenceOptions}
          onClose={() => setDraft(null)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDraft({ kind: "page" })}
            className="rounded-md bg-(--accent) px-4 py-1.5 font-sans text-sm font-semibold text-(--bg) transition-opacity duration-200 hover:opacity-85"
          >
            + Write a page
          </button>
          <button
            type="button"
            onClick={() => setDraft({ kind: "document" })}
            className="rounded-md border border-(--accent) px-4 py-1.5 font-sans text-sm font-medium text-(--accent) transition-colors duration-200 hover:bg-(--hover-bg)"
          >
            + Add a document
          </button>
        </div>
      )}

      {pages.length === 0 ? (
        <p className="font-sans text-sm text-(--dim) italic">
          Nothing here yet. Start with what the résumé leaves out — where you
          are in the process, what you told an interviewer, what you&apos;re
          looking for in a team.
        </p>
      ) : (
        <ul className="space-y-3">
          {pages.map((page) =>
            editingId === page.id ? (
              <li key={page.id}>
                <PageForm
                  kind={page.kind === "document" ? "document" : "page"}
                  page={page}
                  extractionEnabled={extractionEnabled}
                  referenceOptions={referenceOptions}
                  onClose={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={page.id}>
                <PageCard page={page} onEdit={() => setEditingId(page.id)} />
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

const VISIBILITY_STYLE: Record<PageVisibility, string> = {
  draft: "border-(--line) text-(--dim)",
  private: "border-(--accent) text-(--accent)",
  published: "border-(--accent) bg-(--hover-bg) text-(--accent)",
};

/** How much of a page's prose the collapsed card shows. */
const PREVIEW_CHARS = 220;

function PageCard({ page, onEdit }: { page: SitePage; onEdit: () => void }) {
  const visibility = page.visibility as PageVisibility;
  const preview = markdownToPlainText(page.body);

  return (
    <article className="rounded-md border border-(--line) bg-(--bg-elev) px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-medium text-(--title)">
            {page.title}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 font-sans text-[11px]">
            <span
              className={`rounded-full border px-2 py-0.5 ${VISIBILITY_STYLE[visibility] ?? ""}`}
            >
              {VISIBILITY_LABEL[visibility] ?? visibility}
            </span>
            {page.kind === "document" ? (
              <span className="rounded-full border border-(--line) px-2 py-0.5 text-(--dim)">
                {page.fileName ?? "Document"}
              </span>
            ) : null}
            {page.skills.map((skill) => (
              <span
                key={skill.id}
                className="rounded-full border border-(--accent) px-2 py-0.5 text-(--accent)"
              >
                {skill.name}
              </span>
            ))}
            {page.tags.map((tag) => (
              <span key={tag} className="text-(--dim)">
                #{tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-(--accent) px-2.5 py-1 font-sans text-xs font-medium text-(--accent) transition-colors duration-200 hover:bg-(--hover-bg)"
          >
            Edit
          </button>
          <DeleteButton id={page.id} title={page.title} />
        </div>
      </div>

      {preview ? (
        <p className="mt-3 text-[14px] leading-6 text-(--text)">
          {preview.length > PREVIEW_CHARS
            ? `${preview.slice(0, PREVIEW_CHARS).trimEnd()}…`
            : preview}
        </p>
      ) : (
        <p className="mt-3 font-sans text-sm text-(--dim) italic">
          No text yet — the AI has nothing to read here.
        </p>
      )}
    </article>
  );
}

function DeleteButton({ id, title }: { id: string; title: string }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    deleteSitePage,
    null,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`Delete “${title}”? This can't be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md border border-(--line) px-2.5 py-1 font-sans text-xs text-(--dim) transition-colors duration-200 hover:border-(--danger) hover:text-(--danger)"
      >
        Delete
      </button>
      {state && !state.ok ? (
        <p role="alert" className="mt-1 font-sans text-xs text-(--danger)">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function PageForm({
  kind,
  page,
  extractionEnabled,
  referenceOptions,
  onClose,
}: {
  kind: "page" | "document";
  page: SitePage | null;
  extractionEnabled: boolean;
  referenceOptions: ReferenceOption[];
  onClose: () => void;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    saveSitePage,
    null,
  );
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const fieldId = (name: string) => `page-${page?.id ?? "new"}-${name}`;

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-md border border-(--accent) bg-(--bg-elev) px-5 py-5"
    >
      <input type="hidden" name="id" value={page?.id ?? ""} />
      <input type="hidden" name="kind" value={kind} />

      <Field label="Title" htmlFor={fieldId("title")}>
        <input
          id={fieldId("title")}
          name="title"
          defaultValue={page?.title ?? ""}
          placeholder={
            kind === "document"
              ? "e.g. Reference letter — Jane Doe"
              : "e.g. Where I am in the interview process"
          }
          className={inputClass}
        />
      </Field>

      <fieldset>
        <legend className="block font-sans text-[10.5px] font-semibold tracking-[0.14em] text-(--dim) uppercase">
          Visibility
        </legend>
        <div className="mt-2 space-y-1.5">
          {VISIBILITIES.map((value) => (
            <label
              key={value}
              className="flex cursor-pointer items-start gap-2.5 rounded-md border border-(--line) px-3 py-2 transition-colors has-checked:border-(--accent) has-checked:bg-(--hover-bg)"
            >
              <input
                type="radio"
                name="visibility"
                value={value}
                defaultChecked={(page?.visibility ?? "private") === value}
                className="mt-1"
              />
              <span>
                <span className="block font-sans text-sm font-medium text-(--title)">
                  {VISIBILITY_LABEL[value]}
                </span>
                <span className="block font-sans text-xs text-(--dim)">
                  {VISIBILITY_HELP[value]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {kind === "document" ? (
        <Field label="File" htmlFor={fieldId("document")}>
          <div className="space-y-2">
            {page?.fileName ? (
              <p className="font-sans text-xs text-(--dim)">
                Currently: {page.fileName}
              </p>
            ) : null}
            <input
              id={fieldId("document")}
              type="file"
              name="document"
              accept={DOCUMENT_ACCEPT}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (!file) {
                  setFileName(null);
                  return;
                }
                if (isDocumentTooLarge(file)) {
                  window.alert(`File is too large (max ${MAX_DOCUMENT_LABEL}).`);
                  event.currentTarget.value = "";
                  setFileName(null);
                  return;
                }
                setFileName(file.name);
              }}
              className="block font-sans text-sm text-(--dim) file:mr-3 file:rounded-md file:border file:border-(--line) file:bg-(--bg-elev) file:px-3 file:py-1.5 file:font-sans file:text-sm file:font-medium file:text-(--text) hover:file:bg-(--hover-bg)"
            />
            {fileName ? (
              <p className="font-sans text-xs text-(--dim)">
                Selected: {fileName}
              </p>
            ) : null}
            <p className="font-sans text-xs text-(--dim)">
              PDF, text, Markdown, or an image (a photo of a page works), up to{" "}
              {MAX_DOCUMENT_LABEL}.{" "}
              {extractionEnabled
                ? "Claude reads it on save and fills the text below — that takes a few seconds for a long document."
                : "No Anthropic key is set, so PDFs and images can't be read automatically — paste the text in below."}
            </p>
            <label className="flex items-start gap-2 font-sans text-xs text-(--text)">
              <input
                type="checkbox"
                name="replaceText"
                defaultChecked={page === null}
                className="mt-0.5 h-3.5 w-3.5"
              />
              Replace the text below with what&apos;s read from the file
              {page ? " (uncheck to keep your edits)" : ""}
            </label>
            {page?.fileName ? (
              <label className="flex items-center gap-2 font-sans text-xs text-(--dim)">
                <input
                  type="checkbox"
                  name="removeDocument"
                  className="h-3.5 w-3.5"
                />
                Remove the current file (keeps the text)
              </label>
            ) : null}
          </div>
        </Field>
      ) : null}

      <Field label="The page itself" htmlFor={fieldId("body")}>
        <ProseEditor
          key={page?.updatedAt?.toISOString() ?? "new"}
          id={fieldId("body")}
          name="body"
          initial={page?.body ?? ""}
          rows={kind === "document" ? 14 : 10}
          placeholder={
            kind === "document"
              ? "Filled in from the file on save — or paste the text yourself."
              : "Write it the way you'd say it out loud."
          }
          options={referenceOptions}
        />
      </Field>

      <label className="flex items-start gap-2.5 rounded-md border border-(--line) px-3 py-2 font-sans text-sm text-(--text) transition-colors has-checked:border-(--accent) has-checked:bg-(--hover-bg)">
        <input
          type="checkbox"
          name="showSkillRanking"
          defaultChecked={page?.showSkillRanking ?? false}
          className="mt-1 h-3.5 w-3.5"
        />
        <span>
          <span className="block font-medium text-(--title)">
            Also list my strongest skills
          </span>
          <span className="block font-sans text-xs text-(--dim)">
            Adds the ranking derived from what your work is tagged with, under
            this page&apos;s text. Counted from the profile, so it can&apos;t go
            stale.
          </span>
        </span>
      </label>

      <Field label="Skills this page is about" htmlFor={fieldId("skills")}>
        <div className="space-y-1.5">
          <SkillPickerField initial={toSkillSelections(page?.skills ?? [])} />
          <p className="font-sans text-xs text-(--dim)">
            Tagging a skill lists this page on that skill&apos;s page (when
            published) and tells the AI the page is evidence for it.
          </p>
        </div>
      </Field>

      <Field label="Tags (optional)" htmlFor={fieldId("tags")}>
        <input
          id={fieldId("tags")}
          name="tags"
          defaultValue={page?.tags.join(", ") ?? ""}
          placeholder="interviews, logistics — for your own filing; never shown"
          className={inputClass}
        />
      </Field>

      <FormError message={state && !state.ok ? state.error : null} />
      <div className="flex gap-2">
        <SubmitButton>Save</SubmitButton>
        <CancelButton onClick={onClose} />
      </div>
    </form>
  );
}
