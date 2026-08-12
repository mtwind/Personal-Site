/**
 * Google's product areas, for the dropdown a hiring manager or Googler
 * gets after saying who they are.
 *
 * Grouped the way Google talks about itself rather than by org chart
 * depth: someone picking their own PA should find it in one pass down
 * the list, and the groups are what makes a list this long scannable.
 *
 * Stored as labels, not keys — Google reorganises every couple of years,
 * and a label recorded in 2026 still says something true afterwards
 * while a key would point at a list entry that had since moved. That
 * also means this list can be edited freely without migrating old rows.
 *
 * "Something else" is last and deliberate: a hiring manager who isn't at
 * Google at all still needs a way through this question.
 */
export interface ProductAreaGroup {
  label: string;
  areas: string[];
}

export const GOOGLE_PRODUCT_AREAS: ProductAreaGroup[] = [
  {
    label: "Search & Ads",
    areas: [
      "Search",
      "Search Platform",
      "Ads & Commerce",
      "Shopping",
      "Payments",
    ],
  },
  {
    label: "AI",
    areas: [
      "Google DeepMind",
      "Gemini App",
      "Cloud AI",
      "Google Research",
      "Labs",
    ],
  },
  {
    label: "Cloud & Infrastructure",
    areas: [
      "Google Cloud",
      "Core (Core Systems & Experiences)",
      "Technical Infrastructure",
      "Site Reliability Engineering",
      "Security & Privacy",
    ],
  },
  {
    label: "Platforms & Devices",
    areas: [
      "Android",
      "Chrome",
      "Pixel",
      "Devices & Services (Nest, Fitbit)",
      "ChromeOS",
      "XR",
    ],
  },
  {
    label: "Products",
    areas: [
      "YouTube",
      "Google Workspace",
      "Geo (Maps, Earth, Waze)",
      "Google Play",
      "Photos",
      "News",
      "Travel",
      "Health",
    ],
  },
  {
    label: "Go-to-market & Support",
    areas: [
      "gTech",
      "Global Business Organization (Sales)",
      "Trust & Safety",
      "Corporate Engineering",
      "People Operations",
    ],
  },
  {
    label: "Alphabet",
    areas: ["Waymo", "Verily", "Wing", "Other Alphabet bet"],
  },
  {
    label: "Other",
    areas: ["Not at Google", "Something else"],
  },
];

/** Every label, flattened — what a stored value is checked against. */
export const PRODUCT_AREA_VALUES: string[] = GOOGLE_PRODUCT_AREAS.flatMap(
  (group) => group.areas,
);
