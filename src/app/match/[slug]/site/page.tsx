import type { Metadata } from "next";

import { SITE_TITLE } from "@/lib/match-tabs";

export const metadata: Metadata = { title: SITE_TITLE };

/**
 * The ordinary website, in a tab of this one.
 *
 * The frame itself lives in the shell (see `SiteFrame`), not here: a
 * page is unmounted the moment the reader switches tabs, and a frame
 * that lived in one reloaded the whole site — cold — on every visit to
 * this tab, which is what made the tab feel broken. Kept in the shell,
 * it loads once, in the background, and switching to it is showing it.
 *
 * So this route has nothing of its own to render. It still exists so the
 * tab is a real URL — back and forward, cmd-click and a copied link all
 * work — and so the browser's own tab reads like the strip inside it.
 * The layout above has already checked the slug.
 */
export default function MatchSite() {
  return null;
}
