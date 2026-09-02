# OtakuOps — Anime Command Center

Your personal anime empire. Paste a messy list, watch it get parsed and matched to real
cover art, swipe through the backlog to triage it, and see total hours sunk + what's airing next.

Multi-user (sign in with Google or X), each with their own private empire. Runs on free tiers.

Using the app? Start with [The loop](#the-loop). Building or self-hosting? Jump to the
[Developer guide](#developer-guide).

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

## Share your empire

From the Empire dashboard, hit **Share** to turn your stats into a polished card image.
Five variants to pick from:

- **The Empire** — watched · hours logged · total tracked
- **Watch Hours** — hours sunk, converted to days of your life
- **Collection** — everything tracked, ranked and triaged
- **S-Tier Taste** — how many shows earned your top tier
- **Anime DNA** — your top genres

X can't attach an image to a pre-filled post, so the flow is: **copy the card to your clipboard
and open the composer prefilled → paste to attach.** Downloading the PNG is the always-works
fallback. (Self-hosting? You can drop in your own mascot art — see
[Mascot art for the share cards](#mascot-art-for-the-share-cards).)

## Signing in

Auth is via **Google** sign-in (X can be enabled by the operator). Every route is private to
you — your collection is scoped to your account and never shared with other users.

## Install to your phone

OtakuOps is a PWA. Open it in your mobile browser and **Add to Home Screen** for a full-screen,
app-like experience.

---

# Developer guide

Everything you need to run, understand, and deploy OtakuOps.

> **Note on Next.js:** this project runs **Next.js 16** (App Router). APIs and conventions differ
> from older majors — check `node_modules/next/dist/docs/` and heed deprecation notices before
> writing framework code.

## Run it locally

```bash
pnpm install
# put your Neon Postgres connection string in .env as DATABASE_URL
pnpm db:push            # prisma db push — creates the tables in your DB
pnpm dev                # http://localhost:3000
```

AniList is public and **no AI key is required** (a local heuristic parser handles imports), but
the database is Postgres — grab a free [Neon](https://neon.tech) connection string and use it
locally too. `prisma generate` runs automatically on install via the `postinstall` script.

### Scripts

| Command          | What it does                                    |
| ---------------- | ----------------------------------------------- |
| `pnpm dev`       | Next dev server on :3000                        |
| `pnpm build`     | Production build                                |
| `pnpm start`     | Serve the production build                      |
| `pnpm lint`      | ESLint                                          |
| `pnpm db:push`   | `prisma db push` — sync schema to the database  |

### Env (`.env`)

```bash
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"  # Neon
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."   # Clerk (auth)
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
# XAI_API_KEY="xai-..."   # enables the Grok parser + the Ask companion
# XAI_MODEL="grok-4.5"    # optional: Ask companion model override
# XAI_PARSE_MODEL="..."   # optional: import parser model override
```

- **Clerk** — auth (Google sign-in; X can be added later). Create a free app at
  [clerk.com](https://clerk.com), enable the Google social connection, copy the keys. Every route
  is private per user; data is scoped to the signed-in `userId`.
- **`XAI_API_KEY`** — turns on the Grok-powered parser and the Ask companion (xAI, key from
  [console.x.ai](https://console.x.ai)). Everything else works without it; the parser falls back
  to a local heuristic. The xAI API is OpenAI-compatible, so the `openai` SDK is pointed at
  `api.x.ai` (see `src/lib/xai.ts`). Note that Ask and the parser default to **different** models:
  Ask uses a reasoning model (`grok-4.5`) while the parser uses a fast non-reasoning model, because
  reasoning models time out on large import lists.

## Deploy (Vercel + Neon + Clerk, $0)

Already wired for Postgres + Clerk. Steps:

1. **Neon** — create a free project at neon.tech, copy the connection string.
2. **Clerk** — create an app at clerk.com, enable Google + X, copy the two keys.
3. **Push schema** — put the Neon string in `.env` as `DATABASE_URL`, run `pnpm db:push`.
4. **Vercel** — import the repo (or `vercel`), and set env vars:
   - `DATABASE_URL` — the Neon string (use the pooled `-pooler` host on Vercel)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — from Clerk
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
   - `XAI_API_KEY` — optional (Grok parser + Ask companion)
5. `prisma generate` runs automatically on install (`postinstall`); `next build` deploys.
6. It's a PWA (`public/manifest.webmanifest` + icon) — installable from any device.

## Architecture

- **Next.js 16** (App Router) + **Tailwind 4** + **framer-motion** (swipe physics) +
  **lucide-react** (icons). Validation with **zod**.
- **Clerk** for auth (Google + X). Everything is private per user; the Clerk `userId` scopes
  every collection row. `src/middleware.ts` is `clerkMiddleware`.
- **Prisma 6 + Postgres** (Neon). Two tables: `Anime` (shared AniList metadata cache) and
  `CollectionItem` (per-user rows, `@@unique([userId, animeId])`, indexed on `[userId, status]`).
  Enums/genres are validated strings + JSON for portability.

### `src/lib/` — the brain

- `anilist.ts` — batched GraphQL (aliases for search, `id_in` for the feed) with 429 backoff.
- `parse.ts` / `parseGrok.ts` / `parseAnime.ts` — heuristic + Grok (xAI) parsers, one shape,
  graceful fallback. `xai.ts` is the shared Grok client (openai SDK → api.x.ai).
- `match.ts` / `similarity.ts` — confidence-gated AniList matching (auto-accept vs review).
- `collection.ts` — the service layer for per-user collection rows.
- `hours.ts` — the watch-hours math (episodes × runtime, null-safe by status).
- `deck.ts` — builds the swipe deck (never resurfaces owned/skipped titles).
- `feed.ts` — batched, cached airing refresh.
- `enums.ts` — status/tier enums shared across the app.
- `prisma.ts` — the singleton Prisma client.
- `og.ts` — share-card data + the mascot loader (`loadMascot`); pulls `node:fs`, so it's
  **server-only**. Pass `CardStats` down as a prop rather than importing this into client code.

### API routes (`src/app/api/`)

All routes are auth-gated: each reads `auth()` for the `userId` and scopes its query.

- `parse` — parse + match an imported blob.
- `collection` — CRUD on the user's collection.
- `deck` — the next batch of swipe cards.
- `stats` — empire dashboard aggregates.
- `feed` — airing episodes for the collection.
- `ask` — the collection-aware companion.
- `share-card` — renders a stat card as a **PNG** via `ImageResponse` (Satori). Takes a
  `variant` (`empire` | `hours` | `collection` | `tiers` | `taste`) and draws the optional
  mascot into the framed portrait slot. Client UI is `src/components/ShareCards.tsx` (copy to
  clipboard + open the X composer prefilled; download is the fallback).

## Free-tier limits

To keep a public deploy from running up xAI cost or hammering AniList, each signed-in
user gets a **generous daily quota** (per UTC day), enforced server-side in
`src/lib/rateLimit.ts` via a Postgres counter (`UsageCounter` table — no Redis):

| Action                      | Limit / day | Why it's capped                     |
| --------------------------- | ----------- | ----------------------------------- |
| **Ask** (AI companion)      | 100         | each question is an xAI call        |
| **Import** a list (`parse`) | 50          | parse + batched AniList search      |
| **Writes** (swipe/edit)     | 3000        | anti-abuse ceiling; no human hits it |

Over the cap returns HTTP **429** with a `Retry-After` header and a clear message
(surfaced in the Ask and Import UIs). Cheap reads (deck/stats/feed) are unmetered.
Adjust the numbers in `LIMITS` in `src/lib/rateLimit.ts`. Requires `pnpm db:push`
after pulling (adds the `UsageCounter` table).

## Mascot art for the share cards

Share cards have a framed portrait slot for user-supplied mascot art. Drop a **portrait**
image (roughly **2:3**, e.g. 720×1040 or larger) into `public/mascot/`:

    public/mascot/momo.png

That's it — reload a card. No code change, no restart in production.

- Accepted filenames (first match wins): `momo.png`, `momo.jpg`, `momo.jpeg`,
  `mascot.png`, `mascot.jpg`, `mascot.jpeg`, then `.webp` variants.
- **Transparent PNG** looks best (the character floats over the card's teal gradient). A solid
  photo works too; it's cropped with `object-fit: cover`.
- **PNG or JPG decode most reliably** in the image renderer (Satori); WebP is a last resort.
- The slot is 366px wide and full card height (~526px tall) at a 1200×630 card.
- Until you add a file, the slot shows a designed placeholder — nothing breaks.
- Use art you have the right to use. Copyrighted character art is **not** bundled with the app
  for that reason.

## Notes / known follow-ups

- `src/middleware.ts` triggers a Next 16 "use proxy instead" deprecation notice; it still works.
- The feed refreshes on open (batched + cached). A daily cron + web push is the phase-2 upgrade.

---

Made with Next.js, AniList, and too many hours of anime.

<!-- workflow test: fake email notifications (no functional change) -->

