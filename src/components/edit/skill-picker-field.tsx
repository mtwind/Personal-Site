"use client";

import { useEffect, useRef, useState } from "react";

import type { SkillSelection } from "@/lib/actions/validation";
import type { CatalogEntry } from "@/lib/skill-catalog";
import { iconUrl, type Skill } from "@/lib/skill-icon";
import { inputClass } from "./form-fields";

/** DB skill rows → picker selections (edit-mode initial state). */
export function toSkillSelections(skills: Skill[]): SkillSelection[] {
  return skills.map((skill) => ({
    name: skill.name,
    slug: skill.iconSlug,
    source: skill.iconSource as SkillSelection["source"],
    color: skill.color,
    variant: skill.iconVariant,
  }));
}

interface SkillPickerFieldProps {
  /** Skills already on the entry (edit mode); empty for new entries. */
  initial: SkillSelection[];
}

function selectionIcon(selection: SkillSelection): string | null {
  return iconUrl(
    selection.source,
    selection.slug,
    selection.color,
    selection.variant,
    null,
  );
}

/**
 * Form-embedded skill picker: chips + catalog autocomplete. Selections
 * live in client state and post as one hidden JSON field named
 * "skills"; the server action syncs the join table on save.
 */
export function SkillPickerField({ initial }: SkillPickerFieldProps) {
  const [selected, setSelected] = useState<SkillSelection[]>(initial);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced catalog lookup; clearing happens in the change handler.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const timer = setTimeout(() => {
      fetch(`/api/skills/search?q=${encodeURIComponent(trimmed)}`)
        .then((response) => response.json())
        .then((data: { results: CatalogEntry[] }) => setResults(data.results))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setResults([]);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function addSelection(selection: SkillSelection) {
    setSelected((current) =>
      current.some(
        (item) => item.name.toLowerCase() === selection.name.toLowerCase(),
      )
        ? current
        : [...current, selection],
    );
    setQuery("");
    setResults([]);
  }

  function removeSelection(name: string) {
    setSelected((current) => current.filter((item) => item.name !== name));
  }

  const showDropdown = query.trim().length >= 2;

  return (
    <div ref={containerRef} className="space-y-2">
      <input type="hidden" name="skills" value={JSON.stringify(selected)} />
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((selection) => {
            const icon = selectionIcon(selection);
            return (
              <span
                key={selection.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-(--line) bg-(--hover-bg) px-2.5 py-1 font-sans text-xs font-medium text-(--text)"
              >
                {icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={icon} alt="" aria-hidden className="h-3.5 w-3.5" />
                ) : null}
                {selection.name}
                <button
                  type="button"
                  onClick={() => removeSelection(selection.name)}
                  aria-label={`Remove ${selection.name}`}
                  className="ml-0.5 text-(--dim) transition-colors duration-200 hover:text-(--danger)"
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div className="relative max-w-sm">
        <input
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            if (value.trim().length < 2) setResults([]);
          }}
          placeholder="Add a skill (React, Python, Figma…)"
          className={inputClass}
        />
        {showDropdown && (
          <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-(--line) bg-(--bg-elev) py-1 font-sans shadow-lg">
            {results.map((entry) => {
              const icon = iconUrl(
                entry.source,
                entry.slug,
                entry.color,
                entry.variant,
                null,
              );
              return (
                <li key={`${entry.source}:${entry.slug}`}>
                  <button
                    type="button"
                    onClick={() =>
                      addSelection({
                        name: entry.name,
                        slug: entry.slug,
                        source: entry.source,
                        color: entry.color,
                        variant: entry.variant,
                      })
                    }
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-(--text) transition-colors duration-150 hover:bg-(--hover-bg)"
                  >
                    {icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={icon} alt="" aria-hidden className="h-4 w-4" />
                    ) : null}
                    {entry.name}
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() =>
                  addSelection({
                    name: query.trim(),
                    slug: null,
                    source: "custom",
                    color: null,
                    variant: null,
                  })
                }
                className="w-full px-3 py-1.5 text-left text-sm text-(--dim) transition-colors duration-150 hover:bg-(--hover-bg)"
              >
                + Add “{query.trim()}” as custom skill
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
