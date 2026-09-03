import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { xaiClient, XAI_MODEL } from "@/lib/xai";
import { getCollection } from "@/lib/collection";
import { enforceLimit } from "@/lib/rateLimit";

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
  const { question, history } = (await req.json().catch(() => ({}))) as {
    question?: string;
    history?: { q?: string; a?: string }[];
  };
  if (!question?.trim()) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }
  // Last few turns only - enough for follow-ups ("why?", "what about the other one?")
  // without re-sending the whole conversation on every ask.
  const prior = (Array.isArray(history) ? history : [])
    .slice(-6)
    .flatMap((t) =>
      typeof t?.q === "string" && typeof t?.a === "string"
        ? ([
            { role: "user" as const, content: t.q.slice(0, 2000) },
            { role: "assistant" as const, content: t.a.slice(0, 4000) },
          ])
        : [],
    );

  const limited = await enforceLimit(userId, "ask");
  if (limited) return limited;

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

  try {
    const client = xaiClient();
    const completion = await client.chat.completions.create({
      model: XAI_MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content:
            "You are the user's personal anime companion. You know their whole collection: each title with their watch status (watched/watching/half_finished/watchlist/dropped/untriaged) and their S/A/B/C/D tier. Answer their question using ONLY shows in their collection unless they ask for outside recommendations. Be concise, specific, and fun. Give a direct answer first, then a short reason. No preamble. Reply in plain text - no markdown, no asterisks or headers; use plain '- ' for lists." +
            `\n\nThe user's anime collection:\n${context}`,
        },
        ...prior,
        { role: "user", content: question },
      ],
    });

    const answer = completion.choices[0]?.message.content?.trim() ?? "";
    return NextResponse.json({ answer });
  } catch (err) {
    // Surface the real upstream reason (bad model id, invalid key, rate limit)
    // instead of a bare 500 that the client can only show as "Request failed".
    console.error("ask route xai error:", err);
    const detail = err instanceof Error ? err.message : "the AI request failed";
    return NextResponse.json(
      {
        error: `Companion request failed for model "${XAI_MODEL}": ${detail}. If this persists, set XAI_MODEL to a model your xAI account can access.`,
      },
      { status: 502 },
    );
  }
}
