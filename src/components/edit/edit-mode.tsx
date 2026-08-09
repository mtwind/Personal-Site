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
      className="flex items-center gap-2 font-sans text-[11px] font-medium tracking-[0.14em] text-(--dim) uppercase"
    >
      Edit
      <span
        className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${
          editMode ? "bg-(--accent)" : "bg-(--line)"
        }`}
      >
        {/* left-0 anchors the static position: buttons center inline
            content, which would otherwise offset the knob mid-track. */}
        <span
          className={`absolute top-0.5 left-0 h-4 w-4 rounded-full bg-(--bg-elev) shadow transition-transform duration-200 ${
            editMode ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
