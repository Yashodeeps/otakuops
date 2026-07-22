"use client";

// Share experience for the empire stats. Opens a modal that previews each
// generated card (see /api/share-card) and lets you post it to X. X's intent URL
// can't attach an image, so the flow is: copy the PNG to the clipboard + open the
// composer prefilled → paste to attach. Download is the always-works fallback.
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Share2, X, Copy, Download, Check, ArrowUpRight } from "lucide-react";
import type { CardStats } from "@/lib/og"; // type-only: erased, no node deps in the client bundle

type VariantId = "empire" | "hours" | "collection" | "tiers" | "taste";

const VARIANTS: { id: VariantId; label: string; tweet: (s: CardStats) => string }[] = [
  {
    id: "empire",
    label: "The Empire",
    tweet: (s) => `My anime empire: ${s.watched} watched · ${s.hours} logged · ${s.total} tracked. 🎴`,
  },
  {
    id: "hours",
    label: "Watch Hours",
    tweet: (s) => `I've sunk ${s.hours} into anime — that's ${s.days} days of my life. no regrets 🎴`,
  },
  {
    id: "collection",
    label: "Collection",
    tweet: (s) => `${s.total} anime tracked, ranked and triaged. the empire grows 🗂️`,
  },
  {
    id: "tiers",
    label: "S-Tier Taste",
    tweet: (s) => `${s.sCount} shows sit in my S-tier. certified elite taste 🏆`,
  },
  {
    id: "taste",
    label: "Anime DNA",
    tweet: (s) =>
      s.topGenres.length
        ? `My anime DNA: ${s.topGenres.slice(0, 3).map((g) => g.name).join(", ")}. 🧬`
        : `Decoding my anime DNA on OtakuOps 🧬`,
  },
];

async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`card ${res.status}`);
  return res.blob();
}

export function ShareCards({ stats }: { stats: CardStats }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn text-sm" onClick={() => setOpen(true)}>
        <Share2 size={15} strokeWidth={2} /> Share to X
      </button>
      <AnimatePresence>{open && <ShareModal stats={stats} onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}

function ShareModal({ stats, onClose }: { stats: CardStats; onClose: () => void }) {
  const [active, setActive] = useState<VariantId>("empire");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [loaded, setLoaded] = useState(false);

  const activeVariant = VARIANTS.find((v) => v.id === active)!;
  // Endpoint sends Cache-Control: no-store, so previews are always current — no nonce needed.
  const cardUrl = `/api/share-card?variant=${active}`;

  // Escape to close + lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const copyImage = useCallback(async (): Promise<boolean> => {
    try {
      // Promise form keeps Safari happy and authorizes the write inside the gesture.
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": fetchBlob(cardUrl) }),
      ]);
      setCopyState("copied");
      return true;
    } catch {
      setCopyState("failed");
      return false;
    }
  }, [cardUrl]);

  const download = useCallback(async () => {
    try {
      const blob = await fetchBlob(cardUrl);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `otakuops-${active}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(cardUrl, "_blank", "noopener,noreferrer");
    }
  }, [cardUrl, active]);

  const postToX = useCallback(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text = `${activeVariant.tweet(stats)} — built with OtakuOps`;
    const intent = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}${
      origin ? `&url=${encodeURIComponent(origin)}` : ""
    }`;
    // Kick off the clipboard write first (doc focused, gesture live), then open X.
    void copyImage();
    window.open(intent, "_blank", "noopener,noreferrer");
  }, [activeVariant, stats, copyImage]);

  // Portal to <body>: the dashboard's `.rise` container keeps a transform after
  // its entrance animation, which would otherwise make this `fixed` overlay
  // resolve against that offset box instead of the viewport (pushing it down).
  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(3,3,5,0.72)", backdropFilter: "blur(6px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="panel w-full max-w-lg relative flex flex-col overflow-hidden"
        style={{ maxHeight: "min(92dvh, 720px)" }}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 6 }}
        transition={{ duration: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header — pinned, close always reachable */}
        <div className="flex items-start justify-between gap-3 px-5 md:px-6 pt-5 md:pt-6 pb-4 shrink-0">
          <div>
            <div className="label mb-1">flex your empire</div>
            <h2 className="display text-xl md:text-2xl">Share a stat card</h2>
          </div>
          <button className="btn btn-ghost p-2 -mr-1 -mt-1 shrink-0" aria-label="Close" onClick={onClose}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* scrollable body — picker + preview */}
        <div className="px-5 md:px-6 overflow-y-auto grow min-h-0">
          <div className="flex flex-wrap gap-2 mb-4">
            {VARIANTS.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setActive(v.id);
                  setLoaded(false); // re-arm the fade for the new preview
                }}
                className="chip"
                style={
                  active === v.id
                    ? {
                        borderColor: "var(--accent)",
                        color: "var(--accent)",
                        background: "var(--accent-dim)",
                      }
                    : undefined
                }
              >
                {v.label}
              </button>
            ))}
          </div>

          <div
            className="rounded-lg overflow-hidden border border-[var(--border)] relative"
            style={{ aspectRatio: "1200 / 630", background: "var(--surface-2)" }}
          >
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="label">rendering…</span>
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={cardUrl}
              src={cardUrl}
              alt={`${activeVariant.label} stat card`}
              className="w-full h-full object-cover transition-opacity duration-300"
              style={{ opacity: loaded ? 1 : 0 }}
              onLoad={() => setLoaded(true)}
            />
          </div>
        </div>

        {/* footer — pinned, actions never clipped */}
        <div className="px-5 md:px-6 py-4 border-t border-[var(--border)] shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-primary text-sm" onClick={postToX}>
              <ArrowUpRight size={15} strokeWidth={2} /> Post to X
            </button>
            <button className="btn text-sm" onClick={copyImage}>
              {copyState === "copied" ? (
                <>
                  <Check size={15} strokeWidth={2} /> Copied
                </>
              ) : (
                <>
                  <Copy size={15} strokeWidth={2} /> Copy image
                </>
              )}
            </button>
            <button className="btn text-sm" onClick={download}>
              <Download size={15} strokeWidth={2} /> Download
            </button>
          </div>
          <p className="text-xs text-[var(--faint)] mt-3 leading-relaxed">
            {copyState === "copied"
              ? "Card copied — paste it (⌘V / Ctrl+V) into your X post to attach it."
              : copyState === "failed"
                ? "Couldn't auto-copy here — hit Download, then attach the card to your post."
                : "Post to X opens the composer prefilled and copies the card so you can paste it in."}
          </p>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
