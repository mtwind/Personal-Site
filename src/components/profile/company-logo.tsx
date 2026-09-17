"use client";

import { useState } from "react";

import { companyFaviconUrl } from "@/lib/company-favicon";

interface CompanyLogoProps {
  src: string;
  /** Lets a dead logo fall back to the company's favicon. */
  domain: string | null;
  className: string;
}

/**
 * A company's mark, with somewhere to go when the link is dead.
 *
 * Logos picked from the company search were links into a third-party
 * CDN, and those expire: the row keeps the URL, the CDN answers `410`,
 * and the profile shows a broken image. New saves copy the file into
 * our own storage; for anything saved before that, this tries the
 * stored link, then the domain's favicon, then shows nothing at all
 * rather than a broken-image glyph.
 */
export function CompanyLogo({ src, domain, className }: CompanyLogoProps) {
  const candidates = [src];
  if (domain) {
    const favicon = companyFaviconUrl(domain);
    if (favicon !== src) candidates.push(favicon);
  }

  const [attempt, setAttempt] = useState(0);
  const url = candidates[attempt];
  if (!url) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      aria-hidden
      onError={() => setAttempt((current) => current + 1)}
      className={className}
    />
  );
}
