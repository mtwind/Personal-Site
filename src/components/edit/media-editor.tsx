"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import { addMediaLink, deleteMedia, uploadMediaImage } from "@/lib/actions/media";
import type { ActionResult } from "@/lib/actions/validation";
import type { MediaItem } from "@/lib/profile-data";
import {
  CancelButton,
  EditButton,
  Field,
  FormError,
  SubmitButton,
  inputClass,
} from "./form-fields";

interface MediaEditorProps {
  ownerType: "experience" | "project";
  ownerId: string;
  items: MediaItem[];
}

function UploadImageButton() {
  const { pending } = useFormStatus();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        name="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(event) => {
          if (event.currentTarget.files?.length) {
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
      >
        {pending ? "Uploading…" : "↑ Upload image"}
      </button>
    </>
  );
}

function MediaItemChip({ item }: { item: MediaItem }) {
  const [isDeleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteMedia(item.id);
      setError(result.ok ? null : result.error);
    });
  }

  return (
    <div className="relative inline-flex">
      {item.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt={item.caption ?? ""}
          className={`h-16 rounded-md border border-zinc-200 object-cover dark:border-zinc-700 ${isDeleting ? "opacity-40" : ""}`}
        />
      ) : (
        <span
          className={`inline-flex max-w-48 items-center truncate rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400 ${isDeleting ? "opacity-40" : ""}`}
        >
          {item.caption ?? item.url}
        </span>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label="Remove media"
        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[10px] leading-none text-white hover:bg-red-600 dark:bg-zinc-300 dark:text-zinc-900 dark:hover:bg-red-400"
      >
        ✕
      </button>
      <FormError message={error} />
    </div>
  );
}

interface AddLinkFormProps {
  ownerType: "experience" | "project";
  ownerId: string;
  onClose: () => void;
}

function AddLinkForm({ ownerType, ownerId, onClose }: AddLinkFormProps) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    addMediaLink,
    null,
  );

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="mt-2 max-w-md space-y-3">
      <input type="hidden" name="ownerType" value={ownerType} />
      <input type="hidden" name="ownerId" value={ownerId} />
      <Field label="Link URL" htmlFor={`media-url-${ownerId}`}>
        <input
          id={`media-url-${ownerId}`}
          name="url"
          type="url"
          required
          placeholder="https://…"
          className={inputClass}
        />
      </Field>
      <Field label="Caption (optional)" htmlFor={`media-caption-${ownerId}`}>
        <input
          id={`media-caption-${ownerId}`}
          name="caption"
          className={inputClass}
        />
      </Field>
      <FormError message={state && !state.ok ? state.error : null} />
      <div className="flex gap-2">
        <SubmitButton>Add link</SubmitButton>
        <CancelButton onClick={onClose} />
      </div>
    </form>
  );
}

/** Editor-only media strip: existing items + upload/link controls. */
export function MediaEditor({ ownerType, ownerId, items }: MediaEditorProps) {
  const [addingLink, setAddingLink] = useState(false);
  const [uploadState, uploadAction] = useActionState<
    ActionResult | null,
    FormData
  >(uploadMediaImage, null);

  return (
    <div className="mt-3 space-y-2">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {items.map((item) => (
            <MediaItemChip key={item.id} item={item} />
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <form action={uploadAction}>
          <input type="hidden" name="ownerType" value={ownerType} />
          <input type="hidden" name="ownerId" value={ownerId} />
          <UploadImageButton />
        </form>
        {!addingLink && (
          <EditButton label="+ Add link" onClick={() => setAddingLink(true)} />
        )}
      </div>
      <FormError
        message={uploadState && !uploadState.ok ? uploadState.error : null}
      />
      {addingLink && (
        <AddLinkForm
          ownerType={ownerType}
          ownerId={ownerId}
          onClose={() => setAddingLink(false)}
        />
      )}
    </div>
  );
}
