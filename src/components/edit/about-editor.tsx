"use client";

import { useActionState, useEffect, useState } from "react";

import { saveAbout } from "@/lib/actions/profile";
import type { ActionResult } from "@/lib/actions/validation";
import type { About } from "@/lib/profile-data";
import { MAX_IMAGE_LABEL, isImageTooLarge } from "@/lib/upload-limits";
import { AboutView } from "@/components/profile/about-section";
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
          className="h-16 w-16 rounded-full border border-(--line) object-cover"
        />
      ) : null}
      <div className="space-y-2">
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file && isImageTooLarge(file)) {
              window.alert(`Image is too large (max ${MAX_IMAGE_LABEL}).`);
              event.currentTarget.value = "";
              setPreviewUrl(null);
              return;
            }
            setPreviewUrl(file ? URL.createObjectURL(file) : null);
          }}
          className="block font-sans text-sm text-(--dim) file:mr-3 file:rounded-md file:border file:border-(--line) file:bg-(--bg-elev) file:px-3 file:py-1.5 file:font-sans file:text-sm file:font-medium file:text-(--text) hover:file:bg-(--hover-bg)"
        />
        {currentUrl && !previewUrl ? (
          <label className="flex items-center gap-2 font-sans text-xs text-(--dim)">
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
    <section id="about" className="scroll-mt-24 pt-12 pb-4">
      {editing ? (
        <AboutForm about={about} onClose={() => setEditing(false)} />
      ) : (
        <div className="space-y-4">
          <AboutView about={about} />
          <div className="text-center">
            <EditButton
              label={about ? "Edit about" : "Add about"}
              onClick={() => setEditing(true)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
