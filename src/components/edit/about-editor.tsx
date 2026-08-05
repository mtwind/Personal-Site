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

function PhotoInput({ currentUrl }: { currentUrl: string | null }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Object URLs leak without revocation on replacement/unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const shownUrl = previewUrl ?? currentUrl;

  return (
    <div className="flex items-center gap-4">
      {shownUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shownUrl}
          alt="Profile photo preview"
          className="h-16 w-16 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
        />
      ) : null}
      <div className="space-y-2">
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            setPreviewUrl(file ? URL.createObjectURL(file) : null);
          }}
          className="block text-sm text-zinc-600 file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-50 dark:text-zinc-400 dark:file:border-zinc-700 dark:file:bg-zinc-900 dark:file:text-zinc-300"
        />
        {currentUrl && !previewUrl ? (
          <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <input type="checkbox" name="removePhoto" className="h-3.5 w-3.5" />
            Remove current photo
          </label>
        ) : null}
      </div>
    </div>
  );
}

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
      <Field label="Photo" htmlFor="about-photo">
        <PhotoInput currentUrl={about?.photoUrl ?? null} />
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
