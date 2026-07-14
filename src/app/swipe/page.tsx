"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";
import {
  Check,
  Trash2,
  Bookmark,
  Play,
  Hourglass,
  Undo2,
  Star,
  Flame,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  SkipForward,
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
        <div className="absolute inset-x-0 bottom-0 p-4 bg-black/80 backdrop-blur-md border-t border-white/10">
          <div className="flex items-center gap-2 label mb-1.5 text-white/50">
            {card.format && <span>{card.format}</span>}
            {card.episodes && <span>· {card.episodes} ep</span>}
            {card.seasonYear && <span>· {card.seasonYear}</span>}
            {card.averageScore && (
              <span className="flex items-center gap-0.5">
                · <Star size={10} fill="currentColor" /> {card.averageScore}
              </span>
            )}
          </div>
          <h2 className="display text-xl md:text-2xl text-white leading-tight">{card.title}</h2>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {card.genres.slice(0, 3).map((g) => (
              <span
                key={g}
                className="text-[11px] px-2 py-0.5 rounded border text-white/70"
                style={{ borderColor: "rgba(255,255,255,0.2)" }}
              >
                {g}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <span className="label text-white/40 mr-1">rank</span>
            {(["S", "A", "B", "C", "D", "E"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className="readout w-7 h-7 rounded-md text-sm font-bold transition"
                style={{
                  background: tier === t ? TIER_META[t].color : "rgba(255,255,255,0.08)",
                  color: tier === t ? "#0a0a0c" : "rgba(255,255,255,0.85)",
                  outline: tier === t ? "2px solid rgba(255,255,255,0.9)" : "none",
                  outlineOffset: -2,
                }}
              >
                {t}
              </button>
            ))}
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

type HistoryEntry = { card: DeckCard; createdId?: string; skipped?: boolean };

export default function SwipePage() {
  const [cards, setCards] = useState<DeckCard[] | null>(null);
  const [i, setI] = useState(0);
  const [page, setPage] = useState(1);
  const [noMore, setNoMore] = useState(false);
  const history = useRef<HistoryEntry[]>([]);
  const loadingMore = useRef(false);
  const seen = useRef<Set<number>>(new Set());

  const appendCards = useCallback((incoming: DeckCard[]) => {
    setCards((prev) => {
      const base = prev ?? [];
      const fresh = incoming.filter((c) => {
        if (c.animeId == null) return true;
        if (seen.current.has(c.animeId)) return false;
        seen.current.add(c.animeId);
        return true;
      });
      return [...base, ...fresh];
    });
  }, []);

  useEffect(() => {
    fetch("/api/deck?page=1")
      .then((r) => r.json())
      .then((d: { cards: DeckCard[]; nextPage: number }) => {
        d.cards.forEach((c) => c.animeId != null && seen.current.add(c.animeId));
        setCards(d.cards);
        setPage(d.nextPage);
        if (d.cards.length === 0) setNoMore(true);
      })
      .catch(() => setCards([]));
  }, []);

  const fetchMore = useCallback(async () => {
    if (loadingMore.current || noMore) return;
    loadingMore.current = true;
    try {
      const r = await fetch(`/api/deck?page=${page}`);
      const d = (await r.json()) as { cards: DeckCard[]; nextPage: number };
      const discover = d.cards.filter((c) => c.kind === "discover");
      if (discover.length === 0) setNoMore(true);
      else {
        appendCards(discover);
        setPage(d.nextPage);
      }
    } catch {
      /* keep whatever we have */
    } finally {
      loadingMore.current = false;
    }
  }, [page, noMore, appendCards]);

  const commit = useCallback(
    (status: Status, tier: Tier) => {
      const card = cards?.[i];
      if (!card) return;
      const entry: HistoryEntry = { card };
      history.current.push(entry);

      if (card.kind === "collection" && card.itemId) {
        fetch(`/api/collection/${card.itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, tier }),
        }).catch(() => {});
      } else if (card.kind === "discover" && card.media) {
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

      setI((n) => {
        const next = n + 1;
        if (cards && cards.length - next <= 5) fetchMore();
        return next;
      });
    },
    [cards, i, fetchMore],
  );

  // Skip: advance without touching the collection (decide later).
  const skip = useCallback(() => {
    const card = cards?.[i];
    if (!card) return;
    history.current.push({ card, skipped: true });
    setI((n) => {
      const next = n + 1;
      if (cards && cards.length - next <= 5) fetchMore();
      return next;
    });
  }, [cards, i, fetchMore]);

  function undo() {
    if (i === 0) return;
    const entry = history.current.pop();
    setI((n) => n - 1);
    if (!entry || entry.skipped) return; // skip wrote nothing to revert
    if (entry.card.kind === "collection" && entry.card.itemId) {
      fetch(`/api/collection/${entry.card.itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "untriaged", tier: entry.card.tier }),
      }).catch(() => {});
    } else if (entry.card.kind === "discover" && entry.createdId) {
      fetch(`/api/collection/${entry.createdId}`, { method: "DELETE" }).catch(() => {});
    }
  }

  if (!cards) return <div className="text-center label mt-20">loading deck…</div>;

  if (i >= cards.length) {
    return (
      <div className="panel p-10 text-center rise mt-8 max-w-lg mx-auto">
        <div
          className="w-12 h-12 rounded-full grid place-items-center mx-auto mb-4"
          style={{ background: "var(--accent-dim)" }}
        >
          <Check size={22} className="text-[var(--accent)]" strokeWidth={2.5} />
        </div>
        <h1 className="display text-2xl mb-2">All caught up</h1>
        <p className="text-[var(--muted)] text-sm mb-7">
          You&apos;ve swiped through everything for now. Go admire the empire — or import a list to
          add more.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/" className="btn btn-primary">See the empire</Link>
          <Link href="/import" className="btn">Import a list</Link>
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
          <div className="label">{current.kind === "discover" ? "discover" : "triage"}</div>
          <div className="readout text-sm text-[var(--muted)]">
            {remaining}
            {noMore ? "" : "+"} in deck
          </div>
        </div>
        <button
          onClick={undo}
          disabled={i === 0}
          className="btn btn-ghost text-sm text-[var(--muted)] disabled:opacity-30"
        >
          <Undo2 size={15} /> Undo
        </button>
      </div>

      <div className="relative w-full max-w-[340px] aspect-[2/3] mb-4">
        {next && (
          <div className="absolute inset-0 scale-[0.94] translate-y-2 rounded-xl overflow-hidden border border-[var(--border)] opacity-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={next.coverImage ?? ""} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <Card key={`${current.kind}-${current.animeId}-${current.itemId ?? "d"}`} card={current} onCommit={commit} />
      </div>

      {/* direction compass — big, color-coded, and tappable (swipe or tap) */}
      <div className="w-full max-w-[340px] space-y-2 mb-3">
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

      {/* non-directional actions */}
      <div className="flex items-center gap-2 justify-center">
        <button
          className="btn text-sm"
          style={{ color: "#c9a4ff" }}
          onClick={() => commit("half_finished", current.tier)}
        >
          <Hourglass size={15} strokeWidth={2} /> Half-finished
        </button>
        <button className="btn text-sm text-[var(--muted)]" onClick={skip}>
          <SkipForward size={15} strokeWidth={2} /> Skip
        </button>
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
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm font-semibold transition active:scale-95"
      style={{ borderColor: color, color, background: `${color}14` }}
    >
      <Arrow size={16} strokeWidth={2.5} />
      <Icon size={15} strokeWidth={2} />
      {label}
    </button>
  );
}
