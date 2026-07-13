import { NextResponse } from "next/server";
import { getFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json(await getFeed());
}
