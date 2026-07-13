// Hours-watched math. AniList's `episodes` and `duration` are frequently null
// (ongoing shows, movies, shorts), so everything here null-coalesces with
// format-aware defaults. It's a confident estimate, not a stopwatch.

type DurationLike = { duration: number | null; format: string | null };
type EpisodesLike = { episodes: number | null; nextAiringEp: number | null; format: string | null };

export function perEpisodeMinutes(a: DurationLike): number {
  if (a.duration && a.duration > 0) return a.duration;
  switch (a.format) {
    case "MOVIE":
      return 100;
    case "MUSIC":
      return 5;
    case "TV_SHORT":
      return 8;
    case "OVA":
    case "ONA":
    case "SPECIAL":
      return 24;
    case "TV":
    default:
      return 24;
  }
}

// How many episodes a "watched" show should count as.
export function fullEpisodeCount(a: EpisodesLike): number {
  if (a.episodes && a.episodes > 0) return a.episodes;
  if (a.nextAiringEp && a.nextAiringEp > 1) return a.nextAiringEp - 1; // ongoing: aired so far
  if (a.format === "MOVIE") return 1;
  return 12; // reasonable cour-length fallback
}

export function itemHours(episodesWatched: number, a: DurationLike): number {
  return (episodesWatched * perEpisodeMinutes(a)) / 60;
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 100) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours).toLocaleString()}h`;
}
