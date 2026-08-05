"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { addSkill, removeSkill } from "@/lib/actions/skills";
import { iconUrl, skillIconUrl, type Skill } from "@/lib/skill-icon";
import type { CatalogEntry } from "@/lib/skill-catalog";
import { FormError, inputClass } from "./form-fields";

interface SkillsEditorProps {
  ownerType: "experience" | "project";
  ownerId: string;
  skills: Skill[];
}

function SkillChip({
  skill,
  onRemove,
  disabled,
}: {
  skill: Skill;
  onRemove: () => void;
  disabled: boolean;
}) {
  const icon = skillIconUrl(skill);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" aria-hidden className="h-3.5 w-3.5" />
      ) : null}
      {skill.name}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${skill.name}`}
        className="ml-0.5 text-zinc-400 hover:text-red-500 disabled:opacity-40"
      >
        ✕
      </button>
    </span>
  );
}

/** Editor-only: skill chips + catalog autocomplete for one entry. */
export function SkillsEditor({ ownerType, ownerId, skills }: SkillsEditorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogEntry[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced catalog lookup (clearing happens in the change handler —
  // the react-hooks/set-state-in-effect rule bans sync setState here).
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

  // Close the dropdown on outside click.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setResults([]);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function runAdd(input: Parameters<typeof addSkill>[0]) {
    setQuery("");
    setResults([]);
    startTransition(async () => {
      const result = await addSkill(input);
      setError(result.ok ? null : result.error);
    });
  }

  function selectEntry(entry: CatalogEntry) {
    runAdd({
      ownerType,
      ownerId,
      name: entry.name,
      slug: entry.slug,
      source: entry.source,
      color: entry.color,
      variant: entry.variant,
    });
  }

  function addCustom() {
    const name = query.trim();
    if (!name) return;
    runAdd({
      ownerType,
      ownerId,
      name,
      slug: null,
      source: "custom",
      color: null,
      variant: null,
    });
  }

  function handleRemove(skillId: string) {
    startTransition(async () => {
      const result = await removeSkill({ ownerType, ownerId, skillId });
      setError(result.ok ? null : result.error);
    });
  }

  const showDropdown = query.trim().length >= 2;

  return (
    <div ref={containerRef} className="mt-2 space-y-2">
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <SkillChip
              key={skill.id}
              skill={skill}
              disabled={isPending}
              onRemove={() => handleRemove(skill.id)}
            />
          ))}
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
          <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
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
                    onClick={() => selectEntry(entry)}
                    disabled={isPending}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
                onClick={addCustom}
                disabled={isPending}
                className="w-full px-3 py-1.5 text-left text-sm text-zinc-500 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                + Add “{query.trim()}” as custom skill
              </button>
            </li>
          </ul>
        )}
      </div>
      <FormError message={error} />
    </div>
  );
}
