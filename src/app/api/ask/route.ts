import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCollection } from "@/lib/collection";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The thin companion: feed the user's collection to Claude and answer. Opus for
// quality recommendations (the parser uses cheap Haiku; this is low-volume).
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Set ANTHROPIC_API_KEY to enable the companion." },
      { status: 501 },
    );
  }
  const { question } = (await req.json().catch(() => ({}))) as { question?: string };
  if (!question?.trim()) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }

  const rows = await getCollection(userId);
  const context =
    rows
      .map((r) => {
        const g = r.genres.slice(0, 3).join("/");
        return `- ${r.title} [${r.status}, tier ${r.tier}${g ? ", " + g : ""}${
          r.averageScore ? ", " + r.averageScore + "/100" : ""
        }]`;
      })
      .join("\n") || "(collection is empty)";

  const client = new Anthropic();
  const msg = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1500,
    system:
      "You are the user's personal anime companion. You know their whole collection: each title with their watch status (watched/watching/half_finished/watchlist/dropped/untriaged) and their S/A/B/C/D tier. Answer their question using ONLY shows in their collection unless they ask for outside recommendations. Be concise, specific, and fun. Give a direct answer first, then a short reason. No preamble.",
    messages: [
      { role: "user", content: `My anime collection:\n${context}\n\nQuestion: ${question}` },
    ],
  });

  const answer = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return NextResponse.json({ answer });
}
