// Free-tier rate limiting, backed by Postgres (no Redis/edge KV — this app's
// scale doesn't need one). Per-user, per-UTC-day counters; generous caps that
// exist to stop runaway cost/abuse, not to nag normal users. A heavy day of
// real use won't come close.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Daily caps per user. Only the operations that cost money (xAI) or hammer an
// external API (AniList) are metered; cheap reads are not.
export const LIMITS = {
  ask: 100, // AI companion questions/day (each is an xAI call)
  import: 50, // list imports/day (parse + batched AniList search)
  mutation: 3000, // collection/deck writes/day — the swipe loop; anti-abuse ceiling only
} as const;

export type LimitAction = keyof typeof LIMITS;

function utcDay(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// Seconds until the counters reset (next UTC midnight). Used for Retry-After.
export function secondsUntilReset(): number {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.floor((next - now.getTime()) / 1000));
}

// Atomically bump today's counter; return a 429 response if the user is over
// their daily cap for `action`, else null.
//
// Usage:  const limited = await enforceLimit(userId, "ask"); if (limited) return limited;
//
// ponytail: DB-atomic increment (single upsert). Two harmless ceilings:
//  (1) blocked requests still write (count keeps climbing) — a cache/edge check
//      would avoid the write; not worth a new dependency at this scale.
//  (2) the very first request of a user's day under true concurrency can lose the
//      upsert insert race (P2002) and surface a 500 — vanishingly rare; add a
//      try/catch fast-path if it ever shows up.
export async function enforceLimit(
  userId: string,
  action: LimitAction,
): Promise<NextResponse | null> {
  const limit = LIMITS[action];
  const day = utcDay();
  const row = await prisma.usageCounter.upsert({
    where: { userId_day_action: { userId, day, action } },
    create: { userId, day, action, count: 1 },
    update: { count: { increment: 1 } },
  });
  if (row.count > limit) {
    return NextResponse.json(
      {
        error: `Daily free-tier limit reached (${limit} ${action}/day). Resets at 00:00 UTC.`,
        limit,
        action,
        remaining: 0,
      },
      { status: 429, headers: { "Retry-After": String(secondsUntilReset()) } },
    );
  }
  return null;
}
