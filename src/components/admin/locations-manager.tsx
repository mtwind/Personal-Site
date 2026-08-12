"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import { LocationMap } from "@/components/match/location-map";
import {
  CancelButton,
  Field,
  FormError,
  SubmitButton,
  inputClass,
} from "@/components/edit/form-fields";
import {
  deleteLocationPin,
  saveLocationPin,
  toggleLocationPin,
} from "@/lib/actions/locations";
import type { ActionResult } from "@/lib/actions/validation";
import { loadGoogleMaps } from "@/lib/google-maps";
import {
  PIN_TIERS,
  sortPins,
  tierFor,
  type LocationPin,
} from "@/lib/location-pins";
import type { LocationPinRow } from "@/lib/locations-data";

/** Coordinates while they're being typed — text, not numbers yet. */
interface Coords {
  lat: string;
  lng: string;
}

const EMPTY_COORDS: Coords = { lat: "", lng: "" };

/** Both boxes holding a real number, or null while one doesn't. */
function toPosition(coords: Coords): { lat: number; lng: number } | null {
  const lat = Number(coords.lat);
  const lng = Number(coords.lng);
  if (coords.lat.trim() === "" || coords.lng.trim() === "") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** Five decimals is about a metre — far past what a city pin needs. */
function trim(value: number): string {
  return value.toFixed(5);
}

function toPin(row: LocationPinRow): LocationPin {
  return {
    id: row.id,
    label: row.label,
    note: row.note,
    lat: row.lat,
    lng: row.lng,
    priority: row.priority,
  };
}

/**
 * Editor view for the location map: the same map the page draws, with
 * the pins editable beneath it.
 *
 * The map is the input, not an illustration of one. Clicking it drops a
 * pin — into the form that's open, or into a new one — because the
 * alternative is looking up latitudes by hand, and an editor who has to
 * do that stops keeping the map current.
 */
export function LocationsManager({
  pins,
  mapsApiKey,
}: {
  pins: LocationPinRow[];
  /** Null when no key is configured: coordinates go in by hand. */
  mapsApiKey: string | null;
}) {
  /** "new", a pin's id, or null when no form is open. */
  const [editing, setEditing] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords>(EMPTY_COORDS);

  const ordered = useMemo(() => sortPins(pins), [pins]);
  const preview = useMemo(() => ordered.map(toPin), [ordered]);
  const draft = toPosition(coords);

  const editingPin =
    editing && editing !== "new"
      ? (pins.find((pin) => pin.id === editing) ?? null)
      : null;

  function open(target: string) {
    const pin = target === "new" ? null : pins.find((p) => p.id === target);
    setEditing(target);
    setCoords(
      pin ? { lat: trim(pin.lat), lng: trim(pin.lng) } : EMPTY_COORDS,
    );
  }

  function close() {
    setEditing(null);
    setCoords(EMPTY_COORDS);
  }

  /** A click on the map fills the open form — or starts one. */
  function placeFromMap(lat: number, lng: number) {
    if (!editing) setEditing("new");
    setCoords({ lat: trim(lat), lng: trim(lng) });
  }

  const live = pins.filter((pin) => pin.active);

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-md border border-(--line) bg-(--bg-elev) px-5 py-4">
        <h2 className="font-sans text-[11px] font-semibold tracking-[0.14em] text-(--dim) uppercase">
          How the map reads
        </h2>
        <p className="mt-2 text-[14px] leading-6 text-(--text)">
          Rank is optional and shared: several places can sit at the same
          level, and an unranked pin is grey — wanted, simply not placed
          against the others. Whatever you write in a pin&apos;s note is the
          whole of what a reader gets when they hover it, so write it as a
          sentence rather than a label.
        </p>
        <p className="mt-2 font-sans text-xs text-(--dim)">
          {live.length} of {pins.length} {pins.length === 1 ? "pin" : "pins"}{" "}
          showing on the page. The preview below shows all of them, switched
          off ones included.
        </p>
      </section>

      {mapsApiKey ? (
        <div>
          <LocationMap
            apiKey={mapsApiKey}
            pins={preview}
            draft={draft}
            selectedId={editingPin?.id ?? null}
            onMapClick={placeFromMap}
            className="h-[380px]"
          />
          <p className="mt-2 font-sans text-xs text-(--dim)">
            Click anywhere on the map to set the open pin&apos;s position — or
            to start a new one there.
          </p>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-(--line) px-5 py-4 font-sans text-xs text-(--dim)">
          No <code>GOOGLE_MAPS_API_KEY</code> is set, so there is no map to
          click and no place lookup. Pins still work — enter their latitude and
          longitude by hand — but the page will list them instead of drawing
          them.
        </p>
      )}

      {editing === "new" ? (
        <PinForm
          pin={null}
          coords={coords}
          onCoords={setCoords}
          onClose={close}
          mapsApiKey={mapsApiKey}
        />
      ) : (
        <button
          type="button"
          onClick={() => open("new")}
          className="rounded-md bg-(--accent) px-4 py-1.5 font-sans text-sm font-semibold text-(--bg) transition-opacity duration-200 hover:opacity-85"
        >
          + New pin
        </button>
      )}

      {pins.length === 0 ? (
        <p className="font-sans text-sm text-(--dim) italic">
          No pins yet. Add the place you&apos;d most like to end up.
        </p>
      ) : (
        <ul className="space-y-3">
          {ordered.map((pin) =>
            editing === pin.id ? (
              <li key={pin.id}>
                <PinForm
                  pin={pin}
                  coords={coords}
                  onCoords={setCoords}
                  onClose={close}
                  mapsApiKey={mapsApiKey}
                />
              </li>
            ) : (
              <li key={pin.id}>
                <PinCard pin={pin} onEdit={() => open(pin.id)} />
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function PinCard({
  pin,
  onEdit,
}: {
  pin: LocationPinRow;
  onEdit: () => void;
}) {
  const tier = tierFor(pin.priority);

  return (
    <article
      className={`rounded-md border border-(--line) px-5 py-4 ${
        pin.active ? "bg-(--bg-elev)" : "bg-transparent opacity-70"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span
            aria-hidden
            className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
            style={{ background: tier.color, color: tier.ink }}
          >
            {pin.priority ?? ""}
          </span>
          <div className="min-w-0">
            <h3 className="text-[16px] font-medium text-(--title)">
              {pin.label}
              {pin.active ? null : (
                <span className="ml-2 font-sans text-[11px] text-(--dim)">
                  (off)
                </span>
              )}
            </h3>
            <p className="mt-0.5 font-sans text-[11px] text-(--dim)">
              {pin.priority ? `Rank ${pin.priority} · ${tier.label}` : tier.label}{" "}
              · {trim(pin.lat)}, {trim(pin.lng)}
            </p>
            {pin.note ? (
              <p className="mt-1.5 max-w-[60ch] text-[14px] leading-6 text-(--text)">
                {pin.note}
              </p>
            ) : (
              <p className="mt-1.5 font-sans text-[12.5px] text-(--dim) italic">
                No reason written yet — the hover box will show just the name.
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <ToggleButton id={pin.id} active={pin.active} />
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-(--accent) px-2.5 py-1 font-sans text-xs font-medium text-(--accent) transition-colors duration-200 hover:bg-(--hover-bg)"
          >
            Edit
          </button>
          <DeleteButton id={pin.id} label={pin.label} />
        </div>
      </div>
    </article>
  );
}

function ToggleButton({ id, active }: { id: string; active: boolean }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    toggleLocationPin,
    null,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md border border-(--line) px-2.5 py-1 font-sans text-xs text-(--text) transition-colors duration-200 hover:bg-(--hover-bg)"
      >
        {active ? "Turn off" : "Turn on"}
      </button>
      {state && !state.ok ? (
        <p role="alert" className="mt-1 font-sans text-xs text-(--danger)">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function DeleteButton({ id, label }: { id: string; label: string }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    deleteLocationPin,
    null,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`Delete the ${label} pin?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md border border-(--line) px-2.5 py-1 font-sans text-xs text-(--dim) transition-colors duration-200 hover:border-(--danger) hover:text-(--danger)"
      >
        Delete
      </button>
      {state && !state.ok ? (
        <p role="alert" className="mt-1 font-sans text-xs text-(--danger)">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

interface PinFormProps {
  pin: LocationPinRow | null;
  coords: Coords;
  onCoords: (coords: Coords) => void;
  onClose: () => void;
  mapsApiKey: string | null;
}

function PinForm({
  pin,
  coords,
  onCoords,
  onClose,
  mapsApiKey,
}: PinFormProps) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    saveLocationPin,
    null,
  );
  const [label, setLabel] = useState(pin?.label ?? "");
  /** What the lookup last said — found, failed, or still going. */
  const [lookup, setLookup] = useState<string | null>(null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const fieldId = (name: string) => `pin-${pin?.id ?? "new"}-${name}`;

  /**
   * Turn what's in the name box into coordinates.
   *
   * Restricted to the US because the map is: a bare "Cambridge" should
   * land in Massachusetts here, not in England.
   */
  async function findPlace() {
    const query = label.trim();
    if (!mapsApiKey || query === "") return;

    setLookup("Looking…");
    try {
      const maps = await loadGoogleMaps(mapsApiKey);
      const { results } = await new maps.Geocoder().geocode({
        address: query,
        componentRestrictions: { country: "us" },
      });
      const found = results[0];
      if (!found) {
        setLookup("No match — click the map instead.");
        return;
      }
      const position = found.geometry.location;
      onCoords({ lat: trim(position.lat()), lng: trim(position.lng()) });
      setLookup(found.formatted_address);
    } catch (error: unknown) {
      console.error("place lookup failed:", error);
      setLookup("Lookup failed — click the map instead.");
    }
  }

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-md border border-(--accent) bg-(--bg-elev) px-5 py-5"
    >
      <input type="hidden" name="id" value={pin?.id ?? ""} />

      <Field label="Place" htmlFor={fieldId("label")}>
        <div className="flex gap-2">
          <input
            id={fieldId("label")}
            name="label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="e.g. Mountain View, CA"
            className={inputClass}
          />
          {mapsApiKey ? (
            <button
              type="button"
              onClick={findPlace}
              className="shrink-0 rounded-md border border-(--accent) px-3 py-1 font-sans text-xs font-medium text-(--accent) transition-colors duration-200 hover:bg-(--hover-bg)"
            >
              Find it
            </button>
          ) : null}
        </div>
      </Field>
      {lookup ? (
        <p className="font-sans text-xs text-(--dim)">{lookup}</p>
      ) : null}

      <Field label="Why here" htmlFor={fieldId("note")}>
        <textarea
          id={fieldId("note")}
          name="note"
          rows={3}
          defaultValue={pin?.note ?? ""}
          placeholder="The reason a reader sees when they hover this pin."
          className={inputClass}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Latitude" htmlFor={fieldId("lat")}>
          <input
            id={fieldId("lat")}
            name="lat"
            inputMode="decimal"
            value={coords.lat}
            onChange={(event) =>
              onCoords({ ...coords, lat: event.target.value })
            }
            placeholder="37.42248"
            className={inputClass}
          />
        </Field>

        <Field label="Longitude" htmlFor={fieldId("lng")}>
          <input
            id={fieldId("lng")}
            name="lng"
            inputMode="decimal"
            value={coords.lng}
            onChange={(event) =>
              onCoords({ ...coords, lng: event.target.value })
            }
            placeholder="-122.08421"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Ranking" htmlFor={fieldId("priority")}>
          <select
            id={fieldId("priority")}
            name="priority"
            defaultValue={pin?.priority?.toString() ?? ""}
            className={inputClass}
          >
            <option value="">No ranking — grey pin</option>
            {PIN_TIERS.map((tier) => (
              <option key={tier.priority} value={tier.priority}>
                {tier.priority} — {tier.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Order" htmlFor={fieldId("sortOrder")}>
          <input
            id={fieldId("sortOrder")}
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={pin?.sortOrder ?? 0}
            className={inputClass}
          />
        </Field>
      </div>
      <p className="font-sans text-xs text-(--dim)">
        Ranking colours the pin and sorts the list; order only breaks ties
        between pins ranked the same.
      </p>

      <label className="flex items-center gap-2 font-sans text-sm text-(--text)">
        <input
          type="checkbox"
          name="active"
          defaultChecked={pin?.active ?? true}
        />
        Showing on the map
      </label>

      <FormError message={state && !state.ok ? state.error : null} />

      <div className="flex gap-2">
        <SubmitButton>{pin ? "Save pin" : "Create pin"}</SubmitButton>
        <CancelButton onClick={onClose} />
      </div>
    </form>
  );
}
