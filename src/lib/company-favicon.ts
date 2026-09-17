/**
 * Keyless logo fallback: a company with a domain but no logo of its own
 * gets Google's favicon for the domain, which is a decent mark for free.
 *
 * Client-safe: the profile draws it when a stored logo turns out to be
 * a dead link, and the save path stores it when there was no logo at all.
 */
export function companyFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}
