const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2024-01-15" → "Jan 2024". Returns null for null/invalid input. */
export function formatMonthYear(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return MONTH_FORMAT.format(parsed);
}

/** "Jan 2024 – Present" | "Jan 2024 – Mar 2025" | null when no dates. */
export function formatDateRange(
  startDate: string | null,
  endDate: string | null,
): string | null {
  const start = formatMonthYear(startDate);
  if (!start) return null;
  const end = formatMonthYear(endDate) ?? "Present";
  return `${start} – ${end}`;
}
