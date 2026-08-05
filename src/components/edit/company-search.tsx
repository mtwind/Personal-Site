"use client";

import { useEffect, useRef, useState } from "react";

import type { CompanyResult } from "@/app/api/companies/search/route";
import { Field, inputClass } from "./form-fields";

interface CompanySearchProps {
  idSuffix: string;
  initialName: string;
  initialDomain: string | null;
  initialLogoUrl: string | null;
}

/**
 * LinkedIn-style company picker for the experience form.
 *
 * Posts three fields: companyName (visible), companyDomain (visible,
 * editable fallback), companyLogoUrl (hidden). Selecting a suggestion
 * fills all three; manual domain entry gets a favicon-based logo
 * server-side. Works without the search API configured.
 */
export function CompanySearch({
  idSuffix,
  initialName,
  initialDomain,
  initialLogoUrl,
}: CompanySearchProps) {
  const [name, setName] = useState(initialName);
  const [domain, setDomain] = useState(initialDomain ?? "");
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? "");
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [status, setStatus] = useState<
    "idle" | "ready" | "unconfigured" | "error"
  >("idle");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextSearch = useRef(false);

  // Debounced search; result-clearing lives in the change handler (the
  // react-hooks/set-state-in-effect rule bans sync setState here).
  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed === initialName) return;
    const timer = setTimeout(() => {
      fetch(`/api/companies/search?q=${encodeURIComponent(trimmed)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then(
          (data: { configured: boolean; results: CompanyResult[] } | null) => {
            if (!data) {
              setStatus("error");
              setResults([]);
              return;
            }
            setStatus(data.configured ? "ready" : "unconfigured");
            setResults(data.results);
            setOpen(true);
          },
        )
        .catch(() => {
          setStatus("error");
          setResults([]);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [name, initialName]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function selectCompany(result: CompanyResult) {
    skipNextSearch.current = true;
    setName(result.name);
    setDomain(result.domain);
    setLogoUrl(result.logoUrl ?? "");
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={containerRef} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="companyLogoUrl" value={logoUrl} />
      <div className="relative">
        <Field label="Company" htmlFor={`exp-company-${idSuffix}`}>
          <input
            id={`exp-company-${idSuffix}`}
            name="companyName"
            value={name}
            onChange={(event) => {
              const value = event.target.value;
              setName(value);
              if (value.trim().length < 2) {
                setResults([]);
                setOpen(false);
              }
            }}
            required
            autoComplete="off"
            placeholder="Search companies…"
            className={inputClass}
          />
        </Field>
        {open && results.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-(--line) bg-(--bg-elev) py-1 font-sans shadow-lg">
            {results.map((result) => (
              <li key={result.domain}>
                <button
                  type="button"
                  onClick={() => selectCompany(result)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-(--text) transition-colors duration-150 hover:bg-(--hover-bg)"
                >
                  {result.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.logoUrl}
                      alt=""
                      aria-hidden
                      className="h-5 w-5 rounded object-contain"
                    />
                  ) : (
                    <span className="h-5 w-5" />
                  )}
                  <span className="truncate">{result.name}</span>
                  <span className="ml-auto truncate text-xs text-(--dim)">
                    {result.domain}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {status === "unconfigured" && (
          <p className="mt-1 font-sans text-xs text-(--dim)">
            Company autocomplete is off — set BRANDFETCH_CLIENT_ID in
            .env.local and restart the dev server. Manual entry works fine.
          </p>
        )}
        {status === "error" && (
          <p className="mt-1 font-sans text-xs text-(--accent)">
            Company search is unavailable right now — enter the name and
            domain manually.
          </p>
        )}
      </div>
      <Field
        label="Company domain (optional, drives logo)"
        htmlFor={`exp-domain-${idSuffix}`}
      >
        <input
          id={`exp-domain-${idSuffix}`}
          name="companyDomain"
          value={domain}
          onChange={(event) => {
            setDomain(event.target.value);
            // Manual domain edits invalidate a previously selected logo.
            setLogoUrl("");
          }}
          autoComplete="off"
          placeholder="acme.com"
          className={inputClass}
        />
      </Field>
    </div>
  );
}
