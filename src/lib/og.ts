// Shared helpers for the shareable stats cards (see app/api/share-card/route.tsx).
// Pure derivation + asset loading only — no `next/og` import here, so this file
// stays importable from server components. Never import this from a client
// component (loadMascot pulls in node:fs); pass CardStats down as a prop instead
// or use a `import type` (erased at build).
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { formatHours } from "./hours";
import type { EmpireStats } from "./collection";

// Palette mirrors the --* CSS variables in globals.css. Satori can't read CSS
// variables, so the card renderer needs the raw hexes.
export const OG = {
  bg: "#0a0a0c",
  surface: "#101013",
  surface2: "#16161b",
  border: "#212127",
  border2: "#2c2c34",
  text: "#f3f3f4",
  muted: "#9a9aa4",
  faint: "#62626c",
  accent: "#38d9c0",
  accentHover: "#55e6d0",
  accentInk: "#04211c",
  tier: {
    S: "#ff5d5d",
    A: "#ff9f45",
    B: "#ffd447",
    C: "#7bd88f",
    D: "#5aa9e6",
    E: "#a07be0",
  } as Record<TierKey, string>,
};

export type TierKey = "S" | "A" | "B" | "C" | "D" | "E";
export const TIER_KEYS: TierKey[] = ["S", "A", "B", "C", "D", "E"];

// Display-ready view of the empire stats — one place computes the numbers so the
// image (server) and the tweet text (client, via props) never disagree.
export type CardStats = {
  hours: string; // formatted, e.g. "1,204h" — used in tweet text
  hoursNum: string; // hero number only, e.g. "1,204"
  hoursUnit: string; // "hrs" | "min"
  days: number;
  watched: number;
  total: number;
  episodes: number;
  watching: number;
  backlog: number;
  dropped: number;
  tierCounts: Record<TierKey, number>;
  sCount: number;
  aCount: number;
  topGenres: { name: string; count: number }[];
};

export function deriveCardStats(stats: EmpireStats): CardStats {
  const h = stats.totalHours;
  const hoursNum = h < 1 ? String(Math.round(h * 60)) : Math.round(h).toLocaleString();
  const hoursUnit = h < 1 ? "min" : "hrs";
  const tierCounts = Object.fromEntries(
    TIER_KEYS.map((t) => [t, stats.tiers[t] ?? 0]),
  ) as Record<TierKey, number>;

  return {
    hours: formatHours(h),
    hoursNum,
    hoursUnit,
    days: Math.round(h / 24),
    watched: stats.watchedCount,
    total: stats.total,
    episodes: stats.totalEpisodes,
    watching: stats.byStatus["watching"] ?? 0,
    backlog: stats.byStatus["watchlist"] ?? 0,
    dropped: stats.byStatus["dropped"] ?? 0,
    tierCounts,
    sCount: tierCounts.S,
    aCount: tierCounts.A,
    topGenres: stats.genres.slice(0, 5),
  };
}

// Shown for signed-out requests so the endpoint always renders a valid PNG
// (doubles as a generic OG image and lets the card be previewed without a login).
export const DEMO_STATS: CardStats = {
  hours: "1,204h",
  hoursNum: "1,204",
  hoursUnit: "hrs",
  days: 50,
  watched: 312,
  total: 480,
  episodes: 6420,
  watching: 7,
  backlog: 96,
  dropped: 14,
  tierCounts: { S: 12, A: 34, B: 58, C: 41, D: 19, E: 8 },
  sCount: 12,
  aCount: 34,
  topGenres: [
    { name: "Action", count: 88 },
    { name: "Drama", count: 61 },
    { name: "Comedy", count: 54 },
    { name: "Sci-Fi", count: 40 },
    { name: "Romance", count: 33 },
  ],
};

// The mascot is user-supplied art (see public/mascot/README.md). We scan for a
// handful of names/formats and return a data URI Satori can embed, or null so
// the card falls back to its designed empty-slot treatment. PNG/JPG decode most
// reliably in Satori; WebP is a last resort.
const MASCOT_CANDIDATES = [
  "momo.png",
  "momo.jpg",
  "momo.jpeg",
  "mascot.png",
  "mascot.jpg",
  "mascot.jpeg",
  "momo.webp",
  "mascot.webp",
];
const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function loadMascot(): Promise<string | null> {
  const dir = join(process.cwd(), "public", "mascot");
  let present: Set<string>;
  try {
    present = new Set(await readdir(dir));
  } catch {
    return null; // no mascot dir at all
  }
  const file = MASCOT_CANDIDATES.find((c) => present.has(c));
  if (!file) return null;
  try {
    const buf = await readFile(join(dir, file));
    const ext = file.split(".").pop()!.toLowerCase();
    return `data:${MIME[ext] ?? "image/png"};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
