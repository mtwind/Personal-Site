"use client";

import { useMemo, useState } from "react";

import {
  PIN_TIERS,
  sortPins,
  tierFor,
  UNRANKED_TIER,
  type LocationPin,
} from "@/lib/location-pins";
import { LocationMap } from "./location-map";
import { CARD } from "./match-shell";

interface LocationPreferencesProps {
  pins: LocationPin[];
  /** Null when no Maps key is configured: the list stands on its own. */
  mapsApiKey: string | null;
}

/**
 * The location section of the team-matching home page: a map of the US
 * with a pin on every place worth being, and the reason behind each one.
 *
 * The list under the map is not a fallback that happens to be visible —
 * it is how the section is read without a mouse, on a phone, and by
 * anything that doesn't run scripts. Selecting a row is the same act as
 * hovering its pin, so both halves stay one control.
 */
export function LocationPreferences({
  pins,
  mapsApiKey,
}: LocationPreferencesProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Stable identity: the map re-syncs its markers whenever this changes.
  const ordered = useMemo(() => sortPins(pins), [pins]);

  const tiers = useMemo(() => {
    const used = [...PIN_TIERS, UNRANKED_TIER].filter((tier) =>
      ordered.some((pin) => tierFor(pin.priority) === tier),
    );
    return used;
  }, [ordered]);

  if (ordered.length === 0) return null;

  return (
    <section className={`${CARD} mt-8`} aria-labelledby="locations-heading">
      <h2
        id="locations-heading"
        className="text-lg font-medium text-[#202124]"
      >
        Where I&apos;d like to be
      </h2>
      <p className="mt-1 text-sm text-[#5f6368]">
        Every pin is somewhere I&apos;d be glad to be placed. Hover one — or
        pick it from the list — for why. The colour is how strongly, and two
        places can sit at the same level.
      </p>

      {mapsApiKey ? (
        <div className="mt-4">
          <LocationMap
            apiKey={mapsApiKey}
            pins={ordered}
            selectedId={selectedId}
            onSelect={setSelectedId}
            className="h-[340px] sm:h-[440px]"
          />
        </div>
      ) : null}

      {tiers.length > 1 ? (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {tiers.map((tier) => (
            <li
              key={tier.label}
              className="flex items-center gap-1.5 text-[12px] text-[#5f6368]"
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: tier.color }}
              />
              {tier.priority ? `${tier.priority} · ${tier.label}` : tier.label}
            </li>
          ))}
        </ul>
      ) : null}

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {ordered.map((pin) => {
          const tier = tierFor(pin.priority);
          const selected = pin.id === selectedId;

          return (
            <li key={pin.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedId(selected ? null : pin.id)}
                onMouseEnter={() => setSelectedId(pin.id)}
                className={`w-full cursor-pointer rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                  selected
                    ? "border-[#1a73e8] bg-[#f1f6fe]"
                    : "border-[#dadce0] bg-white hover:bg-[#f8f9fa]"
                }`}
              >
                <span className="flex items-center gap-2 text-[14px] font-medium text-[#202124]">
                  <span
                    aria-hidden
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                    style={{ background: tier.color, color: tier.ink }}
                  >
                    {pin.priority ?? ""}
                  </span>
                  {pin.label}
                </span>
                {pin.note ? (
                  <span className="mt-1 block text-[13px] leading-5 text-[#5f6368]">
                    {pin.note}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
