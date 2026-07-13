import { NextResponse } from "next/server";
import { updateItem, deleteItem, type ItemUpdate } from "@/lib/collection";
import { isStatus, isTier } from "@/lib/enums";

export const dynamic = "force-dynamic";

// PATCH /api/collection/:id  -> update status / tier / episodesWatched / rank
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const update: ItemUpdate = {};

  if (typeof body.status === "string") {
    if (!isStatus(body.status)) return NextResponse.json({ error: "bad status" }, { status: 400 });
    update.status = body.status;
  }
  if (typeof body.tier === "string") {
    if (!isTier(body.tier)) return NextResponse.json({ error: "bad tier" }, { status: 400 });
    update.tier = body.tier;
  }
  if (typeof body.episodesWatched === "number") {
    update.episodesWatched = Math.max(0, Math.floor(body.episodesWatched));
  }
  if (body.personalRank === null || typeof body.personalRank === "number") {
    update.personalRank = body.personalRank as number | null;
  }

  const row = await updateItem(id, update);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ item: row });
}

// DELETE /api/collection/:id
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteItem(id);
  return NextResponse.json({ ok: true });
}
