// Claude-powered parser. Used when ANTHROPIC_API_KEY is set; falls back to the
// local heuristic otherwise (see parseAnime.ts). Uses Haiku 4.5 — the cheapest
// fast tier — since parsing a blob is high-volume and simple. Structured output
// via output_config.format guarantees a valid, schema-shaped array back.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
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
- tier: the user's ranking if expressed, mapped to S/A/B/C/D. Map scores out of 10: >=9 -> S, 8 -> A, 7 -> B, 6 -> C, <6 -> D (out of 100, divide by 10 first). Interpret words too ("fire"/"peak"/"goat" -> S, "mid" -> C, "trash" -> D). If no ranking, use "unranked".
- status: the watch status if expressed. Map "completed"/"watched"/"finished"/"seen" -> watched; "watching"/"currently" -> watching; "on hold"/"paused"/"half"/"midway"/"dnf midway" -> half_finished; "dropped"/"quit"/"abandoned" -> dropped; "plan to watch"/"ptw"/"want to watch"/"backlog"/"wishlist" -> watchlist. If unknown, use "untriaged".
Section headers like "S Tier", "Watching:", "Completed" apply their tier/status to every anime listed under them until the next header. Split comma-separated lists into separate entries. Ignore blank lines and non-anime chatter. Do not invent anime that are not in the text.`;

export async function claudeParse(text: string): Promise<ParsedEntry[]> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

  const response = await client.messages.parse({
    model: "claude-haiku-4-5",
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: "user", content: text }],
    output_config: { format: zodOutputFormat(ResultSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) throw new Error("Claude parse returned no structured output");
  return parsed.entries;
}
