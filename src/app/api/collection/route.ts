import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCollection, importItems, type ImportItem } from "@/lib/collection";
import { isStatus } from "@/lib/enums";

export const dynamic = "force-dynamic";

// GET /api/collection?status=untriaged  -> the signed-in user's collection
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const rows = await getCollection(userId, status && isStatus(status) ? { status } : undefined);
  return NextResponse.json({ items: rows });
}

// POST /api/collection  { items: ImportItem[] }  -> commit reviewed imports
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { items?: ImportItem[] };
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }
  const count = await importItems(userId, body.items);
  return NextResponse.json({ imported: count });
}
