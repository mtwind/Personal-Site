"use client";

import { createContext, useContext, useState } from "react";

export const EDIT_MODE_COOKIE = "edit-mode";

interface EditModeState {
  editMode: boolean;
  setEditMode: (value: boolean) => void;
}

const EditModeContext = createContext<EditModeState | null>(null);

interface EditModeProviderProps {
  /** Server-read cookie value, so SSR and hydration agree. */
  initial: boolean;
  children: React.ReactNode;
}

export function EditModeProvider({ initial, children }: EditModeProviderProps) {
  const [editMode, setEditModeState] = useState(initial);

  function setEditMode(value: boolean) {
    setEditModeState(value);
    // Persisted client-side so the server renders the right view next load.
    document.cookie = `${EDIT_MODE_COOKIE}=${value ? "on" : "off"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <EditModeContext.Provider value={{ editMode, setEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode(): EditModeState {
  const context = useContext(EditModeContext);
  if (!context) {
    throw new Error("useEditMode must be used inside EditModeProvider");
  }
  return context;
}

/** Header switch for editors: flips between public view and edit mode. */
export function EditModeToggle() {
  const { editMode, setEditMode } = useEditMode();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={editMode}
      onClick={() => setEditMode(!editMode)}
      className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400"
    >
      Edit mode
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${
          editMode ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            editMode ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
