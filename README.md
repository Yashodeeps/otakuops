# OtakuOps — Anime Command Center

Your personal anime empire. Paste a messy list, watch it get parsed and matched to real
cover art, swipe through the backlog to triage it, and see total hours sunk + what's airing next.

Built for an audience of one. Runs on free tiers.

## The loop

1. **Import** — paste a chaotic blob (rankings, statuses, bullets, commas). It's parsed
   (Claude if a key is set, a local heuristic otherwise) and each title is matched to
   [AniList](https://anilist.co). High-confidence matches auto-accept; only the ambiguous
   ones need a look.
2. **Swipe** — a Bumble-style deck over cover art. Flick right = watched, left = dropped,
   up = watchlist, down = watching (buttons cover half-finished + undo). Tap S/A/B/C/D to rank.
3. **Empire** — total hours (computed as episodes × runtime from AniList), shows watched,
   genre + status + tier breakdowns.
4. **Tiers** — your rankings on a board.
5. **Feed** — new episodes airing for shows in your collection.
6. **Ask** — a companion that knows your whole collection ("what should I watch next?").

## Run it locally

```bash
pnpm install
# put your Neon Postgres connection string in .env as DATABASE_URL
pnpm prisma db push     # creates the tables in your DB
pnpm dev                # http://localhost:3000
```

AniList is public and no Anthropic key is required (a local heuristic parser handles imports),
but the database is Postgres — grab a free Neon connection string and use it locally too.

### Env (`.env`)

```bash
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"  # Neon
# ANTHROPIC_API_KEY="sk-ant-..."  # enables the Claude parser + the Ask companion
# APP_PASSPHRASE="..."            # locks the app behind a shared passphrase (see below)
```

- **`ANTHROPIC_API_KEY`** — turns on the Claude-powered parser (Haiku 4.5, cheap) and the
  Ask companion (Opus 4.8). Everything else works without it.
- **`APP_PASSPHRASE`** — when set, every route requires this passphrase (stored in an
  httpOnly cookie via `/unlock`). Unset locally = open. **Always set it before deploying**,
  or your public URL lets anyone spend your Anthropic key.

## Deploy (Vercel + Neon, $0)

Already wired for Postgres. Steps:

1. **Neon** — create a free project at neon.tech, copy the connection string.
2. **Push schema** — put that string in `.env` as `DATABASE_URL`, run `pnpm prisma db push`.
3. **Vercel** — import the repo (or `vercel`), and set env vars:
   - `DATABASE_URL` — the Neon string (use the pooled `-pooler` host on Vercel)
   - `APP_PASSPHRASE` — **required**, or the public URL is open to anyone
   - `ANTHROPIC_API_KEY` — optional (Claude parser + Ask companion)
4. `prisma generate` runs automatically on install (`postinstall`); `next build` deploys.
5. Add to your phone's home screen — it's a PWA (`manifest.webmanifest` + icon).

## Architecture

- **Next.js 16** (App Router) + **Tailwind 4** + **framer-motion** (swipe physics).
- **Prisma 6 + Postgres** (Neon). Two tables: `Anime` (cached AniList metadata) and
  `CollectionItem` (your rows). Enums/genres are validated strings + JSON for portability.
- **`src/lib/`** is the brain:
  - `anilist.ts` — batched GraphQL (aliases for search, `id_in` for the feed) with 429 backoff.
  - `parse.ts` / `parseClaude.ts` / `parseAnime.ts` — heuristic + Claude parsers, one shape,
    graceful fallback.
  - `match.ts` / `similarity.ts` — confidence-gated AniList matching (auto-accept vs review).
  - `collection.ts` — the service layer; also the hours math (`episodesForStatus`, null-safe).
  - `feed.ts` — batched, cached airing refresh.
- **API routes** under `src/app/api/` sit behind `src/middleware.ts` (the passphrase lock).

## Notes / known follow-ups

- `middleware.ts` triggers a Next 16 "use proxy instead" deprecation notice; it still works.
- The feed refreshes on open (batched + cached). A daily cron + web push is the phase-2 upgrade.
- Design doc lives at `~/.gstack/projects/otakuops/…-design-….md`.
