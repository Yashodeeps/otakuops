# Mascot art for the share cards

Drop your mascot image here and it appears on every shareable stat card
(`/api/share-card`), filling the framed portrait slot on the right.

## How

1. Save a **portrait** image (roughly **2:3**, e.g. 720×1040 or larger) as:

       public/mascot/momo.png

2. That's it — reload a card. No code change, no restart in production.

## Notes

- **Transparent PNG** looks best (the character floats over the card's teal
  gradient). A solid photo works too; it's cropped with `object-fit: cover`.
- Accepted filenames (first match wins): `momo.png`, `momo.jpg`, `momo.jpeg`,
  `mascot.png`, `mascot.jpg`, `mascot.jpeg`, then `.webp` variants.
- **PNG or JPG decode most reliably** in the image renderer (Satori). WebP is a
  last resort.
- Until you add a file, the slot shows a designed placeholder — nothing breaks.
- Use art you have the right to use. Official/copyrighted character art isn't
  bundled with the app for that reason.

The slot is 366px wide and full card height (~526px tall) at a 1200×630 card.
