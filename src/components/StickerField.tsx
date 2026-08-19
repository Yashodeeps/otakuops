// Anime character stickers scattered in the page background. Purely cosmetic:
// aria-hidden, non-interactive, fixed behind all content, desktop-only (no gutter
// room on mobile). Art comes from your PNGs in public/stickers/ (falls back to
// public/mascot/). Nothing copyrighted is bundled by default — you supply the art,
// same as the share-card mascot. Use art you have rights to. If no images exist,
// nothing renders.
import { readdir } from "node:fs/promises";
import { join } from "node:path";

// Fixed slots in the page gutters. top/left are % of the viewport; negative/large
// left values let stickers peek in from the edges. Opacity is high on purpose so
// they read as real stickers, not faint watermarks.
const SLOTS: { top: string; left: string; size: number; rot: number; op: number }[] = [
  { top: "3%", left: "82%", size: 155, rot: 6, op: 0.85 },
  { top: "27%", left: "-3%", size: 150, rot: -8, op: 0.8 },
  { top: "52%", left: "87%", size: 170, rot: 7, op: 0.8 },
  { top: "74%", left: "-2%", size: 145, rot: -6, op: 0.85 },
  { top: "84%", left: "80%", size: 150, rot: -10, op: 0.8 },
];

// Prefer public/stickers/, then public/mascot/ — the same runtime dir read the
// share card uses, so it works on Vercel with no rebuild.
async function listArt(): Promise<string[]> {
  for (const sub of ["stickers", "mascot"]) {
    try {
      const files = (await readdir(join(process.cwd(), "public", sub)))
        .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
        .sort();
      if (files.length) return files.map((f) => `/${sub}/${f}`);
    } catch {
      /* dir doesn't exist — try the next */
    }
  }
  return [];
}

export async function StickerField() {
  const art = await listArt();
  if (!art.length) return null;
  return (
    <div aria-hidden className="hidden md:block fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {SLOTS.map((s, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={art[i % art.length]}
          alt=""
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            width: s.size,
            height: "auto",
            opacity: s.op,
            transform: `rotate(${s.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}
