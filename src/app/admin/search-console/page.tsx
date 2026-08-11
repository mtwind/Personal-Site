import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { adminReturn } from "@/lib/admin-return";
import { getAuthState } from "@/lib/auth";
import {
  getSearchConsoleData,
  type QueryCount,
} from "@/lib/search-console-data";

/** Editor-only admin view; invisible (404) to everyone else. */
export const metadata: Metadata = {
  title: "Search Console",
  robots: { index: false, follow: false },
};

/** The window every number on this page is measured over. */
const WINDOW_DAYS = 30;

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "America/New_York",
});

export default async function SearchConsolePage() {
  const { isEditor } = await getAuthState();
  if (!isEditor) notFound();

  const [data, back] = await Promise.all([
    getSearchConsoleData(WINDOW_DAYS),
    adminReturn(),
  ]);

  const busiest = Math.max(1, ...data.byDay.map((day) => day.searches));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <Link
        href={back.href}
        className="font-sans text-[11px] font-semibold tracking-[0.18em] text-(--dim) uppercase transition-colors duration-200 hover:text-(--accent)"
      >
        {back.label}
      </Link>
      <h1 className="mt-6 text-3xl text-(--title)">Search Console</h1>
      <p className="mt-1 max-w-[60ch] font-sans text-[12.5px] text-(--dim)">
        What visitors searched for on the team-matching page over the last{" "}
        {WINDOW_DAYS} days. Your own searches aren&apos;t counted, and no row
        here identifies anyone — the ledger keeps a salted hash for rate
        limiting and nothing else.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        <Stat label="Searches" value={data.totalSearches} />
        <Stat label="Last 7 days" value={data.searchesThisWeek} />
        <Stat
          label="Found nothing"
          value={data.emptyQueries}
          hint="distinct, last 7 days"
        />
        <Stat label="AI answers" value={data.aiAnswers} />
      </div>

      {data.byDay.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-sans text-[11px] font-semibold tracking-[0.14em] text-(--dim) uppercase">
            Searches per day
          </h2>
          <ul className="mt-4 flex h-32 items-end gap-1">
            {data.byDay.map((day) => (
              <li
                key={day.day}
                className="flex-1 rounded-t bg-(--accent)/70"
                style={{ height: `${(day.searches / busiest) * 100}%` }}
                title={`${day.day}: ${day.searches}`}
              />
            ))}
          </ul>
          <div className="mt-2 flex justify-between font-sans text-[11px] text-(--dim)">
            <span>{data.byDay[0]?.day}</span>
            <span>{data.byDay[data.byDay.length - 1]?.day}</span>
          </div>
        </section>
      ) : null}

      <QueryTable
        title="Top queries"
        empty="Nothing searched yet."
        rows={data.topQueries}
      />

      <QueryTable
        title="Found nothing"
        empty="Every search found something."
        note="The list worth acting on: each row is a visitor asking this profile
          for something it doesn't answer. Either the page is missing, or it is
          there and doesn't use these words."
        rows={data.zeroResultQueries}
      />

      {data.aiAnswers > 0 || data.aiFailures > 0 ? (
        <section className="mt-10 rounded-md border border-(--line) bg-(--bg-elev) px-5 py-4">
          <h2 className="font-sans text-[11px] font-semibold tracking-[0.14em] text-(--dim) uppercase">
            AI overview
          </h2>
          <p className="mt-2 font-sans text-[13px] leading-6 text-(--text)">
            {data.aiAnswers} answered, {data.aiFailures} failed or came back
            empty. {data.inputTokens.toLocaleString()} input tokens, of which{" "}
            {data.cachedTokens.toLocaleString()} were cached, and{" "}
            {data.outputTokens.toLocaleString()} output.
          </p>
        </section>
      ) : null}
    </main>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-(--line) bg-(--bg-elev) px-4 py-3">
      <p className="font-sans text-[11px] tracking-[0.12em] text-(--dim) uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl text-(--title)">{value.toLocaleString()}</p>
      {hint ? (
        <p className="font-sans text-[11px] text-(--dim)">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * "3 searches, 1 asked · 8 results".
 *
 * The two counts stay apart because they are different acts: typing into
 * the field, and putting the question to the overview. A result count
 * belongs only to the first — the overview answers in prose and counts
 * nothing, so a query it alone ever saw shows no number rather than a
 * zero that would read as "found nothing".
 */
function describe(row: QueryCount): string {
  const parts = [
    row.searches > 0
      ? `${row.searches} ${row.searches === 1 ? "search" : "searches"}`
      : null,
    row.asked > 0 ? `${row.asked} asked` : null,
  ].filter(Boolean);

  if (row.bestResults !== null) {
    parts.push(
      `${row.bestResults} ${row.bestResults === 1 ? "result" : "results"}`,
    );
  }
  return parts.join(" · ");
}

function QueryTable({
  title,
  note,
  empty,
  rows,
}: {
  title: string;
  note?: string;
  empty: string;
  rows: QueryCount[];
}) {
  return (
    <section className="mt-10">
      <h2 className="font-sans text-[11px] font-semibold tracking-[0.14em] text-(--dim) uppercase">
        {title}
      </h2>
      {note ? (
        <p className="mt-2 max-w-[60ch] font-sans text-[12.5px] leading-5 text-(--dim)">
          {note}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-3 font-sans text-sm text-(--dim) italic">{empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-(--line) rounded-md border border-(--line) bg-(--bg-elev)">
          {rows.map((row) => (
            <li
              key={row.query}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-[14px] text-(--text)">
                {row.query}
              </span>
              <span className="font-sans text-[12px] text-(--dim)">
                {describe(row)} · {DATE_FORMAT.format(row.lastAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
