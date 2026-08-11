"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import {
  KIND_LABEL,
  type ReferenceTarget,
} from "@/lib/match-references";
import { matchRanges, searchReferences, summaryIndex, summaryKey } from "@/lib/match-search";
import { targetHref } from "@/lib/match-tabs";
import { useMatch } from "./match-shell";

/**
 * The card at the top of the right-hand column.
 *
 * Google's knowledge panel answers "what is this thing you searched
 * for", and it earns its place by being about the *subject* rather than
 * about any one result. Both readings apply here: with nothing searched,
 * the subject is the person the page is about, and when a search names
 * something the page holds — a language, a role, a project — the panel
 * becomes that entity's card instead.
 */
export function KnowledgePanel() {
  const { index, owner } = useMatch();
  const query = useSearchParams().get("q")?.trim() ?? "";

  /**
   * The entity the query names, if it names one.
   *
   * The test is deliberately strict: the top result's *title* has to
   * contain what was typed. A query that merely ranked something first
   * is not a query about it, and a panel that claims otherwise is worse
   * than no panel.
   */
  const entity = useMemo((): ReferenceTarget | null => {
    if (!query) return null;
    const top = searchReferences(index, query)[0];
    if (!top || top.target.kind === "page") return null;
    return matchRanges(top.title, top.matched).length > 0 ? top.target : null;
  }, [index, query]);

  return entity ? <EntityPanel target={entity} /> : <OwnerPanel owner={owner} />;
}

/* ────────────────────────────── the person ──────────────────────────── */

function OwnerPanel({ owner }: { owner: ReturnType<typeof useMatch>["owner"] }) {
  const { index, resolver } = useMatch();

  const current = index.experiences[0] ?? null;
  const known = useMemo(() => resolver.rankedSkills().slice(0, 6), [resolver]);

  const links = [
    owner.resumeUrl ? { label: "Résumé", href: owner.resumeUrl } : null,
    owner.linkedinUrl ? { label: "LinkedIn", href: owner.linkedinUrl } : null,
    owner.githubUrl ? { label: "GitHub", href: owner.githubUrl } : null,
    owner.email ? { label: "Email", href: `mailto:${owner.email}` } : null,
  ].filter((link): link is { label: string; href: string } => link !== null);

  return (
    <Panel>
      <div className="flex items-center gap-3">
        {owner.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={owner.photoUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full border border-[#dadce0] object-cover"
          />
        ) : (
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1a73e8] text-[22px] font-medium text-white"
            aria-hidden
          >
            {owner.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[19px] leading-tight font-medium text-[#202124]">
            {owner.name}
          </h2>
          <p className="mt-0.5 text-[12px] tracking-[0.06em] text-[#70757a] uppercase">
            Team-matching profile
          </p>
        </div>
      </div>

      {owner.headline ? (
        <p className="mt-3 text-[13.5px] leading-5 text-[#4d5156]">
          {owner.headline}
        </p>
      ) : null}

      <dl className="mt-4 space-y-1.5 border-t border-[#ecedef] pt-3 text-[13px] leading-5">
        {current ? (
          <Fact label="Most recent">
            {current.title}
            {current.companyName ? ` · ${current.companyName}` : ""}
          </Fact>
        ) : null}
        <Fact label="Projects">{index.projects.length}</Fact>
        <Fact label="Courses">{index.courses.length}</Fact>
        <Fact label="Tools tagged">{index.skills.length}</Fact>
      </dl>

      {known.length > 0 ? (
        <div className="mt-4 border-t border-[#ecedef] pt-3">
          <p className="text-[11px] tracking-[0.12em] text-[#70757a] uppercase">
            Known for
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {known.map((entry) => (
              <li key={entry.skill.id}>
                <EntityChip target={{ kind: "skill", id: entry.skill.id }}>
                  {entry.skill.name}
                </EntityChip>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {links.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-[#ecedef] pt-3 text-[13px]">
          {links.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="text-[#1a73e8] hover:underline"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}

/* ────────────────────────────── an entity ───────────────────────────── */

function EntityPanel({ target }: { target: ReferenceTarget }) {
  const { base, index, resolver } = useMatch();
  const summary = summaryIndex(index).get(summaryKey(target));
  const skill = target.kind === "skill" ? resolver.skill(target.id) : null;
  const usage = skill ? resolver.workUsingSkill(skill.id) : null;
  const href = targetHref(base, resolver, target);

  if (!summary) return null;

  return (
    <Panel>
      <div className="flex items-center gap-3">
        {skill?.iconUrl ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#dadce0] bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={skill.iconUrl} alt="" className="h-6 w-6 object-contain" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-[19px] leading-tight font-medium text-[#202124]">
            {summary.title}
          </h2>
          <p className="mt-0.5 text-[12px] tracking-[0.06em] text-[#70757a] uppercase">
            {KIND_LABEL[target.kind]}
            {summary.note ? ` · ${summary.note}` : ""}
          </p>
        </div>
      </div>

      {summary.headline ? (
        <p className="mt-3 text-[13.5px] leading-5 text-[#4d5156]">
          {summary.headline}
        </p>
      ) : null}

      {usage ? (
        <div className="mt-4 border-t border-[#ecedef] pt-3">
          <p className="text-[11px] tracking-[0.12em] text-[#70757a] uppercase">
            Used in
          </p>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-5">
            {[
              ...usage.experiences.map((entry) => ({
                target: { kind: "experience" as const, id: entry.id },
                label: entry.title,
              })),
              ...usage.projects.map((entry) => ({
                target: { kind: "project" as const, id: entry.id },
                label: entry.name,
              })),
            ]
              .slice(0, 5)
              .map((row) => (
                <li key={`${row.target.kind}:${row.target.id}`}>
                  <EntityLink target={row.target}>{row.label}</EntityLink>
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      {href ? (
        <Link
          href={href}
          className="mt-4 inline-block border-t border-transparent text-[13px] font-medium text-[#1a73e8] hover:underline"
        >
          Open this {KIND_LABEL[target.kind].toLowerCase()} →
        </Link>
      ) : null}
    </Panel>
  );
}

/* ───────────────────────────── shared parts ─────────────────────────── */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="Knowledge panel"
      className="rounded-2xl border border-[#dadce0] bg-white p-5"
    >
      {children}
    </section>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-[#70757a]">{label}:</dt>
      <dd className="min-w-0 text-[#202124]">{children}</dd>
    </div>
  );
}

function EntityChip({
  target,
  children,
}: {
  target: ReferenceTarget;
  children: React.ReactNode;
}) {
  const { base, resolver } = useMatch();
  const href = targetHref(base, resolver, target);
  if (!href) return null;

  return (
    <Link
      href={href}
      className="inline-block rounded-full bg-[#f1f3f4] px-2.5 py-1 text-[12.5px] text-[#202124] transition-colors hover:bg-[#e8eaed]"
    >
      {children}
    </Link>
  );
}

function EntityLink({
  target,
  children,
}: {
  target: ReferenceTarget;
  children: React.ReactNode;
}) {
  const { base, resolver } = useMatch();
  const href = targetHref(base, resolver, target);
  if (!href) return <span className="text-[#4d5156]">{children}</span>;

  return (
    <Link href={href} className="text-[#1a0dab] hover:underline">
      {children}
    </Link>
  );
}
