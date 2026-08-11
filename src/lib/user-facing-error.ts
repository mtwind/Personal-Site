/**
 * An error whose message was written for the person who triggered it.
 *
 * Mutations swallow errors into a generic "something went wrong" so an
 * internal failure never leaks its shape to the browser. Some failures
 * are the user's to act on, though — a file too large, a document the
 * model wouldn't read — and those messages should arrive intact. This
 * is the marker that says so.
 */
export class UserFacingError extends Error {}
