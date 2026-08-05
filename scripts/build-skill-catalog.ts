/**
 * Merge the Devicon and Simple Icons manifests into one searchable
 * catalog at src/data/skill-catalog.json. Devicon wins on slug
 * collisions (full-color icons); Simple Icons fills out the long tail.
 *
 * Run: npm run build:catalog  (output is committed, so consumers of the
 * repo never need the manifests at runtime)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import deviconJson from "devicon/devicon.json";
import * as simpleIconsModule from "simple-icons";

interface DeviconEntry {
  name: string;
  altnames?: string[];
  tags?: string[];
  versions: { svg: string[] };
  color?: string;
}

interface SimpleIcon {
  title: string;
  slug: string;
  hex: string;
}

export interface CatalogEntry {
  name: string;
  slug: string;
  source: "devicon" | "simple-icons";
  color: string | null;
  /** Devicon SVG variant to render (null for simple-icons). */
  variant: string | null;
  /** Extra lowercase search terms beyond the name. */
  terms: string[];
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Prefer colored "original" art, fall back to whatever exists. */
function pickVariant(svgVariants: string[]): string {
  return (
    ["original", "plain", "line"].find((v) => svgVariants.includes(v)) ??
    svgVariants[0] ??
    "original"
  );
}

const simpleIcons = Object.values(
  simpleIconsModule as Record<string, unknown>,
).filter(
  (value): value is SimpleIcon =>
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    "slug" in value &&
    "hex" in value,
);
const simpleBySlug = new Map(simpleIcons.map((icon) => [icon.slug, icon]));

const deviconEntries: CatalogEntry[] = (deviconJson as DeviconEntry[]).map(
  (entry) => ({
    // Simple Icons often has the prettier display name for the same slug.
    name: simpleBySlug.get(entry.name)?.title ?? titleCase(entry.name),
    slug: entry.name,
    source: "devicon",
    color: entry.color ?? null,
    variant: pickVariant(entry.versions.svg),
    terms: [...(entry.altnames ?? []), ...(entry.tags ?? [])].map((term) =>
      term.toLowerCase(),
    ),
  }),
);

const deviconSlugs = new Set(deviconEntries.map((entry) => entry.slug));

const simpleEntries: CatalogEntry[] = simpleIcons
  .filter((icon) => !deviconSlugs.has(icon.slug))
  .map((icon) => ({
    name: icon.title,
    slug: icon.slug,
    source: "simple-icons",
    color: `#${icon.hex}`,
    variant: null,
    terms: [],
  }));

const catalog = [...deviconEntries, ...simpleEntries];

const outPath = join(process.cwd(), "src", "data", "skill-catalog.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(catalog));
console.log(
  `Wrote ${catalog.length} entries (${deviconEntries.length} devicon, ${simpleEntries.length} simple-icons) to src/data/skill-catalog.json`,
);
