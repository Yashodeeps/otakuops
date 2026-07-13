// AniList GraphQL client. Public API, no auth needed.
// Rate limit is ~90 req/min (has run degraded at ~30). We batch aggressively with
// GraphQL aliases and back off on 429.

const ENDPOINT = "https://graphql.anilist.co";

export type AniListMedia = {
  id: number;
  title: string; // chosen display title
  titleRomaji: string | null;
  titleEnglish: string | null;
  titleNative: string | null;
  synonyms: string[];
  coverImage: string | null;
  bannerImage: string | null;
  episodes: number | null;
  duration: number | null;
  format: string | null;
  airingStatus: string | null;
  genres: string[];
  seasonYear: number | null;
  averageScore: number | null;
  siteUrl: string | null;
  nextAiringAt: number | null;
  nextAiringEp: number | null;
};

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  synonyms
  coverImage { large extraLarge color }
  bannerImage
  episodes
  duration
  format
  status
  genres
  seasonYear
  averageScore
  siteUrl
  nextAiringEpisode { airingAt episode }
`;

type RawMedia = {
  id: number;
  title: { romaji: string | null; english: string | null; native: string | null };
  synonyms: string[] | null;
  coverImage: { large: string | null; extraLarge: string | null; color: string | null } | null;
  bannerImage: string | null;
  episodes: number | null;
  duration: number | null;
  format: string | null;
  status: string | null;
  genres: string[] | null;
  seasonYear: number | null;
  averageScore: number | null;
  siteUrl: string | null;
  nextAiringEpisode: { airingAt: number; episode: number } | null;
};

function normalize(m: RawMedia): AniListMedia {
  return {
    id: m.id,
    title: m.title.english ?? m.title.romaji ?? m.title.native ?? `#${m.id}`,
    titleRomaji: m.title.romaji,
    titleEnglish: m.title.english,
    titleNative: m.title.native,
    synonyms: m.synonyms ?? [],
    coverImage: m.coverImage?.extraLarge ?? m.coverImage?.large ?? null,
    bannerImage: m.bannerImage,
    episodes: m.episodes,
    duration: m.duration,
    format: m.format,
    airingStatus: m.status,
    genres: m.genres ?? [],
    seasonYear: m.seasonYear,
    averageScore: m.averageScore,
    siteUrl: m.siteUrl,
    nextAiringAt: m.nextAiringEpisode?.airingAt ?? null,
    nextAiringEp: m.nextAiringEpisode?.episode ?? null,
  };
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
    });

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? "2");
      await sleep((retryAfter + 1) * 1000);
      continue;
    }
    if (!res.ok) {
      throw new Error(`AniList ${res.status}: ${await res.text().catch(() => "")}`);
    }
    const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (json.errors?.length) throw new Error(`AniList: ${json.errors[0].message}`);
    return json.data as T;
  }
  throw new Error("AniList: rate limited after retries");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const BATCH = 8; // aliases per request

/**
 * Search AniList for many titles at once. Returns, for each input name (in order),
 * up to `perName` candidate media. Batched with GraphQL aliases to save requests.
 */
export async function searchBatch(
  names: string[],
  perName = 6,
): Promise<AniListMedia[][]> {
  const out: AniListMedia[][] = [];
  for (let i = 0; i < names.length; i += BATCH) {
    const chunk = names.slice(i, i + BATCH);
    const varDefs = chunk.map((_, j) => `$s${j}: String`).join(", ");
    const body = chunk
      .map(
        (_, j) =>
          `a${j}: Page(perPage: ${perName}) { media(search: $s${j}, type: ANIME, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} } }`,
      )
      .join("\n");
    const query = `query (${varDefs}) {\n${body}\n}`;
    const variables: Record<string, string> = {};
    chunk.forEach((name, j) => (variables[`s${j}`] = name));

    const data = await gql<Record<string, { media: RawMedia[] }>>(query, variables);
    chunk.forEach((_, j) => {
      const page = data[`a${j}`];
      out.push((page?.media ?? []).map(normalize));
    });
    if (i + BATCH < names.length) await sleep(700); // be polite between requests
  }
  return out;
}

/** Fetch fresh metadata (incl. next airing) for a set of AniList ids, batched. */
export async function fetchByIds(ids: number[]): Promise<AniListMedia[]> {
  const out: AniListMedia[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const query = `query ($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids, type: ANIME) { ${MEDIA_FIELDS} } } }`;
    const data = await gql<{ Page: { media: RawMedia[] } }>(query, { ids: chunk });
    out.push(...(data.Page?.media ?? []).map(normalize));
    if (i + 50 < ids.length) await sleep(700);
  }
  return out;
}
