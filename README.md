# OtakuOps — Anime Command Center

Your personal anime empire. Paste a messy list, watch it get parsed and matched to real
cover art, swipe through the backlog to triage it, and see total hours sunk + what's airing next.

Multi-user (sign in with Google or X), each with their own private empire. Runs on free tiers.

## The loop

1. **Import** — paste a chaotic blob (rankings, statuses, bullets, commas). It's parsed
   (Grok if a key is set, a local heuristic otherwise) and each title is matched to
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

AniList is public and no AI key is required (a local heuristic parser handles imports),
but the database is Postgres — grab a free Neon connection string and use it locally too.

### Env (`.env`)

```bash
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"  # Neon
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."   # Clerk (auth)
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
# XAI_API_KEY="xai-..."   # enables the Grok parser + the Ask companion
# XAI_MODEL="grok-3"      # optional model override
```

- **Clerk** — auth (Google sign-in; X can be added later). Create a free app at clerk.com,
  enable the Google social connection, copy the keys. Every route is private per user; data
  is scoped to the signed-in `userId`.
- **`XAI_API_KEY`** — turns on the Grok-powered parser and the Ask companion (xAI, key from
  console.x.ai). Everything else works without it; the parser falls back to a local heuristic.

## Deploy (Vercel + Neon + Clerk, $0)

Already wired for Postgres + Clerk. Steps:

1. **Neon** — create a free project at neon.tech, copy the connection string.
2. **Clerk** — create an app at clerk.com, enable Google + X, copy the two keys.
3. **Push schema** — put the Neon string in `.env` as `DATABASE_URL`, run `pnpm prisma db push`.
4. **Vercel** — import the repo (or `vercel`), and set env vars:
   - `DATABASE_URL` — the Neon string (use the pooled `-pooler` host on Vercel)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — from Clerk
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
   - `XAI_API_KEY` — optional (Grok parser + Ask companion)
5. `prisma generate` runs automatically on install (`postinstall`); `next build` deploys.
6. Add to your phone's home screen — it's a PWA (`manifest.webmanifest` + icon).

## Architecture

- **Next.js 16** (App Router) + **Tailwind 4** + **framer-motion** (swipe physics).
- **Clerk** for auth (Google + X). Everything is private per user; the Clerk `userId` scopes
  every collection row. `src/middleware.ts` is `clerkMiddleware`.
- **Prisma 6 + Postgres** (Neon). Two tables: `Anime` (shared AniList metadata cache) and
  `CollectionItem` (per-user rows, `@@unique([userId, animeId])`). Enums/genres are validated
  strings + JSON for portability.
- **`src/lib/`** is the brain:
  - `anilist.ts` — batched GraphQL (aliases for search, `id_in` for the feed) with 429 backoff.
  - `parse.ts` / `parseGrok.ts` / `parseAnime.ts` — heuristic + Grok (xAI) parsers, one shape,
    graceful fallback. `xai.ts` is the shared Grok client.
  - `match.ts` / `similarity.ts` — confidence-gated AniList matching (auto-accept vs review).
  - `collection.ts` — the service layer; also the hours math (`episodesForStatus`, null-safe).
  - `feed.ts` — batched, cached airing refresh.
- **API routes** under `src/app/api/` are auth-gated: each reads `auth()` for the `userId`
  and scopes its query. A **Share to X** button (`src/components/ShareToX.tsx`) opens a
  pre-filled tweet — no Twitter API.

## Notes / known follow-ups

- `middleware.ts` triggers a Next 16 "use proxy instead" deprecation notice; it still works.
- The feed refreshes on open (batched + cached). A daily cron + web push is the phase-2 upgrade.
- Design doc lives at `~/.gstack/projects/otakuops/…-design-….md`.
