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
  type LucideIcon,
} from "lucide-react";
import { TIER_META, type Status, type Tier } from "@/lib/enums";
import type { CollectionRow } from "@/lib/collection";

type Dir = "left" | "right" | "up" | "down";

const DIR: Record<Dir, { status: Status; label: string; color: string; Icon: LucideIcon }> = {
  right: { status: "watched", label: "Watched", color: "#7bd88f", Icon: Check },
  left: { status: "dropped", label: "Dropped", color: "#ff6b6b", Icon: Trash2 },
  up: { status: "watchlist", label: "Watchlist", color: "#5aa9e6", Icon: Bookmark },
  down: { status: "watching", label: "Watching", color: "#ffb454", Icon: Play },
};

const THRESHOLD = 110;

function Card({ item, onCommit }: { item: CollectionRow; onCommit: (s: Status, t: Tier) => void }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-12, 12]);
  const [tier, setTier] = useState<Tier>(item.tier);
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
          src={item.coverImage ?? ""}
          alt={item.title}
          draggable={false}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 p-4 bg-black/80 backdrop-blur-md border-t border-white/10">
          <div className="flex items-center gap-2 label mb-1.5 text-white/50">
            {item.format && <span>{item.format}</span>}
            {item.episodes && <span>· {item.episodes} ep</span>}
            {item.seasonYear && <span>· {item.seasonYear}</span>}
            {item.averageScore && (
              <span className="flex items-center gap-0.5">
                · <Star size={10} fill="currentColor" /> {item.averageScore}
              </span>
            )}
          </div>
          <h2 className="display text-xl md:text-2xl text-white leading-tight">{item.title}</h2>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {item.genres.slice(0, 3).map((g) => (
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
            {(["S", "A", "B", "C", "D"] as const).map((t) => (
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

export default function SwipePage() {
  const [items, setItems] = useState<CollectionRow[] | null>(null);
  const [i, setI] = useState(0);
  const [history, setHistory] = useState<{ id: string; status: Status; tier: Tier }[]>([]);

  useEffect(() => {
    fetch("/api/collection?status=untriaged")
      .then((r) => r.json())
      .then((d: { items: CollectionRow[] }) => setItems(d.items));
  }, []);

  const commit = useCallback(
    (status: Status, tier: Tier) => {
      setItems((prev) => {
        if (!prev) return prev;
        const item = prev[i];
        if (!item) return prev;
        setHistory((h) => [...h, { id: item.id, status: item.status, tier: item.tier }]);
        fetch(`/api/collection/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, tier }),
        }).catch(() => {});
        return prev;
      });
      setI((n) => n + 1);
    },
    [i],
  );

  function undo() {
    if (i === 0) return;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setI((n) => n - 1);
    if (last) {
      fetch(`/api/collection/${last.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "untriaged", tier: last.tier }),
      }).catch(() => {});
    }
  }

  if (!items) return <div className="text-center label mt-20">loading deck…</div>;

  if (items.length === 0 || i >= items.length) {
    return (
      <div className="panel p-10 text-center rise mt-8 max-w-lg mx-auto">
        <div
          className="w-12 h-12 rounded-full grid place-items-center mx-auto mb-4"
          style={{ background: "var(--accent-dim)" }}
        >
          <Check size={22} className="text-[var(--accent)]" strokeWidth={2.5} />
        </div>
        <h1 className="display text-2xl mb-2">
          {items.length === 0 ? "Nothing to triage" : "Deck cleared"}
        </h1>
        <p className="text-[var(--muted)] text-sm mb-7">
          {items.length === 0
            ? "Import a list and untriaged shows land here to swipe."
            : `You sorted ${items.length} shows. Go admire the empire.`}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/" className="btn btn-primary">See the empire</Link>
          <Link href="/import" className="btn">Import more</Link>
        </div>
      </div>
    );
  }

  const current = items[i];
  const next = items[i + 1];
  const remaining = items.length - i;

  return (
    <div className="flex flex-col items-center rise">
      <div className="w-full max-w-[340px] flex items-center justify-between mb-3">
        <div>
          <div className="label">triage</div>
          <div className="readout text-sm text-[var(--muted)]">{remaining} remaining</div>
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
        <Card key={current.id} item={current} onCommit={commit} />
      </div>

      {/* direction legend */}
      <div className="grid grid-cols-2 gap-y-1 gap-x-8 label mb-3 w-full max-w-[340px]">
        <span>← dropped</span>
        <span className="text-right">watched →</span>
        <span>↓ watching</span>
        <span className="text-right">watchlist ↑</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-center max-w-[360px]">
        <ActionBtn color="#ff6b6b" Icon={Trash2} label="Drop" onClick={() => activeFling?.("dropped", "left")} />
        <ActionBtn color="#ffb454" Icon={Play} label="Watching" onClick={() => activeFling?.("watching", "down")} />
        <ActionBtn color="#c9a4ff" Icon={Hourglass} label="Half" onClick={() => commit("half_finished", current.tier)} />
        <ActionBtn color="#5aa9e6" Icon={Bookmark} label="Later" onClick={() => activeFling?.("watchlist", "up")} />
        <ActionBtn color="#7bd88f" Icon={Check} label="Watched" onClick={() => activeFling?.("watched", "right")} />
      </div>
    </div>
  );
}

function ActionBtn({
  color,
  Icon,
  label,
  onClick,
}: {
  color: string;
  Icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="btn text-sm" style={{ color }} onClick={onClick}>
      <Icon size={15} strokeWidth={2} />
      {label}
    </button>
  );
}
