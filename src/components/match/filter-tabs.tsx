"use client";

import Link from "next/link";

import type { ReferenceKind } from "@/lib/match-references";

/**
 * Plural label for a filter tab.
 *
 * "Coursework" rather than "Courses" because that is what the section is
 * called everywhere else — on the public site, and in the way anyone
 * reading a profile refers to it.
 */
export const TAB_LABEL: Record<ReferenceKind, string> = {
  page: "Pages",
  experience: "Experience",
  project: "Projects",
  course: "Coursework",
  skill: "Skills",
};

export interface FilterTabItem {
  href: string;
  label: string;
  /** Omitted on the leading tab, which counts a different set. */
  count?: number;
  active: boolean;
}

/**
 * Google's result-type strip: one row of tabs, the active one underlined.
 *
 * Shared by the results page and the home listing because they are the
 * same control over the same kinds — a reader who narrows a search to
 * projects and then clears the query should find the strip still there,
 * in the same place, doing the same thing.
 *
 * Every tab is a link carrying `?t=`, so narrowing is a history entry
 * the back button undoes rather than a state the reader is stuck in.
 */
export function FilterTabs({
  label,
  tabs,
}: {
  /** Names the strip for anyone not looking at the underline. */
  label: string;
  tabs: FilterTabItem[];
}) {
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center gap-1 border-b border-[#dadce0]"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          scroll={false}
          aria-current={tab.active ? "page" : undefined}
          className={`-mb-px border-b-[3px] px-3.5 py-2.5 text-[14px] transition-colors ${
            tab.active
              ? "border-[#1a73e8] font-medium text-[#1a73e8]"
              : "border-transparent text-[#5f6368] hover:text-[#202124]"
          }`}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span className="ml-1.5 text-[12px] text-[#80868b]">
              {tab.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
