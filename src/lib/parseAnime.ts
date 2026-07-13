// Chooses the parser: Claude when a key is present (better on messy input),
// local heuristic otherwise. Always degrades gracefully — if Claude errors,
// we fall back to the heuristic so the import never hard-fails.
import { heuristicParse, type ParsedEntry } from "./parse";

export type ParseResult = { entries: ParsedEntry[]; engine: "claude" | "heuristic" };

export async function parseAnime(text: string): Promise<ParseResult> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { claudeParse } = await import("./parseClaude");
      const entries = await claudeParse(text);
      if (entries.length) return { entries, engine: "claude" };
    } catch (err) {
      console.error("Claude parse failed, falling back to heuristic:", err);
    }
  }
  return { entries: heuristicParse(text), engine: "heuristic" };
}
