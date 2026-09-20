import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { bulkTriage, BULK_MAX } from "@/lib/bulkTriage";
import type { ItemUpdate } from "@/lib/collection";
import { isStatus, isTier } from "@/lib/enums";
import { enforceLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// PATCH /api/collection/bulk  { ids: string[], status?, tier? } -> triage a selection
export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limited = await enforceLimit(userId, "mutation");
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const ids = Array.isArray(body.ids) ? body.ids.filter((v) => typeof v === "string") : [];
  if (ids.length === 0) return NextResponse.json({ error: "ids required" }, { status: 400 });
  if (ids.length > BULK_MAX) {
    return NextResponse.json({ error: `at most ${BULK_MAX} ids` }, { status: 400 });
  }

  const update: ItemUpdate = {};
  if (body.status !== undefined) {
    if (!isStatus(body.status)) return NextResponse.json({ error: "bad status" }, { status: 400 });
    update.status = body.status;
  }
  if (body.tier !== undefined) {
    if (!isTier(body.tier)) return NextResponse.json({ error: "bad tier" }, { status: 400 });
    update.tier = body.tier;
  }
  if (!update.status && !update.tier) {
    return NextResponse.json({ error: "status or tier required" }, { status: 400 });
  }

  return NextResponse.json(await bulkTriage(userId, ids, update));
}
