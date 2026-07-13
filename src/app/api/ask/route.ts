import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { xaiClient, XAI_MODEL } from "@/lib/xai";
import { getCollection } from "@/lib/collection";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The thin companion: feed the user's collection to Grok and answer.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!process.env.XAI_API_KEY) {
    return NextResponse.json(
      { error: "Set XAI_API_KEY to enable the companion." },
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

  const client = xaiClient();
  const completion = await client.chat.completions.create({
    model: XAI_MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: "system",
        content:
          "You are the user's personal anime companion. You know their whole collection: each title with their watch status (watched/watching/half_finished/watchlist/dropped/untriaged) and their S/A/B/C/D tier. Answer their question using ONLY shows in their collection unless they ask for outside recommendations. Be concise, specific, and fun. Give a direct answer first, then a short reason. No preamble.",
      },
      { role: "user", content: `My anime collection:\n${context}\n\nQuestion: ${question}` },
    ],
  });

  const answer = completion.choices[0]?.message.content?.trim() ?? "";
  return NextResponse.json({ answer });
}
