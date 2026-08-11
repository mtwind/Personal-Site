"use client";

import { useActionState, useEffect, useState } from "react";

import {
  CancelButton,
  EditButton,
  Field,
  FormError,
  SubmitButton,
  inputClass,
} from "@/components/edit/form-fields";
import { ProseEditor } from "@/components/edit/prose-editor";
import {
  deleteQuestion,
  saveQuestion,
  toggleQuestion,
} from "@/lib/actions/questions";
import type { ActionResult } from "@/lib/actions/validation";
import type { RelatedQuestionRow } from "@/lib/questions-data";
import type { ReferenceOption } from "@/lib/reference-options";

interface QuestionsManagerProps {
  questions: RelatedQuestionRow[];
  /** Everything an answer can link to, for the editor's picker. */
  referenceOptions: ReferenceOption[];
}

export function QuestionsManager({
  questions,
  referenceOptions,
}: QuestionsManagerProps) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-md border border-(--line) bg-(--bg-elev) px-5 py-4">
        <h2 className="font-sans text-[11px] font-semibold tracking-[0.14em] text-(--dim) uppercase">
          What this block is for
        </h2>
        <p className="mt-2 text-[14px] leading-6 text-(--text)">
          The overview answers whatever a visitor types. These are the
          questions they <em>wouldn&apos;t</em> type into someone&apos;s profile
          but want the answer to — when you could start, what kind of team you
          want, whether you need sponsorship. Answering them out loud is the
          whole point.
        </p>
        <p className="mt-2 font-sans text-xs text-(--dim)">
          Up to four show under any search. Keywords decide which ones a
          particular search gets; leave them empty for a question general
          enough to belong under anything.
        </p>
      </section>

      {creating ? (
        <QuestionForm onDone={() => setCreating(false)} options={referenceOptions} />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="w-full cursor-pointer rounded-md border border-dashed border-(--line) px-5 py-3 font-sans text-sm text-(--dim) transition-colors hover:border-(--accent) hover:text-(--accent)"
        >
          + Add a question
        </button>
      )}

      {questions.length === 0 && !creating ? (
        <p className="font-sans text-sm text-(--dim) italic">
          No questions yet.
        </p>
      ) : null}

      <ul className="space-y-4">
        {questions.map((question) =>
          editingId === question.id ? (
            <li key={question.id}>
              <QuestionForm
                question={question}
                options={referenceOptions}
                onDone={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={question.id}>
              <QuestionCard
                question={question}
                onEdit={() => setEditingId(question.id)}
              />
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function QuestionCard({
  question,
  onEdit,
}: {
  question: RelatedQuestionRow;
  onEdit: () => void;
}) {
  const [toggleState, toggle, toggling] = useActionState(toggleQuestion, null);
  const [deleteState, remove, removing] = useActionState(deleteQuestion, null);

  return (
    <article
      className={`rounded-md border border-(--line) bg-(--bg-elev) px-5 py-4 ${
        question.active ? "" : "opacity-60"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] leading-6 text-(--title)">
            {question.question}
          </h3>
          <p className="mt-1 font-sans text-[11px] tracking-[0.12em] text-(--dim) uppercase">
            #{question.sortOrder}
            {question.active ? "" : " · hidden"}
            {question.keywords.length > 0
              ? ` · ${question.keywords.join(", ")}`
              : " · shows under any search"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <EditButton label="Edit" onClick={onEdit} />
          <form action={toggle}>
            <input type="hidden" name="id" value={question.id} />
            <button
              type="submit"
              disabled={toggling}
              className="cursor-pointer font-sans text-[12px] text-(--dim) underline-offset-2 hover:text-(--accent) hover:underline disabled:opacity-50"
            >
              {question.active ? "Hide" : "Show"}
            </button>
          </form>
          <form action={remove}>
            <input type="hidden" name="id" value={question.id} />
            <button
              type="submit"
              disabled={removing}
              className="cursor-pointer font-sans text-[12px] text-(--danger) underline-offset-2 hover:underline disabled:opacity-50"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      {question.answer ? (
        <p className="mt-3 text-[14px] leading-6 whitespace-pre-line text-(--text)">
          {question.answer}
        </p>
      ) : (
        <p className="mt-3 font-sans text-sm text-(--dim) italic">
          No answer written yet — visitors see the question with a note saying
          so, which is worth fixing.
        </p>
      )}

      <FormError
        message={
          toggleState?.ok === false
            ? toggleState.error
            : deleteState?.ok === false
              ? deleteState.error
              : null
        }
      />
    </article>
  );
}

function QuestionForm({
  question,
  options,
  onDone,
}: {
  question?: RelatedQuestionRow;
  options: ReferenceOption[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveQuestion,
    null,
  );

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form
      action={action}
      className="space-y-4 rounded-md border border-(--accent) bg-(--bg-elev) px-5 py-5"
    >
      {question ? <input type="hidden" name="id" value={question.id} /> : null}

      <Field label="Question" htmlFor="question">
        <input
          id="question"
          name="question"
          defaultValue={question?.question ?? ""}
          placeholder="Do you need visa sponsorship?"
          className={inputClass}
          required
        />
      </Field>

      <Field label="Answer" htmlFor="answer">
        <ProseEditor
          id="answer"
          name="answer"
          initial={question?.answer ?? ""}
          rows={5}
          placeholder="Answer it the way you'd answer it on a call."
          options={options}
          compact
        />
      </Field>
      <p className="font-sans text-xs text-(--dim)">
        Links work here — point the answer at the page, role or project that
        backs it up, and the visitor can go read it.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Keywords" htmlFor="keywords">
          <input
            id="keywords"
            name="keywords"
            defaultValue={question?.keywords.join(", ") ?? ""}
            placeholder="visa, sponsorship, relocation"
            className={inputClass}
          />
        </Field>
        <Field label="Order" htmlFor="sortOrder">
          <input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={question?.sortOrder ?? 0}
            className={inputClass}
          />
        </Field>
      </div>
      <p className="font-sans text-xs text-(--dim)">
        Comma separated. A search matching one of these puts the question at the
        top of the block; with no keywords it fills whatever room is left, in
        this order.
      </p>

      <label className="flex items-center gap-2 font-sans text-sm text-(--text)">
        <input
          type="checkbox"
          name="active"
          defaultChecked={question?.active ?? true}
          className="h-4 w-4"
        />
        Show this question
      </label>

      <FormError message={state?.ok === false ? state.error : null} />

      <div className="flex items-center gap-3">
        <SubmitButton>{pending ? "Saving…" : "Save question"}</SubmitButton>
        <CancelButton onClick={onDone} />
      </div>
    </form>
  );
}
