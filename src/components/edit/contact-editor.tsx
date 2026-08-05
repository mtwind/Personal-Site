"use client";

import { useActionState, useEffect, useState } from "react";

import { saveContact } from "@/lib/actions/profile";
import type { ActionResult } from "@/lib/actions/validation";
import type { Contact } from "@/lib/profile-data";
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
      <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <input
          type="checkbox"
          name="showPhone"
          defaultChecked={contact?.showPhone ?? true}
          className="h-4 w-4 rounded border-zinc-300"
        />
        Show phone number publicly
      </label>
      <Field label="Resume URL" htmlFor="contact-resume">
        <input
          id="contact-resume"
          name="resumeUrl"
          type="url"
          defaultValue={contact?.resumeUrl ?? ""}
          placeholder="https://… (upload coming soon)"
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
