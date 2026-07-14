// Grok-powered parser. Used when XAI_API_KEY is set; falls back to the local
// heuristic otherwise (see parseAnime.ts). Uses xAI structured outputs
// (json_schema) so we get a valid, schema-shaped array back.
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { xaiClient, XAI_PARSE_MODEL } from "./xai";
import { STATUSES, TIERS } from "./enums";
import type { ParsedEntry } from "./parse";

const EntrySchema = z.object({
  rawName: z.string(),
  cleanName: z.string(),
  tier: z.enum(TIERS),
  status: z.enum(STATUSES),
});
const ResultSchema = z.object({ entries: z.array(EntrySchema) });

const SYSTEM = `You parse a messy pasted anime watch-list into structured entries.
For each anime the user listed, output one entry:
- rawName: the original text fragment for that anime, verbatim.
- cleanName: the clean anime title to search a database with (strip ranking marks, scores, status words, bullets, numbering).
- tier: the user's ranking, mapped to S/A/B/C/D/E (S is best, E is worst/trash). Respect explicit tier-section headers exactly ("S tier", "A tier" ... "E tier"); parenthetical labels like "(mid)", "(okayish)", "(trash)" are just notes on C/D/E, not separate tiers. Map scores out of 10: >=9 -> S, 8 -> A, 7 -> B, 6 -> C, 5 -> D, <5 -> E (out of 100, divide by 10 first). Words: "fire"/"peak"/"goat" -> S, "mid" -> C, "trash" -> E. If no ranking, use "unranked".
- status: the watch status if expressed. Map "completed"/"watched"/"finished"/"seen" -> watched; "watching"/"currently" -> watching; "on hold"/"paused"/"half"/"midway"/"dnf midway" -> half_finished; "dropped"/"quit"/"abandoned" -> dropped; "plan to watch"/"ptw"/"want to watch"/"backlog"/"wishlist" -> watchlist. If unknown, use "untriaged".
Section headers like "S Tier", "Watching:", "Completed" apply their tier/status to every anime listed under them until the next header. Split comma-separated lists into separate entries. Ignore blank lines and non-anime chatter. Do not invent anime that are not in the text. Respond with JSON only.`;

export async function grokParse(text: string): Promise<ParsedEntry[]> {
  const client = xaiClient();

  const completion = await client.chat.completions.create({
    model: XAI_PARSE_MODEL,
    max_tokens: 16000, // headroom for large lists so the JSON never truncates
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: text },
    ],
    response_format: zodResponseFormat(ResultSchema, "parsed"),
  });

  const content = completion.choices[0]?.message.content;
  if (!content) throw new Error("Grok parse returned no content");
  const parsed = ResultSchema.parse(JSON.parse(content));
  return parsed.entries;
}
