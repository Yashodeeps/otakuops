import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkDb } from "@/lib/health";

export const dynamic = "force-dynamic";

// GET /api/status -> { db, latencyMs }. Read-only: the setup screen calls it so
// a first-run install can tell whether DATABASE_URL works yet without a reload.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await checkDb());
}
