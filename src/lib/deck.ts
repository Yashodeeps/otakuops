// The swipe deck feed. Leads with the user's own untriaged imports, then serves
// popular anime for discovery (excluding anything already in their collection),
// so a brand-new user with an empty list can build one entirely by swiping.
import { prisma } from "./prisma";
import { fetchPopular, type AniListMedia } from "./anilist";
import { getCollection } from "./collection";
import type { Tier } from "./enums";

export type DeckCard = {
  kind: "collection" | "discover";
  itemId: string | null; // collection item id (for PATCH on swipe)
  animeId: number | null;
  media: AniListMedia | null; // present for discover cards (to add on swipe)
  title: string;
  coverImage: string | null;
  episodes: number | null;
  duration: number | null;
  format: string | null;
  genres: string[];
  averageScore: number | null;
  seasonYear: number | null;
  siteUrl: string | null;
  tier: Tier;
};

export async function getDeck(
  userId: string,
  page: number,
): Promise<{ cards: DeckCard[]; nextPage: number }> {
  // anime already in the collection (any status) — never show these as discovery
  const owned = await prisma.collectionItem.findMany({
    where: { userId, animeId: { not: null } },
    select: { animeId: true },
  });
  const ownedIds = owned.map((o) => o.animeId as number);

  const cards: DeckCard[] = [];

  // page 1 leads with the user's own untriaged imports (their list first)
  if (page <= 1) {
    const untriaged = await getCollection(userId, { status: "untriaged" });
    for (const r of untriaged) {
      cards.push({
        kind: "collection",
        itemId: r.id,
        animeId: r.animeId,
        media: null,
        title: r.title,
        coverImage: r.coverImage,
        episodes: r.episodes,
        duration: r.duration,
        format: r.format,
        genres: r.genres,
        averageScore: r.averageScore,
        seasonYear: r.seasonYear,
        siteUrl: r.siteUrl,
        tier: r.tier,
      });
    }
  }

  // then popular discovery
  const popular = await fetchPopular({ excludeIds: ownedIds, page, perPage: 20 });
  for (const m of popular) {
    cards.push({
      kind: "discover",
      itemId: null,
      animeId: m.id,
      media: m,
      title: m.title,
      coverImage: m.coverImage,
      episodes: m.episodes,
      duration: m.duration,
      format: m.format,
      genres: m.genres,
      averageScore: m.averageScore,
      seasonYear: m.seasonYear,
      siteUrl: m.siteUrl,
      tier: "unranked",
    });
  }

  return { cards, nextPage: page + 1 };
}
