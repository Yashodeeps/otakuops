// Service layer over the collection. One place for reads/writes so the swipe
// deck, dashboard, tier board, and feed all see the same source of truth.
import { prisma } from "./prisma";
import type { AniListMedia } from "./anilist";
import { fullEpisodeCount, itemHours, perEpisodeMinutes } from "./hours";
import type { Status, Tier } from "./enums";

// Cache-safe view of a collection row joined with its anime metadata.
export type CollectionRow = {
  id: string;
  animeId: number | null;
  title: string;
  coverImage: string | null;
  bannerImage: string | null;
  episodes: number | null;
  duration: number | null;
  format: string | null;
  genres: string[];
  averageScore: number | null;
  siteUrl: string | null;
  seasonYear: number | null;
  nextAiringAt: number | null;
  nextAiringEp: number | null;
  status: Status;
  tier: Tier;
  episodesWatched: number;
  personalRank: number | null;
  hours: number;
  sourceRawName: string | null;
  updatedAt: string;
};

// How many episodes a given status implies. Watched => the whole show, so the
// hours stat is never silently zero. Half-finished => a sensible midpoint the
// user can nudge. Others contribute nothing.
export function episodesForStatus(
  status: Status,
  anime: { episodes: number | null; nextAiringEp: number | null; format: string | null } | null,
): number {
  if (!anime) return 0;
  const full = fullEpisodeCount(anime);
  switch (status) {
    case "watched":
      return full;
    case "half_finished":
      return Math.max(1, Math.floor(full / 2));
    default:
      return 0;
  }
}

function toMediaMetadata(m: AniListMedia) {
  return {
    id: m.id,
    title: m.title,
    titleRomaji: m.titleRomaji,
    titleEnglish: m.titleEnglish,
    titleNative: m.titleNative,
    coverImage: m.coverImage,
    bannerImage: m.bannerImage,
    episodes: m.episodes,
    duration: m.duration,
    format: m.format,
    airingStatus: m.airingStatus,
    genresJson: JSON.stringify(m.genres ?? []),
    seasonYear: m.seasonYear,
    averageScore: m.averageScore,
    siteUrl: m.siteUrl,
    nextAiringAt: m.nextAiringAt,
    nextAiringEp: m.nextAiringEp,
    lastRefreshedAt: new Date(),
  };
}

/** Cache AniList metadata (insert or refresh). */
export async function upsertAnime(m: AniListMedia) {
  const data = toMediaMetadata(m);
  return prisma.anime.upsert({ where: { id: m.id }, create: data, update: data });
}

export type ImportItem = {
  media: AniListMedia | null; // null => manual stub
  manualTitle?: string;
  status: Status;
  tier: Tier;
  sourceRawName?: string;
};

/** Commit reviewed import items into a user's collection. Idempotent per (user, anime). */
export async function importItems(userId: string, items: ImportItem[]): Promise<number> {
  let count = 0;
  for (const item of items) {
    if (item.media) {
      await upsertAnime(item.media);
      const episodesWatched = episodesForStatus(item.status, item.media);
      await prisma.collectionItem.upsert({
        where: { userId_animeId: { userId, animeId: item.media.id } },
        create: {
          userId,
          animeId: item.media.id,
          status: item.status,
          tier: item.tier,
          episodesWatched,
          sourceRawName: item.sourceRawName ?? null,
        },
        update: {
          status: item.status,
          tier: item.tier,
          episodesWatched,
          sourceRawName: item.sourceRawName ?? undefined,
        },
      });
    } else if (item.manualTitle) {
      await prisma.collectionItem.create({
        data: {
          userId,
          manualTitle: item.manualTitle,
          status: item.status,
          tier: item.tier,
          sourceRawName: item.sourceRawName ?? null,
        },
      });
    }
    count++;
  }
  return count;
}

/** Add a single discovered (popular) anime to the collection and return the row.
 *  Used by the swipe deck when you swipe a discovery card. */
export async function addAnime(
  userId: string,
  media: AniListMedia,
  status: Status,
  tier: Tier,
): Promise<CollectionRow> {
  await upsertAnime(media);
  const episodesWatched = episodesForStatus(status, media);
  const row = await prisma.collectionItem.upsert({
    where: { userId_animeId: { userId, animeId: media.id } },
    create: { userId, animeId: media.id, status, tier, episodesWatched },
    update: { status, tier, episodesWatched },
    include: { anime: true },
  });
  return toRow(row);
}

type RowWithAnime = {
  id: string;
  animeId: number | null;
  manualTitle: string | null;
  status: string;
  tier: string;
  episodesWatched: number;
  personalRank: number | null;
  sourceRawName: string | null;
  updatedAt: Date;
  anime: {
    title: string;
    coverImage: string | null;
    bannerImage: string | null;
    episodes: number | null;
    duration: number | null;
    format: string | null;
    genresJson: string;
    averageScore: number | null;
    siteUrl: string | null;
    seasonYear: number | null;
    nextAiringAt: number | null;
    nextAiringEp: number | null;
  } | null;
};

function toRow(r: RowWithAnime): CollectionRow {
  const hours = r.anime
    ? itemHours(r.episodesWatched, { duration: r.anime.duration, format: r.anime.format })
    : 0;
  return {
    id: r.id,
    animeId: r.animeId,
    title: r.anime?.title ?? r.manualTitle ?? "Untitled",
    coverImage: r.anime?.coverImage ?? null,
    bannerImage: r.anime?.bannerImage ?? null,
    episodes: r.anime?.episodes ?? null,
    duration: r.anime?.duration ?? null,
    format: r.anime?.format ?? null,
    genres: r.anime ? (JSON.parse(r.anime.genresJson) as string[]) : [],
    averageScore: r.anime?.averageScore ?? null,
    siteUrl: r.anime?.siteUrl ?? null,
    seasonYear: r.anime?.seasonYear ?? null,
    nextAiringAt: r.anime?.nextAiringAt ?? null,
    nextAiringEp: r.anime?.nextAiringEp ?? null,
    status: r.status as Status,
    tier: r.tier as Tier,
    episodesWatched: r.episodesWatched,
    personalRank: r.personalRank,
    hours,
    sourceRawName: r.sourceRawName,
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function getCollection(
  userId: string,
  filter?: { status?: Status },
): Promise<CollectionRow[]> {
  const rows = await prisma.collectionItem.findMany({
    where: { userId, ...(filter?.status ? { status: filter.status } : {}) },
    include: { anime: true },
    orderBy: [{ tier: "asc" }, { personalRank: "asc" }, { updatedAt: "desc" }],
  });
  return rows.map(toRow);
}

export async function getItem(userId: string, id: string): Promise<CollectionRow | null> {
  const r = await prisma.collectionItem.findFirst({
    where: { id, userId },
    include: { anime: true },
  });
  return r ? toRow(r) : null;
}

export type ItemUpdate = {
  status?: Status;
  tier?: Tier;
  episodesWatched?: number;
  personalRank?: number | null;
};

/** Update one of the user's items. Changing status recomputes episodesWatched
 *  (unless the caller explicitly passed one, e.g. the half-finished stepper). */
export async function updateItem(
  userId: string,
  id: string,
  update: ItemUpdate,
): Promise<CollectionRow | null> {
  const existing = await prisma.collectionItem.findFirst({
    where: { id, userId },
    include: { anime: true },
  });
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (update.tier !== undefined) data.tier = update.tier;
  if (update.personalRank !== undefined) data.personalRank = update.personalRank;

  if (update.status !== undefined) {
    data.status = update.status;
    // recompute unless the caller set episodesWatched explicitly
    if (update.episodesWatched === undefined) {
      data.episodesWatched = episodesForStatus(update.status, existing.anime);
    }
  }
  if (update.episodesWatched !== undefined) data.episodesWatched = update.episodesWatched;

  const updated = await prisma.collectionItem.update({
    where: { id },
    data,
    include: { anime: true },
  });
  return toRow(updated);
}

export async function deleteItem(userId: string, id: string): Promise<void> {
  await prisma.collectionItem.deleteMany({ where: { id, userId } });
}

// Aggregate stats for the empire dashboard.
export type EmpireStats = {
  total: number;
  byStatus: Record<string, number>;
  watchedCount: number;
  totalHours: number;
  totalEpisodes: number;
  genres: { name: string; count: number }[];
  tiers: Record<string, number>;
};

export async function getStats(userId: string): Promise<EmpireStats> {
  const rows = await getCollection(userId);
  const byStatus: Record<string, number> = {};
  const tiers: Record<string, number> = {};
  const genreCount = new Map<string, number>();
  let totalHours = 0;
  let totalEpisodes = 0;
  let watchedCount = 0;

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    tiers[r.tier] = (tiers[r.tier] ?? 0) + 1;
    totalHours += r.hours;
    totalEpisodes += r.episodesWatched;
    if (r.status === "watched") watchedCount++;
    if (r.status === "watched" || r.status === "half_finished") {
      for (const g of r.genres) genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
    }
  }

  const genres = [...genreCount.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    total: rows.length,
    byStatus,
    watchedCount,
    totalHours,
    totalEpisodes,
    genres,
    tiers,
  };
}

export { perEpisodeMinutes };
