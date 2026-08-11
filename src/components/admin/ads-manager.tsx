"use client";

import { useActionState, useEffect, useState } from "react";

import {
  CancelButton,
  Field,
  FormError,
  SubmitButton,
  inputClass,
} from "@/components/edit/form-fields";
import { clearAdStats, deleteAd, saveAd, toggleAd } from "@/lib/actions/ads";
import type { ActionResult } from "@/lib/actions/validation";
import { adIconUrl, AD_SLOTS, type AdSlot } from "@/lib/ad-targeting";
import type { AdStats, AdWithStats } from "@/lib/ads";

interface AdsManagerProps {
  ads: AdWithStats[];
  today: AdStats;
  recent: { id: string; brand: string; kind: string; slot: string; at: Date }[];
}

/** What each placement is, in the words of someone choosing between them. */
const SLOT_HELP: Record<AdSlot, string> = {
  sponsored: "Above the search results, as a text ad.",
  rail: "The right-hand column, on wide screens only.",
  banner: "A strip inside section and entry pages.",
};

const SLOT_LABEL: Record<AdSlot, string> = {
  sponsored: "Search results",
  rail: "Side rail",
  banner: "Page banner",
};

/** Clicks per impression, as the percentage an ad report would show. */
function ctr(stats: AdStats): string {
  if (stats.impressions === 0) return "—";
  return `${((stats.clicks / stats.impressions) * 100).toFixed(1)}%`;
}

export function AdsManager({ ads, today, recent }: AdsManagerProps) {
  const [drafting, setDrafting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const live = ads.filter((ad) => ad.active);
  const totals = ads.reduce(
    (sum, ad) => ({
      impressions: sum.impressions + ad.stats.impressions,
      clicks: sum.clicks + ad.stats.clicks,
    }),
    { impressions: 0, clicks: 0 },
  );

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-md border border-(--line) bg-(--bg-elev) px-5 py-4">
        <h2 className="font-sans text-[11px] font-semibold tracking-[0.14em] text-(--dim) uppercase">
          Where these run
        </h2>
        <p className="mt-2 text-[14px] leading-6 text-(--text)">
          Ads on the team-matching page are things you actually like, dressed as
          sponsored placements because the page is pretending to be Google. An
          ad is picked for a view by matching its keywords against the search,
          the section, or the entry being read; where nothing matches, the list
          rotates.
        </p>
        <p className="mt-2 font-sans text-xs text-(--dim)">
          {live.length} of {ads.length} {ads.length === 1 ? "ad" : "ads"} live ·{" "}
          {totals.impressions.toLocaleString()} impressions and{" "}
          {totals.clicks.toLocaleString()} clicks all time ·{" "}
          {today.impressions.toLocaleString()} and{" "}
          {today.clicks.toLocaleString()} in the last 24 hours. Your own visits
          aren&apos;t counted.
        </p>
      </section>

      {drafting ? (
        <AdForm ad={null} onClose={() => setDrafting(false)} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDrafting(true)}
            className="rounded-md bg-(--accent) px-4 py-1.5 font-sans text-sm font-semibold text-(--bg) transition-opacity duration-200 hover:opacity-85"
          >
            + New ad
          </button>
          {totals.impressions + totals.clicks > 0 ? (
            <ClearStatsButton />
          ) : null}
        </div>
      )}

      {ads.length === 0 ? (
        <p className="font-sans text-sm text-(--dim) italic">
          No ads yet. Add something you&apos;d actually click on.
        </p>
      ) : (
        <ul className="space-y-3">
          {ads.map((ad) =>
            editingId === ad.id ? (
              <li key={ad.id}>
                <AdForm ad={ad} onClose={() => setEditingId(null)} />
              </li>
            ) : (
              <li key={ad.id}>
                <AdCard ad={ad} onEdit={() => setEditingId(ad.id)} />
              </li>
            ),
          )}
        </ul>
      )}

      {recent.length > 0 ? <RecentEvents recent={recent} /> : null}
    </div>
  );
}

function AdCard({ ad, onEdit }: { ad: AdWithStats; onEdit: () => void }) {
  const logo = adIconUrl(ad);

  return (
    <article
      className={`rounded-md border px-5 py-4 ${
        ad.active
          ? "border-(--line) bg-(--bg-elev)"
          : "border-(--line) bg-transparent opacity-70"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              aria-hidden
              className="mt-0.5 h-6 w-6 shrink-0 object-contain"
            />
          ) : (
            <span
              aria-hidden
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-white"
              style={{ background: ad.color ?? "#5f6368" }}
            >
              {ad.brand.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-[16px] font-medium text-(--title)">
              {ad.brand}
              {ad.active ? null : (
                <span className="ml-2 font-sans text-[11px] text-(--dim)">
                  (off)
                </span>
              )}
            </h3>
            <p className="mt-0.5 text-[14px] leading-6 text-(--text)">
              {ad.headline}
            </p>
            {ad.description ? (
              <p className="mt-0.5 font-sans text-[12.5px] text-(--dim)">
                {ad.description}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2 font-sans text-[11px]">
              {(ad.slots as AdSlot[]).map((slot) => (
                <span
                  key={slot}
                  className="rounded-full border border-(--accent) px-2 py-0.5 text-(--accent)"
                >
                  {SLOT_LABEL[slot] ?? slot}
                </span>
              ))}
              {ad.keywords.map((keyword) => (
                <span key={keyword} className="text-(--dim)">
                  #{keyword}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="font-sans text-[11px] text-(--dim)">
            {ad.stats.impressions.toLocaleString()} seen ·{" "}
            {ad.stats.clicks.toLocaleString()} clicked · {ctr(ad.stats)}
          </p>
          <div className="flex gap-2">
            <ToggleButton id={ad.id} active={ad.active} />
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md border border-(--accent) px-2.5 py-1 font-sans text-xs font-medium text-(--accent) transition-colors duration-200 hover:bg-(--hover-bg)"
            >
              Edit
            </button>
            <DeleteButton id={ad.id} brand={ad.brand} />
          </div>
        </div>
      </div>
    </article>
  );
}

function ToggleButton({ id, active }: { id: string; active: boolean }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    toggleAd,
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

function DeleteButton({ id, brand }: { id: string; brand: string }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    deleteAd,
    null,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete the ${brand} ad? Its impressions and clicks go with it.`,
          )
        ) {
          event.preventDefault();
        }
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

function ClearStatsButton() {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    clearAdStats,
    null,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Clear every impression and click? The ads themselves stay.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="confirm" value="clear" />
      <button
        type="submit"
        className="rounded-md border border-(--line) px-4 py-1.5 font-sans text-sm text-(--dim) transition-colors duration-200 hover:border-(--danger) hover:text-(--danger)"
      >
        Clear stats
      </button>
      {state && !state.ok ? (
        <p role="alert" className="mt-1 font-sans text-xs text-(--danger)">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function RecentEvents({ recent }: { recent: AdsManagerProps["recent"] }) {
  return (
    <section className="rounded-md border border-(--line) px-5 py-4">
      <h2 className="font-sans text-[11px] font-semibold tracking-[0.14em] text-(--dim) uppercase">
        Latest activity
      </h2>
      <ul className="mt-3 space-y-1.5 font-sans text-[12.5px] text-(--dim)">
        {recent.map((event) => (
          <li key={event.id} className="flex flex-wrap gap-x-2">
            <span className={event.kind === "click" ? "text-(--accent)" : ""}>
              {event.kind === "click" ? "Clicked" : "Seen"}
            </span>
            <span className="text-(--text)">{event.brand}</span>
            <span>· {SLOT_LABEL[event.slot as AdSlot] ?? event.slot}</span>
            <span>· {new Date(event.at).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AdForm({
  ad,
  onClose,
}: {
  ad: AdWithStats | null;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    saveAd,
    null,
  );

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const fieldId = (name: string) => `ad-${ad?.id ?? "new"}-${name}`;
  const slots = (ad?.slots ?? ["sponsored", "rail", "banner"]) as AdSlot[];

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-md border border-(--accent) bg-(--bg-elev) px-5 py-5"
    >
      <input type="hidden" name="id" value={ad?.id ?? ""} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Brand" htmlFor={fieldId("brand")}>
          <input
            id={fieldId("brand")}
            name="brand"
            defaultValue={ad?.brand ?? ""}
            placeholder="e.g. Burton"
            className={inputClass}
          />
        </Field>

        <Field label="Display URL" htmlFor={fieldId("displayUrl")}>
          <input
            id={fieldId("displayUrl")}
            name="displayUrl"
            defaultValue={ad?.displayUrl ?? ""}
            placeholder="www.burton.com"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Headline" htmlFor={fieldId("headline")}>
        <input
          id={fieldId("headline")}
          name="headline"
          defaultValue={ad?.headline ?? ""}
          placeholder="The blue link line"
          className={inputClass}
        />
      </Field>

      <Field label="Description" htmlFor={fieldId("description")}>
        <textarea
          id={fieldId("description")}
          name="description"
          rows={2}
          defaultValue={ad?.description ?? ""}
          placeholder="One line under the headline."
          className={inputClass}
        />
      </Field>

      <Field label="Link" htmlFor={fieldId("targetUrl")}>
        <input
          id={fieldId("targetUrl")}
          name="targetUrl"
          type="url"
          defaultValue={ad?.targetUrl ?? ""}
          placeholder="https://www.burton.com/"
          className={inputClass}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Icon slug" htmlFor={fieldId("iconSlug")}>
          <input
            id={fieldId("iconSlug")}
            name="iconSlug"
            defaultValue={ad?.iconSlug ?? ""}
            placeholder="burton"
            className={inputClass}
          />
        </Field>

        <Field label="Brand colour" htmlFor={fieldId("color")}>
          <input
            id={fieldId("color")}
            name="color"
            defaultValue={ad?.color ?? ""}
            placeholder="#FC4C02"
            className={inputClass}
          />
        </Field>

        <Field label="Order" htmlFor={fieldId("sortOrder")}>
          <input
            id={fieldId("sortOrder")}
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={ad?.sortOrder ?? 0}
            className={inputClass}
          />
        </Field>
      </div>
      <p className="font-sans text-xs text-(--dim)">
        The slug is a{" "}
        <a
          href="https://simpleicons.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-(--accent) underline-offset-2 hover:underline"
        >
          Simple Icons
        </a>{" "}
        name. A brand it doesn&apos;t carry can point at its own image below, or
        leave both empty for a lettered tile in the brand colour.
      </p>

      <Field label="Custom logo URL" htmlFor={fieldId("iconUrl")}>
        <input
          id={fieldId("iconUrl")}
          name="iconUrl"
          defaultValue={ad?.iconUrl ?? ""}
          placeholder="Optional — overrides the slug"
          className={inputClass}
        />
      </Field>

      <Field label="Keywords" htmlFor={fieldId("keywords")}>
        <input
          id={fieldId("keywords")}
          name="keywords"
          defaultValue={ad?.keywords.join(", ") ?? ""}
          placeholder="ski, snowboard, winter, mountain"
          className={inputClass}
        />
      </Field>
      <p className="font-sans text-xs text-(--dim)">
        Comma separated. A search, section or entry matching one of these wins
        the ad the slot; with no match anywhere, ads simply rotate.
      </p>

      <fieldset>
        <legend className="block font-sans text-[10.5px] font-semibold tracking-[0.14em] text-(--dim) uppercase">
          Placements
        </legend>
        <div className="mt-2 space-y-1.5">
          {AD_SLOTS.map((slot) => (
            <label
              key={slot}
              className="flex items-start gap-2 font-sans text-sm text-(--text)"
            >
              <input
                type="checkbox"
                name="slots"
                value={slot}
                defaultChecked={slots.includes(slot)}
                className="mt-1"
              />
              <span>
                {SLOT_LABEL[slot]}
                <span className="block text-xs text-(--dim)">
                  {SLOT_HELP[slot]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 font-sans text-sm text-(--text)">
        <input
          type="checkbox"
          name="active"
          defaultChecked={ad?.active ?? true}
        />
        Live on the page
      </label>

      <FormError message={state && !state.ok ? state.error : null} />

      <div className="flex gap-2">
        <SubmitButton>{ad ? "Save ad" : "Create ad"}</SubmitButton>
        <CancelButton onClick={onClose} />
      </div>
    </form>
  );
}
