// Click-history ranking signal for personalized search.
//
// No raw clicks are logged yet (there's no search UI to click in), so the signal
// is derived from the interaction history we already have - the user's
// collection. The genres of shows a user has engaged with become affinity
// weights the Ranking layer folds into a relevance score. A future search route
// composes this with the existing data layer:
//   clickSignal(await getCollection(userId))
//
// ponytail: proxy signal (collection interactions, not raw clicks); upgrade to a
//   ClickEvent table fed by the results UI when search ships - same output shape.
import type { Status } from "./enums";

// genre -> affinity weight in [0,1]
export type ClickSignal = Record<string, number>;

// How strongly each interaction implies engagement. Finished/active count fully;
// a watchlist entry is weak; a dropped show is near-noise.
const ENGAGEMENT: Partial<Record<Status, number>> = {
  watched: 1,
  watching: 1,
  half_finished: 0.6,
  watchlist: 0.4,
  dropped: 0.1,
};

/** Genre affinity from a user's collection, normalized so the top genre = 1. */
export function clickSignal(rows: { genres: string[]; status: Status }[]): ClickSignal {
  const raw: Record<string, number> = {};
  let max = 0;
  for (const r of rows) {
    const w = ENGAGEMENT[r.status] ?? 0;
    if (!w) continue;
    for (const g of r.genres) {
      raw[g] = (raw[g] ?? 0) + w;
      if (raw[g] > max) max = raw[g];
    }
  }
  if (max === 0) return {};
  const out: ClickSignal = {};
  for (const g in raw) out[g] = raw[g] / max;
  return out;
}

/** Per-candidate boost in [0,1]: mean affinity of its genres. A ranker adds a
 *  fraction of this to base relevance to personalize result order. */
export function personalBoost(signal: ClickSignal, candidateGenres: string[]): number {
  if (!candidateGenres.length) return 0;
  let sum = 0;
  for (const g of candidateGenres) sum += signal[g] ?? 0;
  return sum / candidateGenres.length;
}
