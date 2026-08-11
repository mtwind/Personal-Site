/**
 * Doodles: the four dots become something else on a handful of days.
 *
 * The dates are deliberately few. A doodle works because it is a surprise
 * on a day that means something — a logo that is always decorated is just
 * a decorated logo.
 *
 * Resolved from the *reader's* clock rather than the server's, which is
 * both more correct (a doodle belongs to the day the reader is having)
 * and the reason it renders after mount: the server has no way to know
 * what day it is where they are.
 */

export interface Doodle {
  /** Drawn in place of the four dots. */
  art: string;
  /** Tooltip and accessible name — always says what day it is. */
  title: string;
}

/** `MM-DD` → the day's doodle. */
const CALENDAR: Record<string, Doodle> = {
  "01-01": { art: "🎉", title: "Happy New Year" },
  "02-14": { art: "❤️", title: "Valentine's Day" },
  "03-14": { art: "π", title: "Pi Day" },
  "04-01": { art: "🃏", title: "April Fools' Day" },
  "06-21": { art: "🌻", title: "First day of summer" },
  "07-04": { art: "🎆", title: "Independence Day" },
  "10-31": { art: "🎃", title: "Halloween" },
  "11-30": { art: "💻", title: "Computer Science Education Week" },
  "12-25": { art: "🎄", title: "Merry Christmas" },
  "12-31": { art: "🥂", title: "New Year's Eve" },
};

/**
 * `MM-DD` in the reader's own timezone.
 *
 * A string rather than the doodle itself, because this is what the
 * component subscribes to: a snapshot has to be comparable by identity,
 * and a fresh object every time it is read would never compare equal.
 */
export function dayKey(date: Date = new Date()): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${month}-${day}`;
}

/** The server has no reader's clock to read, so it has no doodle. */
export const NO_DAY = "";

/** The doodle for a day key, or null on the other 355. */
export function doodleForKey(key: string): Doodle | null {
  return CALENDAR[key] ?? null;
}
