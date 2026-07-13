// The living feed: what's airing next from shows in your collection.
// Refresh-on-open, but batched + cached — one paginated AniList query covers
// many titles, and we only refresh rows older than the staleness window, so we
// never fan out one request per title (which would blow the rate limit).
import { prisma } from "./prisma";
import { fetchByIds } from "./anilist";
import { upsertAnime } from "./collection";

const STALE_MS = 1000 * 60 * 60 * 6; // refresh a title at most every 6h

export type FeedItem = {
  animeId: number;
  title: string;
  coverImage: string | null;
  episode: number | null;
  airingAt: number | null; // unix seconds
  airsInHours: number | null;
  siteUrl: string | null;
  status: string; // your watch status for this show
};

export async function getFeed(): Promise<{ items: FeedItem[]; refreshed: number }> {
  const rows = await prisma.collectionItem.findMany({
    where: { animeId: { not: null } },
    include: { anime: true },
  });

  // Refresh stale anime in one batched call (not one-per-title).
  const now = Date.now();
  const staleIds = rows
    .filter((r) => r.anime && now - r.anime.lastRefreshedAt.getTime() > STALE_MS)
    .map((r) => r.animeId!)
    .filter((v, i, a) => a.indexOf(v) === i);

  let refreshed = 0;
  if (staleIds.length) {
    try {
      const fresh = await fetchByIds(staleIds);
      for (const m of fresh) await upsertAnime(m);
      refreshed = fresh.length;
    } catch (err) {
      console.error("feed refresh failed:", err);
    }
  }

  // Re-read so we reflect any refresh, then build the feed from cached fields.
  const fresh = await prisma.collectionItem.findMany({
    where: { animeId: { not: null } },
    include: { anime: true },
  });

  const nowSec = Math.floor(now / 1000);
  const items: FeedItem[] = fresh
    .filter((r) => r.anime?.nextAiringAt)
    .map((r) => ({
      animeId: r.animeId!,
      title: r.anime!.title,
      coverImage: r.anime!.coverImage,
      episode: r.anime!.nextAiringEp,
      airingAt: r.anime!.nextAiringAt,
      airsInHours: r.anime!.nextAiringAt
        ? Math.round(((r.anime!.nextAiringAt - nowSec) / 3600) * 10) / 10
        : null,
      siteUrl: r.anime!.siteUrl,
      status: r.status,
    }))
    .sort((a, b) => (a.airingAt ?? Infinity) - (b.airingAt ?? Infinity));

  return { items, refreshed };
}
