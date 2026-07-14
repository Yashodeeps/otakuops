// Turns a messy pasted blob into structured entries. Two implementations share
// this shape: the local heuristic (below) and the Claude parser (src/lib/parseClaude.ts).
import type { Status, Tier } from "./enums";

export type ParsedEntry = {
  rawName: string; // original text for this entry
  cleanName: string; // best-guess title to search AniList with
  tier: Tier; // ranking hint; "unranked" when none detected
  status: Status; // watch-status hint; "untriaged" when none detected
};

const STATUS_PATTERNS: { re: RegExp; status: Status }[] = [
  { re: /\b(watching|currently watching|in progress)\b/i, status: "watching" },
  { re: /\b(completed|watched|finished|rewatched?|seen|done)\b/i, status: "watched" },
  { re: /\b(dropped|dnf|abandoned|quit)\b/i, status: "dropped" },
  {
    re: /\b(on[-\s]?hold|paused|half[-\s]?finished|halfway|midway|stalled)\b/i,
    status: "half_finished",
  },
  {
    re: /\b(plan(?:ned|ning)?\s*to\s*watch|ptw|to[-\s]?watch|want\s*to\s*watch|backlog|wishlist|watch\s*list|queue)\b/i,
    status: "watchlist",
  },
];

function scoreToTier(n: number, outOf: number): Tier {
  const s = outOf === 100 ? n / 10 : n; // normalize to /10
  if (s >= 9) return "S";
  if (s >= 8) return "A";
  if (s >= 7) return "B";
  if (s >= 6) return "C";
  if (s >= 5) return "D";
  return "E";
}

// Is this line ONLY a tier label? e.g. "S Tier", "Tier A", "S:", "E -"
function headerTier(line: string): Tier | null {
  const t = line.trim().replace(/[:\-–—]+$/, "").trim();
  const m = t.match(/^tier\s*([sabcde])$/i) || t.match(/^([sabcde])\s*[- ]?\s*tier$/i);
  if (m) return m[1].toUpperCase() as Tier;
  if (/^([sabcde])$/i.test(t)) return t.toUpperCase() as Tier;
  return null;
}

// Is this line ONLY a status label? e.g. "Watching", "Completed:", "Plan to Watch"
function headerStatus(line: string): Status | null {
  const t = line.trim().replace(/[:\-–—]+$/, "").trim();
  if (t.split(/\s+/).length > 4) return null; // too wordy to be a header
  for (const { re, status } of STATUS_PATTERNS) {
    // header must be essentially just the keyword (allow small filler)
    if (re.test(t) && t.replace(re, "").replace(/[^a-z]/gi, "").length <= 3) return status;
  }
  return null;
}

// Pull inline hints out of a single entry, return the cleaned name + hints.
function extractInline(text: string): { name: string; tier: Tier | null; status: Status | null } {
  let s = text.trim();
  let tier: Tier | null = null;
  let status: Status | null = null;

  // strip leading bullets / numbering
  s = s.replace(/^\s*(?:[-*•·]|\d+[.)]|#\d+)\s*/, "");

  // score like 9/10 or 85/100
  const scoreMatch = s.match(/(\d{1,3})\s*\/\s*(10|100)\b/);
  if (scoreMatch) {
    tier = scoreToTier(Number(scoreMatch[1]), Number(scoreMatch[2]));
    s = s.replace(scoreMatch[0], " ");
  } else {
    // trailing bare number/decimal e.g. "Naruto - 8.5" or "Naruto 9"
    const bare = s.match(/[-–—(]\s*(\d{1,2}(?:\.\d)?)\s*\)?\s*$/);
    if (bare) {
      tier = scoreToTier(Number(bare[1]), 10);
      s = s.replace(bare[0], " ");
    }
  }

  // inline tier token like "(S)" or "[A]" or " - S tier"
  const tierTok = s.match(/[([\-–—]\s*([sabcde])\s*(?:tier)?\s*[)\]]?\s*$/i);
  if (tierTok && !tier) {
    tier = tierTok[1].toUpperCase() as Tier;
    s = s.replace(tierTok[0], " ");
  }

  // inline status keyword anywhere
  for (const { re, status: st } of STATUS_PATTERNS) {
    if (re.test(s)) {
      status = st;
      s = s.replace(re, " ");
      break;
    }
  }

  // clean leftover separators/parens
  s = s.replace(/\(\s*\)|\[\s*\]/g, " ").replace(/[|;:]+/g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/^[-–—\s]+|[-–—\s]+$/g, "").trim();

  return { name: s, tier, status };
}

export function heuristicParse(text: string): ParsedEntry[] {
  const rawLines = text.split(/\r?\n/);
  const entries: ParsedEntry[] = [];
  let ctxTier: Tier | null = null;
  let ctxStatus: Status | null = null;

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Pure header lines start a new section. A tier header ("S Tier") and a
    // status header ("Watching:") are different section kinds — hitting one
    // clears the other's context so an early "S tier" doesn't leak into a later
    // "Plan to watch" block.
    const ht = headerTier(line);
    if (ht) {
      ctxTier = ht;
      ctxStatus = null;
      continue;
    }
    const hs = headerStatus(line);
    if (hs) {
      ctxStatus = hs;
      ctxTier = null;
      continue;
    }

    // a "Label: a, b, c" prefix applies to everything after the colon on this line
    let body = line;
    let lineTier: Tier | null = null;
    let lineStatus: Status | null = null;
    const colon = line.indexOf(":");
    if (colon > 0 && colon < 24) {
      const label = line.slice(0, colon);
      const lt = headerTier(label);
      const ls = headerStatus(label);
      if (lt || ls) {
        lineTier = lt;
        lineStatus = ls;
        body = line.slice(colon + 1).trim();
      }
    }

    // split comma-lists into separate entries (only when it clearly is a list)
    const pieces =
      body.includes(",") && body.split(",").length > 1 && !/\d\/\d/.test(body)
        ? body.split(",")
        : [body];

    for (const piece of pieces) {
      const p = piece.trim();
      if (!p) continue;
      const { name, tier, status } = extractInline(p);
      if (!name) continue;
      entries.push({
        rawName: p,
        cleanName: name,
        tier: tier ?? lineTier ?? ctxTier ?? "unranked",
        status: status ?? lineStatus ?? ctxStatus ?? "untriaged",
      });
    }
  }

  return entries;
}
