/**
 * The shape a value has after a trip through a JSON cache.
 *
 * Content is cached across requests (see `content-cache.ts`), and the
 * cache stores JSON: a `Date` goes in as a `Date` and comes back out as
 * the string it was serialized to. Rows read straight from the database
 * still carry real dates, so a field that was a `Date` is typed as
 * either — which is exactly what it is. A caller that needs a date
 * object parses it; one that only passes the row along is unaffected.
 *
 * Client-safe: types only.
 */
export type Serialized<T> = T extends Date
  ? Date | string
  : T extends (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;
