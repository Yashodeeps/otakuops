import { NextResponse } from "next/server";
import { getCollection, importItems, type ImportItem } from "@/lib/collection";
import { isStatus } from "@/lib/enums";

export const dynamic = "force-dynamic";

// GET /api/collection?status=untriaged  -> the collection (optionally filtered)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const rows = await getCollection(status && isStatus(status) ? { status } : undefined);
  return NextResponse.json({ items: rows });
}

// POST /api/collection  { items: ImportItem[] }  -> commit reviewed imports
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { items?: ImportItem[] };
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }
  const count = await importItems(body.items);
  return NextResponse.json({ imported: count });
}
