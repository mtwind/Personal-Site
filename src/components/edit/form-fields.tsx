"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

interface FieldProps {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

interface BulletsInputProps {
  /** Every row posts under this name; server reads formData.getAll(). */
  name: string;
  initial: string[];
  maxRows?: number;
}

export function BulletsInput({
  name,
  initial,
  maxRows = 20,
}: BulletsInputProps) {
  // Row identity keys survive removals without re-keying siblings.
  const [rows, setRows] = useState<{ key: number; value: string }[]>(() =>
    (initial.length > 0 ? initial : [""]).map((value, i) => ({
      key: i,
      value,
    })),
  );
  const [nextKey, setNextKey] = useState(initial.length + 1);

  function addRow() {
    setRows((current) => [...current, { key: nextKey, value: "" }]);
    setNextKey((k) => k + 1);
  }

  function removeRow(key: number) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.key} className="flex items-start gap-2">
          <textarea
            name={name}
            defaultValue={row.value}
            rows={2}
            placeholder="Bullet point…"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => removeRow(row.key)}
            aria-label="Remove bullet"
            className="mt-1 rounded p-1 text-zinc-400 hover:text-red-500"
          >
            ✕
          </button>
        </div>
      ))}
      {rows.length < maxRows && (
        <button
          type="button"
          onClick={addRow}
          className="text-xs font-medium text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          + Add bullet
        </button>
      )}
    </div>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

export function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
    >
      Cancel
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

interface EditButtonProps {
  label: string;
  onClick: () => void;
}

export function EditButton({ label, onClick }: EditButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
    >
      {label}
    </button>
  );
}
