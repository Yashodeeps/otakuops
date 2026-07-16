import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDeck } from "@/lib/deck";
import { addAnime } from "@/lib/collection";
import { isStatus, isTier, type Status, type Tier } from "@/lib/enums";
import type { AniListMedia } from "@/lib/anilist";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/deck?page=N  -> untriaged imports (page 1) + popular discovery
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const mode = url.searchParams.get("mode") === "skipped" ? "skipped" : "normal";
  return NextResponse.json(await getDeck(userId, page, mode));
}

// POST /api/deck  { media, status, tier }  -> add a swiped discovery card
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    media?: AniListMedia;
    status?: string;
    tier?: string;
  };
  if (!body.media?.id) return NextResponse.json({ error: "media required" }, { status: 400 });
  if (!isStatus(body.status ?? "") || !isTier(body.tier ?? "")) {
    return NextResponse.json({ error: "bad status/tier" }, { status: 400 });
  }

  const item = await addAnime(userId, body.media, body.status as Status, body.tier as Tier);
  return NextResponse.json({ item });
}
