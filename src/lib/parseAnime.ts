// Chooses the parser: Grok (xAI) when a key is present (better on messy input),
// local heuristic otherwise. Always degrades gracefully — if Grok errors, we
// fall back to the heuristic so the import never hard-fails.
import { heuristicParse, type ParsedEntry } from "./parse";

export type ParseResult = { entries: ParsedEntry[]; engine: "grok" | "heuristic" };

export async function parseAnime(text: string): Promise<ParseResult> {
  if (process.env.XAI_API_KEY) {
    try {
      const { grokParse } = await import("./parseGrok");
      const entries = await grokParse(text);
      if (entries.length) return { entries, engine: "grok" };
    } catch (err) {
      console.error("Grok parse failed, falling back to heuristic:", err);
    }
  }
  return { entries: heuristicParse(text), engine: "heuristic" };
}
