"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export const inputClass =
  "w-full rounded-md border border-(--line) bg-(--bg-elev) px-3 py-1.5 font-sans text-sm text-(--title) placeholder:text-(--dim) focus:border-(--accent) focus:outline-none";

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
        className="block font-sans text-[10.5px] font-semibold tracking-[0.14em] text-(--dim) uppercase"
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
            className="mt-1 rounded p-1 text-(--dim) transition-colors duration-200 hover:text-(--danger)"
          >
            ✕
          </button>
        </div>
      ))}
      {rows.length < maxRows && (
        <button
          type="button"
          onClick={addRow}
          className="font-sans text-xs font-medium text-(--accent) underline-offset-2 hover:underline"
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
      className="rounded-md bg-(--accent) px-4 py-1.5 font-sans text-sm font-semibold text-(--bg) transition-opacity duration-200 hover:opacity-85 disabled:opacity-50"
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
      className="rounded-md border border-(--line) px-4 py-1.5 font-sans text-sm text-(--text) transition-colors duration-200 hover:bg-(--hover-bg)"
    >
      Cancel
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="font-sans text-sm text-(--danger)">
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
      className="rounded-md border border-(--accent) px-2.5 py-1 font-sans text-xs font-medium text-(--accent) transition-colors duration-200 hover:bg-(--hover-bg)"
    >
      {label}
    </button>
  );
}
