import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getFeed(userId));
}
