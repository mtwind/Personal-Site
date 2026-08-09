"use client";

import { useActionState, useEffect, useState } from "react";

import { saveContact } from "@/lib/actions/profile";
import type { ActionResult } from "@/lib/actions/validation";
import type { Contact } from "@/lib/profile-data";
import { MAX_PDF_LABEL, isPdfTooLarge } from "@/lib/upload-limits";
import { ContactView } from "@/components/profile/contact-section";
import { Section } from "@/components/profile/section";
import {
  CancelButton,
  EditButton,
  Field,
  FormError,
  SubmitButton,
  inputClass,
} from "./form-fields";

function ResumeInput({ currentUrl }: { currentUrl: string | null }) {
  const [selectedName, setSelectedName] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {currentUrl && !selectedName ? (
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block font-sans text-xs text-(--accent) underline-offset-2 hover:underline"
        >
          View current résumé (PDF) ↗
        </a>
      ) : null}
      <input
        type="file"
        name="resume"
        accept="application/pdf"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (!file) {
            setSelectedName(null);
            return;
          }
          if (file.type !== "application/pdf") {
            window.alert("Résumé must be a PDF file.");
            event.currentTarget.value = "";
            setSelectedName(null);
            return;
          }
          if (isPdfTooLarge(file)) {
            window.alert(`PDF is too large (max ${MAX_PDF_LABEL}).`);
            event.currentTarget.value = "";
            setSelectedName(null);
            return;
          }
          setSelectedName(file.name);
        }}
        className="block font-sans text-sm text-(--dim) file:mr-3 file:rounded-md file:border file:border-(--line) file:bg-(--bg-elev) file:px-3 file:py-1.5 file:font-sans file:text-sm file:font-medium file:text-(--text) hover:file:bg-(--hover-bg)"
      />
      {selectedName ? (
        <p className="font-sans text-xs text-(--dim)">
          Will upload on save: {selectedName}
        </p>
      ) : null}
      {currentUrl && !selectedName ? (
        <label className="flex items-center gap-2 font-sans text-xs text-(--dim)">
          <input type="checkbox" name="removeResume" className="h-3.5 w-3.5" />
          Remove current résumé
        </label>
      ) : null}
    </div>
  );
}

function ContactForm({
  contact,
  onClose,
}: {
  contact: Contact | null;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    saveContact,
    null,
  );

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="LinkedIn URL" htmlFor="contact-linkedin">
        <input
          id="contact-linkedin"
          name="linkedinUrl"
          type="url"
          defaultValue={contact?.linkedinUrl ?? ""}
          placeholder="https://linkedin.com/in/…"
          className={inputClass}
        />
      </Field>
      <Field label="GitHub URL" htmlFor="contact-github">
        <input
          id="contact-github"
          name="githubUrl"
          type="url"
          defaultValue={contact?.githubUrl ?? ""}
          placeholder="https://github.com/…"
          className={inputClass}
        />
      </Field>
      <Field label="Email" htmlFor="contact-email">
        <input
          id="contact-email"
          name="email"
          type="email"
          defaultValue={contact?.email ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Phone" htmlFor="contact-phone">
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          defaultValue={contact?.phone ?? ""}
          className={inputClass}
        />
      </Field>
      <label className="flex items-center gap-2 font-sans text-sm text-(--text)">
        <input
          type="checkbox"
          name="showPhone"
          defaultChecked={contact?.showPhone ?? true}
          className="h-4 w-4 rounded border-(--line)"
        />
        Show phone number publicly
      </label>
      <Field label="Résumé (PDF)" htmlFor="contact-resume">
        <ResumeInput currentUrl={contact?.resumeUrl ?? null} />
      </Field>
      <FormError message={state && !state.ok ? state.error : null} />
      <div className="flex gap-2">
        <SubmitButton>Save</SubmitButton>
        <CancelButton onClick={onClose} />
      </div>
    </form>
  );
}

export function EditableContact({ contact }: { contact: Contact | null }) {
  const [editing, setEditing] = useState(false);

  return (
    <Section id="contact" title="Contact">
      {editing ? (
        <ContactForm contact={contact} onClose={() => setEditing(false)} />
      ) : (
        <div className="space-y-3">
          <ContactView contact={contact} />
          <EditButton
            label={contact ? "Edit contact" : "Add contact"}
            onClick={() => setEditing(true)}
          />
        </div>
      )}
    </Section>
  );
}
