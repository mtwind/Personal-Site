"use client";

import { useActionState, useEffect, useState } from "react";

import { saveAbout } from "@/lib/actions/profile";
import type { ActionResult } from "@/lib/actions/validation";
import type { About } from "@/lib/profile-data";
import { AboutView } from "@/components/profile/about-section";
import { Section } from "@/components/profile/section";
import {
  CancelButton,
  EditButton,
  Field,
  FormError,
  SubmitButton,
  inputClass,
} from "./form-fields";

function AboutForm({
  about,
  onClose,
}: {
  about: About | null;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    saveAbout,
    null,
  );

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Name" htmlFor="about-name">
        <input
          id="about-name"
          name="name"
          defaultValue={about?.name ?? ""}
          required
          className={inputClass}
        />
      </Field>
      <Field label="Headline" htmlFor="about-headline">
        <input
          id="about-headline"
          name="headline"
          defaultValue={about?.headline ?? ""}
          placeholder="Software engineer building…"
          className={inputClass}
        />
      </Field>
      <Field label="About" htmlFor="about-body">
        <textarea
          id="about-body"
          name="body"
          defaultValue={about?.body ?? ""}
          rows={6}
          className={inputClass}
        />
      </Field>
      <Field label="Photo URL" htmlFor="about-photo">
        <input
          id="about-photo"
          name="photoUrl"
          type="url"
          defaultValue={about?.photoUrl ?? ""}
          placeholder="https://…"
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

export function EditableAbout({ about }: { about: About | null }) {
  const [editing, setEditing] = useState(false);

  return (
    <Section id="about" title="About">
      {editing ? (
        <AboutForm about={about} onClose={() => setEditing(false)} />
      ) : (
        <div className="space-y-3">
          <AboutView about={about} />
          <EditButton
            label={about ? "Edit about" : "Add about"}
            onClick={() => setEditing(true)}
          />
        </div>
      )}
    </Section>
  );
}
