import { NextResponse } from "next/server";
import { parseAnime } from "@/lib/parseAnime";
import { matchEntries } from "@/lib/match";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Blob in -> parsed + AniList-matched candidates out. Does NOT write to the DB;
// the import UI reviews the ambiguous ones, then commits via POST /api/collection.
export async function POST(req: Request) {
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  try {
    const { entries, engine } = await parseAnime(text);
    if (!entries.length) {
      return NextResponse.json({ engine, entries: [] });
    }
    const matched = await matchEntries(entries);
    return NextResponse.json({ engine, entries: matched });
  } catch (err) {
    console.error("parse route error:", err);
    return NextResponse.json({ error: "parse failed" }, { status: 500 });
  }
}
