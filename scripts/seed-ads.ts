/**
 * Add the standing set of ads to the team-matching page.
 *
 * The ads are real brands I actually care about, dressed as sponsored
 * placements because the page is pretending to be Google. Each one is
 * keyed to the searches and pages it belongs beside — Chelsea under the
 * football, Ikon under the skiing, Capital One under the internships.
 *
 * Idempotent, and deliberately conservative: an ad whose brand is
 * already in the table is left exactly as it is, so copy edited in the
 * admin isn't overwritten by a re-run. New ads are appended after the
 * highest sort order in use, so nothing already arranged is reordered.
 *
 * Run: npx tsx scripts/seed-ads.ts
 */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { eq } from "drizzle-orm";

import { ads, experiences } from "../src/db/schema";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL required");

/**
 * Logo for a brand Simple Icons doesn't carry.
 *
 * Same source the experience rows use for company logos — a favicon is
 * close enough to a brand mark at 20px, and it costs nothing to keep
 * working when a brand redesigns.
 */
function favicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

type NewAd = typeof ads.$inferInsert;

/**
 * One ad, minus the columns the loop below fills in.
 *
 * `iconSlug` where Simple Icons carries the brand — it serves a tinted
 * SVG, which stays sharp at any size. `iconUrl` for everything else.
 * Neither means the component draws an initial tile in `color`, which is
 * the right answer for a show that has a colour but no logo of its own.
 */
type AdSeed = Omit<NewAd, "sortOrder">;

const SEED_ADS: AdSeed[] = [
  /* ───────────────────────────── clothing ───────────────────────────── */
  {
    brand: "Arc'teryx",
    headline: "Shells That Take the Weather Personally",
    description:
      "Hard shells, mid-layers and packs built for the day the forecast changes its mind.",
    displayUrl: "www.arcteryx.com",
    targetUrl: "https://arcteryx.com/",
    iconUrl: favicon("arcteryx.com"),
    color: "#231F20",
    keywords: [
      "arcteryx",
      "jacket",
      "shell",
      "outerwear",
      "clothing",
      "apparel",
      "gear",
      "outdoor",
      "outdoors",
      "hiking",
      "climbing",
      "alpine",
      "skiing",
    ],
  },
  {
    brand: "Chelsea Megastore",
    headline: "The Home Kit, Straight from the Bridge",
    description:
      "Shirts, scarves and everything else you wear to argue about the transfer window.",
    displayUrl: "www.chelseamegastore.com",
    targetUrl: "https://www.chelseamegastore.com/",
    // The store's own favicon is a wide wordmark that turns into a
    // smudge at 20px. The club crest is the same brand and survives
    // being shrunk, which is the only thing a logo has to do here.
    iconUrl: favicon("chelseafc.com"),
    color: "#034694",
    keywords: [
      "chelsea",
      "kit",
      "shirt",
      "jersey",
      "scarf",
      "merch",
      "merchandise",
      "clothing",
      "apparel",
      "football",
      "soccer",
      "blues",
    ],
  },
  {
    brand: "Purdue Team Store",
    headline: "Boilermaker Gold, Officially Licensed",
    description:
      "Hoodies, hats and jerseys for anyone who still checks the Purdue score first.",
    displayUrl: "www.purdueteamstore.com",
    targetUrl: "https://www.purdueteamstore.com/",
    iconUrl: favicon("purdueteamstore.com"),
    color: "#000000",
    keywords: [
      "purdue",
      "boilermaker",
      "boilermakers",
      "merch",
      "merchandise",
      "clothing",
      "apparel",
      "hoodie",
      "jersey",
      "college",
      "campus",
    ],
  },

  /* ────────────────────────────── sports ────────────────────────────── */
  {
    brand: "Chelsea FC",
    headline: "Up the Chels — Fixtures, News and Tickets",
    description:
      "Everything out of Stamford Bridge, including the results you'd rather not read about.",
    displayUrl: "www.chelseafc.com",
    targetUrl: "https://www.chelseafc.com/",
    iconUrl: favicon("chelseafc.com"),
    color: "#034694",
    infoText:
      "Why this ad? Because I've followed Chelsea since I was a kid and travelled to London, Brighton, New York, Philadelphia, Charlotte and Chicago to watch them. Nobody paid for this — these ads are placed by me, for the joke.",
    keywords: [
      "chelsea",
      "football",
      "soccer",
      "premier",
      "league",
      "stamford",
      "bridge",
      "blues",
      "london",
      "match",
      "fixtures",
      "sports",
      "sport",
    ],
  },
  {
    brand: "Purdue Sports",
    headline: "Boiler Up — Every Boilermaker Team, One Place",
    description:
      "Schedules, tickets and highlights, with basketball season sitting at the top of the page.",
    displayUrl: "www.purduesports.com",
    targetUrl: "https://purduesports.com/",
    iconUrl: favicon("purduesports.com"),
    color: "#8E7B2F",
    keywords: [
      "purdue",
      "boilermaker",
      "boilermakers",
      "basketball",
      "mackey",
      "college",
      "ncaa",
      "sports",
      "sport",
      "tickets",
      "hoops",
    ],
  },
  {
    brand: "Ikon Pass",
    headline: "One Pass, More Than 50 Mountains",
    description:
      "A whole winter of destinations, committed to once in the spring and skied off all season.",
    displayUrl: "www.ikonpass.com",
    targetUrl: "https://www.ikonpass.com/",
    iconUrl: favicon("ikonpass.com"),
    color: "#0F1E2B",
    keywords: [
      "ikon",
      "ski",
      "skiing",
      "snowboard",
      "snowboarding",
      "snow",
      "mountain",
      "mountains",
      "winter",
      "powder",
      "slopes",
      "resort",
      "alpine",
      "pass",
    ],
  },
  {
    brand: "Epic Pass",
    headline: "Ski the Whole Season on One Pass",
    description:
      "Vail, Breckenridge, Whistler and the rest, with the lift ticket already paid for in August.",
    displayUrl: "www.epicpass.com",
    targetUrl: "https://www.epicpass.com/",
    iconUrl: favicon("epicpass.com"),
    color: "#005CB9",
    keywords: [
      "epic",
      "vail",
      "breckenridge",
      "whistler",
      "ski",
      "skiing",
      "snowboard",
      "snowboarding",
      "snow",
      "mountain",
      "mountains",
      "winter",
      "powder",
      "slopes",
      "resort",
      "pass",
    ],
  },

  {
    brand: "Premier League",
    headline: "Twenty Clubs, Thirty-Eight Matchdays",
    description:
      "Fixtures, tables and highlights from the league that quietly owns your Saturday mornings.",
    displayUrl: "www.premierleague.com",
    targetUrl: "https://www.premierleague.com/",
    iconSlug: "premierleague",
    color: "#360D3A",
    keywords: [
      "premier",
      "league",
      "football",
      "soccer",
      "england",
      "english",
      "fixtures",
      "matchday",
      "table",
      "standings",
      "sports",
      "sport",
    ],
  },
  {
    brand: "Big Ten Conference",
    headline: "Boilermakers, Buckeyes and Sixteen More",
    description:
      "The conference Purdue plays in — schedules, standings and championship weeks.",
    displayUrl: "www.bigten.org",
    targetUrl: "https://bigten.org/",
    iconUrl: favicon("bigten.org"),
    color: "#0088CE",
    keywords: [
      "bigten",
      "conference",
      "purdue",
      "boilermaker",
      "boilermakers",
      "college",
      "ncaa",
      "basketball",
      "sports",
      "sport",
      "standings",
      "tournament",
    ],
  },
  {
    brand: "UEFA Champions League",
    headline: "European Nights, Under the Lights",
    description:
      "The knockout rounds, the anthem, and the midweek fixtures worth staying up for.",
    displayUrl: "www.uefa.com",
    targetUrl: "https://www.uefa.com/uefachampionsleague/",
    iconUrl: favicon("uefa.com"),
    color: "#00317F",
    keywords: [
      "champions",
      "uefa",
      "league",
      "european",
      "europe",
      "football",
      "soccer",
      "knockout",
      "final",
      "sports",
      "sport",
    ],
  },
  {
    brand: "FIFA",
    headline: "The World Cup, and the Long Road to It",
    description:
      "International football's governing body — tournaments, qualifiers and the rankings nobody agrees with.",
    displayUrl: "www.fifa.com",
    targetUrl: "https://www.fifa.com/",
    iconSlug: "fifa",
    color: "#326295",
    keywords: [
      "fifa",
      "world",
      "cup",
      "football",
      "soccer",
      "international",
      "tournament",
      "qualifiers",
      "national",
      "sports",
      "sport",
    ],
  },

  /* ───────────────────────────── education ──────────────────────────── */
  {
    brand: "Purdue University",
    headline: "Boilermakers Are Built in West Lafayette",
    description:
      "Engineering, computer science, and a basketball arena loud enough to be a recruiting tool.",
    displayUrl: "www.purdue.edu",
    targetUrl: "https://www.purdue.edu/",
    iconUrl: favicon("purdue.edu"),
    color: "#000000",
    infoText:
      "Why this ad? I got my BS in Computer Science here and TA'd the software engineering course. Nobody paid for this — these ads are placed by me, for the joke.",
    keywords: [
      "purdue",
      "university",
      "college",
      "school",
      "degree",
      "education",
      "computer",
      "science",
      "engineering",
      "boilermaker",
      "boilermakers",
      "campus",
      "lafayette",
      "student",
    ],
  },
  {
    brand: "Purdue Global",
    headline: "A Degree That Fits Around the Job",
    description:
      "Online programs from the Purdue system, built for people already working full time.",
    displayUrl: "www.purdueglobal.edu",
    targetUrl: "https://www.purdueglobal.edu/",
    iconUrl: favicon("purdueglobal.edu"),
    color: "#8E6F3E",
    keywords: [
      "purdue",
      "global",
      "online",
      "degree",
      "education",
      "university",
      "college",
      "school",
      "certificate",
      "courses",
      "learning",
      "student",
    ],
  },

  /* ─────────────────────────────── other ────────────────────────────── */
  {
    brand: "Pipeline",
    headline: "Field Service Software That Learns Every Job",
    description:
      "Dispatch, scheduling and inventory for HVAC and plumbing firms, with AI intake that gets sharper the more work goes through it.",
    displayUrl: "www.pipeline-usa.com",
    targetUrl: "https://pipeline-usa.com/",
    // Filled in from the experience row below — Google has no favicon
    // for the domain, and the site already hosts the real logo.
    iconUrl: null,
    color: "#0B3B5A",
    infoText:
      "Full disclosure: this one is mine. I'm a co-founder and CTO, which makes it easily the least impartial ad on the page. Still nobody paid for the placement.",
    keywords: [
      "pipeline",
      "hvac",
      "plumbing",
      "field",
      "service",
      "dispatch",
      "scheduling",
      "startup",
      "founder",
      "cofounder",
      "saas",
      "product",
      "fastapi",
      "python",
    ],
  },
  {
    brand: "Capital One",
    headline: "Banking Built by Its Own Engineers",
    description:
      "Cards, accounts and a technology org large enough that its internal tools have internal tools.",
    displayUrl: "www.capitalone.com",
    targetUrl: "https://www.capitalone.com/",
    iconUrl: favicon("capitalone.com"),
    color: "#004977",
    infoText:
      "Why this ad? I interned here as a software engineer, building the testing layer for an internal VSCode extension. Nobody paid for this — these ads are placed by me, for the joke.",
    keywords: [
      "capital",
      "banking",
      "bank",
      "fintech",
      "finance",
      "credit",
      "card",
      "cards",
      "internship",
      "intern",
      "typescript",
      "testing",
    ],
  },
  {
    brand: "Federal Home Loan Bank of Chicago",
    headline: "Liquidity for the Banks You Actually Bank With",
    description:
      "A member-owned bank behind Midwest lenders — funding, mortgages, and a great deal of careful .NET.",
    displayUrl: "www.fhlbc.com",
    targetUrl: "https://www.fhlbc.com/",
    iconUrl: favicon("fhlbc.com"),
    color: "#003057",
    infoText:
      "Why this ad? My first software engineering internship was here, working on FinTech applications and DevSecOps. Nobody paid for this — these ads are placed by me, for the joke.",
    keywords: [
      "fhlbc",
      "federal",
      "bank",
      "banking",
      "finance",
      "fintech",
      "mortgage",
      "lending",
      "chicago",
      "azure",
      "devsecops",
      "dotnet",
      "internship",
      "intern",
    ],
  },
  {
    brand: "Shopwave",
    headline: "The Operating System for Small Retail",
    description:
      "Point of sale, inventory and analytics for shops that were never going to have an IT department.",
    displayUrl: "www.shopwave.com",
    targetUrl: "https://www.shopwave.com/",
    iconUrl: favicon("shopwave.com"),
    color: "#1B7FA8",
    infoText:
      "Why this ad? I interned here in London while studying abroad, building reporting and analytics for merchants. Nobody paid for this — these ads are placed by me, for the joke.",
    keywords: [
      "shopwave",
      "retail",
      "point",
      "sale",
      "inventory",
      "analytics",
      "merchant",
      "merchants",
      "ecommerce",
      "commerce",
      "london",
      "startup",
      "internship",
      "intern",
    ],
  },
  {
    brand: "LEGO",
    headline: "Some Assembly Very Much Required",
    description:
      "Sets for the kind of evening that starts with sorting every piece by colour first.",
    displayUrl: "www.lego.com",
    targetUrl: "https://www.lego.com/",
    iconUrl: favicon("lego.com"),
    color: "#DA291C",
    keywords: [
      "lego",
      "bricks",
      "brick",
      // Not "build": on a software portfolio "what did you build" is a
      // question about the work, not an invitation to sell someone a set.
      "minifigure",
      "sets",
      "toys",
      "hobby",
      "hobbies",
      "model",
      "models",
      "collecting",
    ],
  },
  {
    brand: "Claude",
    headline: "The AI That Writes the Code With You",
    description:
      "Ask it to build something, then spend the afternoon arguing with it about the architecture.",
    displayUrl: "claude.ai",
    targetUrl: "https://claude.ai/",
    iconSlug: "claude",
    color: "#D97757",
    keywords: [
      "claude",
      "anthropic",
      "llm",
      "llms",
      "assistant",
      "agent",
      "agents",
      "model",
      "models",
      "prompt",
      "coding",
      "artificial",
      "intelligence",
    ],
  },
  {
    brand: "Google Gemini",
    headline: "Google's Model, In Everything You Already Use",
    description:
      "Long context, multimodal input, and a free tier generous enough to prototype against.",
    displayUrl: "gemini.google.com",
    targetUrl: "https://gemini.google.com/",
    iconSlug: "googlegemini",
    color: "#8E75B2",
    keywords: [
      "gemini",
      "google",
      "llm",
      "llms",
      "model",
      "models",
      "multimodal",
      "flash",
      "assistant",
      "artificial",
      "intelligence",
      "inference",
    ],
  },
  {
    brand: "Google Cloud",
    headline: "Ship It Somewhere That Scales",
    description:
      "Compute, storage and BigQuery, billed by the second whether or not you were ready.",
    displayUrl: "cloud.google.com",
    targetUrl: "https://cloud.google.com/",
    iconSlug: "googlecloud",
    color: "#4285F4",
    keywords: [
      "cloud",
      "google",
      "infrastructure",
      "deploy",
      "deployment",
      "hosting",
      "kubernetes",
      "bigquery",
      "serverless",
      "database",
      "backend",
      "devops",
    ],
  },

  /* ─────────────────────────────── gaming ───────────────────────────── */
  {
    brand: "Call of Duty",
    headline: "Warzone, Multiplayer, and One More Match",
    description:
      "The shooter that has been quietly eating everybody's evenings since 2003.",
    displayUrl: "www.callofduty.com",
    targetUrl: "https://www.callofduty.com/",
    // The site's favicon is Activision's "A", which next to the words
    // "Call of Duty" reads as the wrong logo rather than a parent
    // company's. A lettered tile is at least honestly a fallback.
    iconUrl: null,
    color: "#4B5320",
    keywords: [
      "warzone",
      "multiplayer",
      "shooter",
      "gaming",
      "gamer",
      "console",
      "playstation",
      "xbox",
      "campaign",
    ],
  },
  {
    brand: "Xbox",
    headline: "Game Pass, and a Console to Play It On",
    description:
      "Consoles, controllers and a library big enough that choosing is the hard part.",
    displayUrl: "www.xbox.com",
    targetUrl: "https://www.xbox.com/",
    iconUrl: favicon("xbox.com"),
    color: "#107C10",
    keywords: [
      "xbox",
      "gaming",
      "gamer",
      "console",
      "controller",
      "gamepass",
      "multiplayer",
      "microsoft",
      "playstation",
      "nintendo",
    ],
  },
  {
    brand: "Halo",
    headline: "Finish the Fight, Again",
    description:
      "Master Chief, the Covenant, and the campaign that sold every Xbox in the room.",
    displayUrl: "www.halowaypoint.com",
    targetUrl: "https://www.halowaypoint.com/",
    iconUrl: favicon("halowaypoint.com"),
    color: "#0E5A8A",
    keywords: [
      "halo",
      "spartan",
      "covenant",
      "shooter",
      "xbox",
      "gaming",
      "gamer",
      "console",
      "campaign",
      "multiplayer",
    ],
  },

  /* ──────────────────────────── entertainment ───────────────────────── */
  {
    brand: "Marvel",
    headline: "Comics, Characters and the Whole MCU",
    description:
      "Decades of storylines, and a viewing order that nobody has ever fully agreed on.",
    displayUrl: "www.marvel.com",
    targetUrl: "https://www.marvel.com/",
    iconUrl: favicon("marvel.com"),
    color: "#ED1D24",
    keywords: [
      "marvel",
      "comics",
      "comic",
      "superhero",
      "superheroes",
      "avengers",
      "movies",
      "movie",
      "films",
      "film",
      "series",
      "watching",
    ],
  },
  {
    brand: "Game of Thrones",
    headline: "Winter Came. Watch It Again Anyway.",
    description:
      "Eight seasons in Westeros, seven of which everybody still recommends without hesitating.",
    displayUrl: "www.hbo.com",
    targetUrl: "https://www.hbo.com/game-of-thrones",
    iconUrl: favicon("hbo.com"),
    color: "#7B1113",
    keywords: [
      "thrones",
      "westeros",
      "targaryen",
      "stark",
      "dragons",
      "fantasy",
      "show",
      "shows",
      "series",
      "television",
      "watching",
      "streaming",
    ],
  },
  {
    brand: "Castle",
    headline: "A Mystery Writer Walks into a Precinct",
    description:
      "Eight seasons of murders solved by a novelist with absolutely no business being there.",
    displayUrl: "www.imdb.com",
    targetUrl: "https://www.imdb.com/title/tt1219024/",
    color: "#1C3F60",
    keywords: [
      "castle",
      "mystery",
      "detective",
      "crime",
      "procedural",
      "show",
      "shows",
      "series",
      "television",
      "watching",
      "streaming",
    ],
  },
  {
    brand: "Vikings",
    headline: "Ragnar's Saga, from Raider to Legend",
    description:
      "Norse history dramatised hard enough that you end up reading the real thing afterwards.",
    displayUrl: "www.history.com",
    targetUrl: "https://www.history.com/shows/vikings",
    iconUrl: favicon("history.com"),
    color: "#4A3520",
    keywords: [
      "vikings",
      "viking",
      "ragnar",
      "norse",
      "history",
      "historical",
      "drama",
      "show",
      "shows",
      "series",
      "television",
      "watching",
    ],
  },
  {
    brand: "Arrow",
    headline: "The Island Changed Him. So Did the Hood.",
    description:
      "Starling City's vigilante, and the show that quietly started a whole universe of them.",
    displayUrl: "www.imdb.com",
    targetUrl: "https://www.imdb.com/title/tt2193021/",
    color: "#1B5E20",
    keywords: [
      "arrow",
      "arrowverse",
      "vigilante",
      "superhero",
      "superheroes",
      "comics",
      "show",
      "shows",
      "series",
      "television",
      "watching",
      "streaming",
    ],
  },
  {
    brand: "Star Wars",
    headline: "A Galaxy Far, Far Away — All of It",
    description:
      "Films, series and the canon arguments that reliably outlast every one of them.",
    displayUrl: "www.starwars.com",
    targetUrl: "https://www.starwars.com/",
    iconUrl: favicon("starwars.com"),
    color: "#000000",
    keywords: [
      "wars",
      "starwars",
      "jedi",
      "sith",
      "force",
      "mandalorian",
      "lightsaber",
      "skywalker",
      "movies",
      "movie",
      "films",
      "film",
      "series",
      "science",
      "fiction",
    ],
  },
  {
    brand: "The Hunger Games",
    headline: "May the Odds Be Ever in Your Favor",
    description:
      "Panem, the districts, and a trilogy that got noticeably darker with every book.",
    displayUrl: "www.lionsgate.com",
    targetUrl: "https://www.lionsgate.com/movies/the-hunger-games",
    iconUrl: favicon("lionsgate.com"),
    color: "#8C1C13",
    keywords: [
      "hunger",
      "games",
      "katniss",
      "panem",
      "district",
      "districts",
      "dystopian",
      "trilogy",
      "books",
      "book",
      "movies",
      "movie",
      "films",
      "film",
      "reading",
    ],
  },
];

async function main(): Promise<void> {
  const client = postgres(databaseUrl!, { prepare: false, max: 1 });
  const db = drizzle(client);

  // Pipeline is the one brand neither Simple Icons nor the favicon
  // service carries, and it is also the one whose logo this site already
  // stores for its experience entry. Reusing that keeps the two places
  // it appears showing the same mark.
  const [pipelineRole] = await db
    .select({ logo: experiences.companyLogoUrl })
    .from(experiences)
    .where(eq(experiences.companyDomain, "pipeline-usa.com"))
    .limit(1);

  const existing = await db
    .select({ brand: ads.brand, sortOrder: ads.sortOrder })
    .from(ads);

  const taken = new Set(existing.map((row) => row.brand.trim().toLowerCase()));
  let next = existing.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;

  const missing = SEED_ADS.filter(
    (ad) => !taken.has(ad.brand.trim().toLowerCase()),
  );
  const skipped = SEED_ADS.length - missing.length;

  if (missing.length > 0) {
    await db.insert(ads).values(
      missing.map((ad) => ({
        ...ad,
        iconUrl:
          ad.brand === "Pipeline" ? (pipelineRole?.logo ?? null) : ad.iconUrl,
        slots: ["sponsored", "rail", "banner"],
        sortOrder: next++,
      })),
    );
  }

  for (const ad of missing) console.log(`added: ${ad.brand}`);
  console.log(
    `\n${missing.length} added, ${skipped} already present, ${existing.length + missing.length} ads total.`,
  );

  await client.end();
}

main().catch((error: unknown) => {
  console.error(
    "SEED FAILED:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
