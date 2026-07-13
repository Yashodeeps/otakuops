// Resolve parsed names to real AniList entries with a confidence gate.
// High-confidence, clearly-ahead matches auto-accept; everything else goes to
// the review queue so you only hand-check the ambiguous minority, not all 200.
import { searchBatch, type AniListMedia } from "./anilist";
import { bestTitleScore, AUTO_ACCEPT, MARGIN, NEAR_EXACT } from "./similarity";
import type { ParsedEntry } from "./parse";

export type MatchCandidate = AniListMedia & { score: number };

export type MatchedEntry = {
  parsed: ParsedEntry;
  candidates: MatchCandidate[]; // top few, sorted by score desc
  autoAccept: boolean; // confident single match
  bestId: number | null; // top candidate's AniList id, or null if no matches
};

function titlesOf(m: AniListMedia): (string | null)[] {
  return [m.titleRomaji, m.titleEnglish, m.titleNative, ...m.synonyms];
}

export async function matchEntries(entries: ParsedEntry[]): Promise<MatchedEntry[]> {
  const results = await searchBatch(entries.map((e) => e.cleanName));

  return entries.map((parsed, i) => {
    const scored: MatchCandidate[] = (results[i] ?? [])
      .map((m) => ({ ...m, score: bestTitleScore(parsed.cleanName, titlesOf(m)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const top = scored[0];
    const second = scored[1];
    const autoAccept =
      !!top &&
      // near-perfect title match auto-accepts even if a sequel scores close;
      // otherwise require a good score that clearly beats the runner-up.
      (top.score >= NEAR_EXACT ||
        (top.score >= AUTO_ACCEPT && (!second || top.score - second.score >= MARGIN)));

    return {
      parsed,
      candidates: scored,
      autoAccept,
      bestId: top?.id ?? null,
    };
  });
}
