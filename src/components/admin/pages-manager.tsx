"use client";

import { useActionState, useEffect, useState } from "react";

import {
  CancelButton,
  Field,
  FormError,
  SubmitButton,
  inputClass,
} from "@/components/edit/form-fields";
import {
  deleteKnowledgeNote,
  saveKnowledgeNote,
} from "@/lib/actions/knowledge";
import type { ActionResult } from "@/lib/actions/validation";
import {
  SkillPickerField,
  toSkillSelections,
} from "@/components/edit/skill-picker-field";
import type { KnowledgeNote } from "@/lib/knowledge-data";
import type { ReferenceOption } from "@/lib/reference-options";
import { markdownToPlainText } from "@/lib/match-markdown";
import { NoteEditor } from "./note-editor";
import {
  VISIBILITIES,
  VISIBILITY_HELP,
  VISIBILITY_LABEL,
  type NoteVisibility,
} from "@/lib/knowledge-visibility";
import {
  DOCUMENT_ACCEPT,
  MAX_DOCUMENT_LABEL,
  isDocumentTooLarge,
} from "@/lib/upload-limits";

interface KnowledgeManagerProps {
  notes: KnowledgeNote[];
  /** False when no Anthropic key is set: uploads can't be transcribed. */
  extractionEnabled: boolean;
  /** Everything a note's prose can link to, for the editor's picker. */
  referenceOptions: ReferenceOption[];
}

/** A draft row the editor is composing but hasn't saved. */
type Draft = { kind: "note" | "document" } | null;

export function KnowledgeManager({
  notes,
  extractionEnabled,
  referenceOptions,
}: KnowledgeManagerProps) {
  const [draft, setDraft] = useState<Draft>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const grounding = notes.filter((note) => note.visibility !== "draft");
  const characters = grounding.reduce(
    (total, note) => total + note.title.length + note.body.length,
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
          word for word. &ldquo;Private&rdquo; means it has no page of its own,
          not that it stays unsaid — park anything you wouldn&apos;t tell a
          recruiter as a draft.
        </p>
        <p className="mt-2 font-sans text-xs text-(--dim)">
          {grounding.length === 0
            ? "Nothing is grounding answers yet."
            : `${grounding.length} of ${notes.length} ${
                notes.length === 1 ? "entry" : "entries"
              } ground answers — about ${characters.toLocaleString()} characters added to every question asked.`}
        </p>
      </section>

      {draft ? (
        <NoteForm
          kind={draft.kind}
          note={null}
          extractionEnabled={extractionEnabled}
          referenceOptions={referenceOptions}
          onClose={() => setDraft(null)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDraft({ kind: "note" })}
            className="rounded-md bg-(--accent) px-4 py-1.5 font-sans text-sm font-semibold text-(--bg) transition-opacity duration-200 hover:opacity-85"
          >
            + Write a note
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

      {notes.length === 0 ? (
        <p className="font-sans text-sm text-(--dim) italic">
          Nothing here yet. Start with what the résumé leaves out — where you
          are in the process, what you told an interviewer, what you&apos;re
          looking for in a team.
        </p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) =>
            editingId === note.id ? (
              <li key={note.id}>
                <NoteForm
                  kind={note.kind === "document" ? "document" : "note"}
                  note={note}
                  extractionEnabled={extractionEnabled}
                  referenceOptions={referenceOptions}
                  onClose={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={note.id}>
                <NoteCard note={note} onEdit={() => setEditingId(note.id)} />
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

const VISIBILITY_STYLE: Record<NoteVisibility, string> = {
  draft: "border-(--line) text-(--dim)",
  private: "border-(--accent) text-(--accent)",
  published: "border-(--accent) bg-(--hover-bg) text-(--accent)",
};

/** How much of a note's prose the collapsed card shows. */
const PREVIEW_CHARS = 220;

function NoteCard({ note, onEdit }: { note: KnowledgeNote; onEdit: () => void }) {
  const visibility = note.visibility as NoteVisibility;
  const preview = markdownToPlainText(note.body);

  return (
    <article className="rounded-md border border-(--line) bg-(--bg-elev) px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-medium text-(--title)">
            {note.title}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 font-sans text-[11px]">
            <span
              className={`rounded-full border px-2 py-0.5 ${VISIBILITY_STYLE[visibility] ?? ""}`}
            >
              {VISIBILITY_LABEL[visibility] ?? visibility}
            </span>
            {note.kind === "document" ? (
              <span className="rounded-full border border-(--line) px-2 py-0.5 text-(--dim)">
                {note.fileName ?? "Document"}
              </span>
            ) : null}
            {note.skills.map((skill) => (
              <span
                key={skill.id}
                className="rounded-full border border-(--accent) px-2 py-0.5 text-(--accent)"
              >
                {skill.name}
              </span>
            ))}
            {note.tags.map((tag) => (
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
          <DeleteButton id={note.id} title={note.title} />
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
    deleteKnowledgeNote,
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

function NoteForm({
  kind,
  note,
  extractionEnabled,
  referenceOptions,
  onClose,
}: {
  kind: "note" | "document";
  note: KnowledgeNote | null;
  extractionEnabled: boolean;
  referenceOptions: ReferenceOption[];
  onClose: () => void;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    saveKnowledgeNote,
    null,
  );
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const fieldId = (name: string) => `knowledge-${note?.id ?? "new"}-${name}`;

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-md border border-(--accent) bg-(--bg-elev) px-5 py-5"
    >
      <input type="hidden" name="id" value={note?.id ?? ""} />
      <input type="hidden" name="kind" value={kind} />

      <Field label="Title" htmlFor={fieldId("title")}>
        <input
          id={fieldId("title")}
          name="title"
          defaultValue={note?.title ?? ""}
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
                defaultChecked={(note?.visibility ?? "private") === value}
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
            {note?.fileName ? (
              <p className="font-sans text-xs text-(--dim)">
                Currently: {note.fileName}
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
                defaultChecked={note === null}
                className="mt-0.5 h-3.5 w-3.5"
              />
              Replace the text below with what&apos;s read from the file
              {note ? " (uncheck to keep your edits)" : ""}
            </label>
            {note?.fileName ? (
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

      <Field label="Text the AI reads" htmlFor={fieldId("body")}>
        <NoteEditor
          key={note?.updatedAt?.toISOString() ?? "new"}
          name="body"
          initial={note?.body ?? ""}
          rows={kind === "document" ? 14 : 10}
          placeholder={
            kind === "document"
              ? "Filled in from the file on save — or paste the text yourself."
              : "Write it the way you'd say it out loud."
          }
          options={referenceOptions}
        />
      </Field>

      <Field label="Skills this note is about" htmlFor={fieldId("skills")}>
        <div className="space-y-1.5">
          <SkillPickerField initial={toSkillSelections(note?.skills ?? [])} />
          <p className="font-sans text-xs text-(--dim)">
            Tagging a skill puts this note on that skill&apos;s page (when
            published) and tells the AI the note is evidence for it.
          </p>
        </div>
      </Field>

      <Field label="Tags (optional)" htmlFor={fieldId("tags")}>
        <input
          id={fieldId("tags")}
          name="tags"
          defaultValue={note?.tags.join(", ") ?? ""}
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
