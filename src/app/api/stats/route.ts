import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStats } from "@/lib/collection";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getStats(userId));
}
