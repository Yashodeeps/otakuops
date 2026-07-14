// Source of truth for the enum-like string fields. SQLite can't enforce these,
// so validation lives here and is applied at the API boundary with zod.

export const STATUSES = [
  "untriaged",
  "watched",
  "watching",
  "half_finished",
  "watchlist",
  "dropped",
] as const;
export type Status = (typeof STATUSES)[number];

export const TIERS = ["S", "A", "B", "C", "D", "E", "unranked"] as const;
export type Tier = (typeof TIERS)[number];

// Statuses whose watched-time counts toward total hours.
export const HOURS_STATUSES: Status[] = ["watched", "half_finished"];

// Status is conveyed by icon + label (see components/statusIcon.tsx); color is
// reserved for tiers only, so the color system reads cleanly: hue = ranking.
export const STATUS_META: Record<Status, { label: string }> = {
  untriaged: { label: "Untriaged" },
  watched: { label: "Watched" },
  watching: { label: "Watching" },
  half_finished: { label: "Half-finished" },
  watchlist: { label: "Watchlist" },
  dropped: { label: "Dropped" },
};

// Refined S–D ramp — the one place real color lives. Kept in sync with the
// --tier-* CSS variables in globals.css.
export const TIER_META: Record<Tier, { label: string; color: string }> = {
  S: { label: "S", color: "#ff5d5d" },
  A: { label: "A", color: "#ff9f45" },
  B: { label: "B", color: "#ffd447" },
  C: { label: "C", color: "#7bd88f" },
  D: { label: "D", color: "#5aa9e6" },
  E: { label: "E", color: "#a07be0" },
  unranked: { label: "—", color: "#62626c" },
};

export function isStatus(v: unknown): v is Status {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}
export function isTier(v: unknown): v is Tier {
  return typeof v === "string" && (TIERS as readonly string[]).includes(v);
}
