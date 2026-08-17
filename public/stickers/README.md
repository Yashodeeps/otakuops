# Background stickers

Drop cute PNGs here and they scatter across the app background automatically
(see `src/components/StickerField.tsx`). No code change, no restart in production —
same drop-in mechanism as the share-card mascot in `../mascot/`.

- **Transparent PNG** looks best (character floats over the dark background).
- Roughly square-ish or portrait art works; each is placed at a fixed slot,
  rotated slightly, at low opacity so it never fights readability.
- Shown at 5 fixed gutter slots (desktop only); add more in `SLOTS` if you want.
- **Transparent PNGs only** — they render at high opacity, so a solid/white
  background would show as a rectangle. (Flood-fill white bg to transparent first.)
- Until you add any file here, the app falls back to `../mascot/` art. With no
  images anywhere, nothing renders (there are no built-in decorations).
- **Use art you have the right to use.** Copyrighted character art is not bundled
  with the app for that reason.
