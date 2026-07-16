"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";
import {
  Check,
  Trash2,
  Bookmark,
  Play,
  Undo2,
  Star,
  Flame,
  SkipForward,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { TIER_META, type Status, type Tier } from "@/lib/enums";
import type { DeckCard } from "@/lib/deck";

type Dir = "left" | "right" | "up" | "down";

const DIR: Record<Dir, { status: Status; label: string; color: string; Icon: LucideIcon }> = {
  right: { status: "watched", label: "Watched", color: "#7bd88f", Icon: Check },
  left: { status: "dropped", label: "Dropped", color: "#ff6b6b", Icon: Trash2 },
  up: { status: "watchlist", label: "Watchlist", color: "#5aa9e6", Icon: Bookmark },
  down: { status: "watching", label: "Watching", color: "#ffb454", Icon: Play },
};

const THRESHOLD = 110;

function Card({ card, onCommit }: { card: DeckCard; onCommit: (s: Status, t: Tier) => void }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-12, 12]);
  const [tier, setTier] = useState<Tier>(card.tier);
  const [showRank, setShowRank] = useState(false);
  const flung = useRef(false);

  const rightOp = useTransform(x, [40, 150], [0, 1]);
  const leftOp = useTransform(x, [-150, -40], [1, 0]);
  const upOp = useTransform(y, [-150, -40], [1, 0]);
  const downOp = useTransform(y, [40, 150], [0, 1]);

  const fling = useCallback(
    (status: Status, d: Dir) => {
      if (flung.current) return;
      flung.current = true;
      animate(x, d === "right" ? 700 : d === "left" ? -700 : 0, { duration: 0.28, ease: "easeOut" });
      animate(y, d === "up" ? -800 : d === "down" ? 800 : 0, { duration: 0.28, ease: "easeOut" });
      setTimeout(() => onCommit(status, tier), 230);
    },
    [onCommit, tier, x, y],
  );

  function onDragEnd(_e: unknown, info: PanInfo) {
    const { x: ox, y: oy } = info.offset;
    if (Math.abs(ox) > Math.abs(oy)) {
      if (ox > THRESHOLD) return fling("watched", "right");
      if (ox < -THRESHOLD) return fling("dropped", "left");
    } else {
      if (oy < -THRESHOLD) return fling("watchlist", "up");
      if (oy > THRESHOLD) return fling("watching", "down");
    }
    animate(x, 0, { type: "spring", stiffness: 380, damping: 26 });
    animate(y, 0, { type: "spring", stiffness: 380, damping: 26 });
  }

  const Overlay = ({ op, d }: { op: import("framer-motion").MotionValue<number>; d: Dir }) => {
    const c = DIR[d];
    const Icon = c.Icon;
    return (
      <motion.div
        style={{ opacity: op }}
        className="absolute inset-0 flex items-center justify-center rounded-xl pointer-events-none"
      >
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 backdrop-blur-sm"
          style={{ borderColor: c.color, color: c.color, background: "rgba(10,10,12,0.5)" }}
        >
          <Icon size={22} strokeWidth={2.5} />
          <span className="display text-lg">{c.label}</span>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      className="absolute inset-0 touch-none select-none cursor-grab active:cursor-grabbing"
      style={{ x, y, rotate }}
      drag
      dragElastic={0.7}
      dragMomentum={false}
      onDragEnd={onDragEnd}
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      <div className="relative w-full h-full rounded-xl overflow-hidden border border-[var(--border-2)] bg-[var(--surface-2)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.coverImage ?? ""}
          alt={card.title}
          draggable={false}
          className="w-full h-full object-cover"
        />
        {card.kind === "discover" && (
          <div
            className="absolute top-3 left-3 chip"
            style={{ background: "rgba(10,10,12,0.7)", borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            <Flame size={11} strokeWidth={2} /> popular
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3.5 bg-black/80 backdrop-blur-md border-t border-white/10">
          <div className="flex items-center gap-2 label mb-1 text-white/50">
            {card.format && <span>{card.format}</span>}
            {card.episodes && <span>· {card.episodes} ep</span>}
            {card.seasonYear && <span>· {card.seasonYear}</span>}
            {card.averageScore && (
              <span className="flex items-center gap-0.5">
                · <Star size={10} fill="currentColor" /> {card.averageScore}
              </span>
            )}
          </div>
          <h2 className="display text-lg md:text-2xl text-white leading-tight line-clamp-2">
            {card.title}
          </h2>
          {/* collapsible rank — declutters the card */}
          <div className="mt-2.5">
            {!showRank ? (
              <button
                onClick={() => setShowRank(true)}
                className="text-xs px-2.5 py-1 rounded-md border font-medium"
                style={
                  tier === "unranked"
                    ? { borderColor: "rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.8)" }
                    : { borderColor: TIER_META[tier].color, color: TIER_META[tier].color }
                }
              >
                {tier === "unranked" ? "+ Rank" : `Tier ${tier}`}
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                {(["S", "A", "B", "C", "D", "E"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTier(t);
                      setShowRank(false);
                    }}
                    className="readout w-7 h-7 rounded-md text-sm font-bold"
                    style={{
                      background: tier === t ? TIER_META[t].color : "rgba(255,255,255,0.1)",
                      color: tier === t ? "#0a0a0c" : "#fff",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Overlay op={rightOp} d="right" />
        <Overlay op={leftOp} d="left" />
        <Overlay op={upOp} d="up" />
        <Overlay op={downOp} d="down" />
      </div>
      <FlingBridge fling={fling} />
    </motion.div>
  );
}

let activeFling: ((status: Status, d: Dir) => void) | null = null;
function FlingBridge({ fling }: { fling: (status: Status, d: Dir) => void }) {
  useEffect(() => {
    activeFling = fling;
    return () => {
      if (activeFling === fling) activeFling = null;
    };
  }, [fling]);
  return null;
}

type HistoryEntry = { card: DeckCard; createdId?: string; committed: Status };

export default function SwipePage() {
  const [mode, setMode] = useState<"normal" | "skipped">("normal");
  const [cards, setCards] = useState<DeckCard[] | null>(null);
  const [i, setI] = useState(0);
  const [page, setPage] = useState(1);
  const [noMore, setNoMore] = useState(false);
  const [skippedCount, setSkippedCount] = useState(0);
  const history = useRef<HistoryEntry[]>([]);
  const loadingMore = useRef(false);
  const seen = useRef<Set<number>>(new Set());

  const loadDeck = useCallback((m: "normal" | "skipped") => {
    setCards(null);
    setI(0);
    setNoMore(false);
    history.current = [];
    seen.current = new Set();
    fetch(`/api/deck?page=1&mode=${m}`)
      .then((r) => r.json())
      .then((d: { cards: DeckCard[]; nextPage: number; skippedCount: number }) => {
        d.cards.forEach((c) => c.animeId != null && seen.current.add(c.animeId));
        setCards(d.cards);
        setPage(d.nextPage);
        setSkippedCount(d.skippedCount);
        if (d.cards.length === 0) setNoMore(true);
      })
      .catch(() => setCards([]));
  }, []);

  useEffect(() => {
    loadDeck(mode);
  }, [mode, loadDeck]);

  const fetchMore = useCallback(async () => {
    if (loadingMore.current || noMore || mode !== "normal") return;
    loadingMore.current = true;
    try {
      const r = await fetch(`/api/deck?page=${page}&mode=normal`);
      const d = (await r.json()) as { cards: DeckCard[]; nextPage: number };
      const discover = d.cards.filter((c) => c.kind === "discover" && c.animeId != null && !seen.current.has(c.animeId));
      if (discover.length === 0) setNoMore(true);
      else {
        discover.forEach((c) => c.animeId != null && seen.current.add(c.animeId));
        setCards((prev) => [...(prev ?? []), ...discover]);
        setPage(d.nextPage);
      }
    } catch {
      /* keep what we have */
    } finally {
      loadingMore.current = false;
    }
  }, [page, noMore, mode]);

  const commit = useCallback(
    (status: Status, tier: Tier) => {
      const card = cards?.[i];
      if (!card) return;
      history.current.push({ card, committed: status });

      if (card.kind === "collection" && card.itemId) {
        fetch(`/api/collection/${card.itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, tier }),
        }).catch(() => {});
      } else if (card.kind === "discover" && card.media) {
        const entry = history.current[history.current.length - 1];
        fetch("/api/deck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ media: card.media, status, tier }),
        })
          .then((r) => r.json())
          .then((d: { item?: { id: string } }) => {
            if (d.item) entry.createdId = d.item.id;
          })
          .catch(() => {});
      }

      if (status === "skipped") setSkippedCount((c) => c + 1);
      else if (mode === "skipped") setSkippedCount((c) => Math.max(0, c - 1));

      setI((n) => {
        const next = n + 1;
        if (mode === "normal" && cards && cards.length - next <= 5) fetchMore();
        return next;
      });
    },
    [cards, i, fetchMore, mode],
  );

  function undo() {
    if (i === 0) return;
    const entry = history.current.pop();
    setI((n) => n - 1);
    if (!entry) return;
    if (entry.committed === "skipped") setSkippedCount((c) => Math.max(0, c - 1));
    else if (mode === "skipped") setSkippedCount((c) => c + 1);

    if (entry.card.kind === "collection" && entry.card.itemId) {
      fetch(`/api/collection/${entry.card.itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: entry.card.status, tier: entry.card.tier }),
      }).catch(() => {});
    } else if (entry.card.kind === "discover" && entry.createdId) {
      fetch(`/api/collection/${entry.createdId}`, { method: "DELETE" }).catch(() => {});
    }
  }

  if (!cards) return <div className="text-center label mt-20">loading deck…</div>;

  if (i >= cards.length) {
    const reviewing = mode === "skipped";
    return (
      <div className="panel p-10 text-center rise mt-8 max-w-lg mx-auto">
        <div
          className="w-12 h-12 rounded-full grid place-items-center mx-auto mb-4"
          style={{ background: "var(--accent-dim)" }}
        >
          <Check size={22} className="text-[var(--accent)]" strokeWidth={2.5} />
        </div>
        <h1 className="display text-2xl mb-2">{reviewing ? "Skipped cleared" : "All caught up"}</h1>
        <p className="text-[var(--muted)] text-sm mb-7">
          {reviewing
            ? "That's the skipped pile handled."
            : "You've swiped through everything for now."}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          {reviewing ? (
            <button className="btn btn-primary" onClick={() => setMode("normal")}>
              Back to discovery
            </button>
          ) : (
            <>
              <Link href="/" className="btn btn-primary">See the empire</Link>
              {skippedCount > 0 && (
                <button className="btn" onClick={() => setMode("skipped")}>
                  <RotateCcw size={15} strokeWidth={2} /> Review {skippedCount} skipped
                </button>
              )}
              <Link href="/import" className="btn">Import a list</Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const current = cards[i];
  const next = cards[i + 1];
  const remaining = cards.length - i;

  return (
    <div className="flex flex-col items-center rise">
      <div className="w-full max-w-[340px] flex items-center justify-between mb-3">
        <div>
          <div className="label">{mode === "skipped" ? "reviewing skipped" : current.kind === "discover" ? "discover" : "triage"}</div>
          <div className="readout text-sm text-[var(--muted)]">
            {remaining}
            {noMore || mode === "skipped" ? "" : "+"} left
          </div>
        </div>
        <div className="flex items-center gap-1">
          {mode === "normal" && (
            <button
              className="btn btn-ghost text-sm text-[var(--muted)]"
              onClick={() => commit("skipped", current.tier)}
            >
              <SkipForward size={15} strokeWidth={2} /> Skip
            </button>
          )}
          {mode === "skipped" && (
            <button className="btn btn-ghost text-sm text-[var(--muted)]" onClick={() => setMode("normal")}>
              Exit
            </button>
          )}
          <button
            onClick={undo}
            disabled={i === 0}
            className="btn btn-ghost text-sm text-[var(--muted)] disabled:opacity-30"
          >
            <Undo2 size={15} /> Undo
          </button>
        </div>
      </div>

      <div
        className="relative aspect-[2/3] mb-4 mx-auto max-w-full"
        style={{ height: "min(50vh, 460px)" }}
      >
        {next && (
          <div className="absolute inset-0 scale-[0.94] translate-y-2 rounded-xl overflow-hidden border border-[var(--border)] opacity-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={next.coverImage ?? ""} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <Card key={`${current.kind}-${current.animeId}-${current.itemId ?? "d"}`} card={current} onCommit={commit} />
      </div>

      {/* compact direction compass — swipe or tap */}
      <div className="w-full max-w-[300px] space-y-1.5">
        <div className="flex justify-center">
          <DirCue color="#5aa9e6" arrow="up" Icon={Bookmark} label="Watchlist" onClick={() => activeFling?.("watchlist", "up")} />
        </div>
        <div className="flex justify-between gap-2">
          <DirCue color="#ff6b6b" arrow="left" Icon={Trash2} label="Dropped" onClick={() => activeFling?.("dropped", "left")} />
          <DirCue color="#7bd88f" arrow="right" Icon={Check} label="Watched" onClick={() => activeFling?.("watched", "right")} />
        </div>
        <div className="flex justify-center">
          <DirCue color="#ffb454" arrow="down" Icon={Play} label="Watching" onClick={() => activeFling?.("watching", "down")} />
        </div>
      </div>
    </div>
  );
}

function DirCue({
  color,
  arrow,
  Icon,
  label,
  onClick,
}: {
  color: string;
  arrow: "up" | "down" | "left" | "right";
  Icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  const Arrow = { up: ArrowUp, down: ArrowDown, left: ArrowLeft, right: ArrowRight }[arrow];
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition active:scale-95"
      style={{ borderColor: color, color, background: `${color}14` }}
    >
      <Arrow size={14} strokeWidth={2.5} />
      <Icon size={13} strokeWidth={2} />
      {label}
    </button>
  );
}
