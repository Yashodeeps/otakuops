"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wand2,
  Check,
  ChevronLeft,
  ArrowRight,
  Bot,
  Cpu,
  GalleryHorizontalEnd,
  Loader2,
} from "lucide-react";
import { STATUSES, TIERS, STATUS_META, TIER_META, type Status, type Tier } from "@/lib/enums";
import type { MatchedEntry, MatchCandidate } from "@/lib/match";

type Choice = number | "manual" | "skip";

type Row = {
  rawName: string;
  cleanName: string;
  candidates: MatchCandidate[];
  choice: Choice;
  tier: Tier;
  status: Status;
  autoAccept: boolean;
};

const SAMPLE = `S tier
Frieren - 10/10
Steins;Gate 9/10

Watching:
One Piece
Vinland Saga s2

Plan to watch: Monster, Mushoku Tensei, Apothecary Diaries
Dropped - Bleach (dnf midway)`;

export default function ImportPage() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"input" | "loading" | "review" | "done">("input");
  const [engine, setEngine] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  async function parse() {
    setError(null);
    setPhase("loading");
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "parse failed");
      const data = (await res.json()) as { engine: string; entries: MatchedEntry[] };
      setEngine(data.engine);
      setRows(
        data.entries.map((e) => ({
          rawName: e.parsed.rawName,
          cleanName: e.parsed.cleanName,
          candidates: e.candidates,
          choice: e.candidates.length ? (e.bestId as Choice) : "manual",
          tier: e.parsed.tier,
          status: e.parsed.status,
          autoAccept: e.autoAccept,
        })),
      );
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("input");
    }
  }

  function setRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  async function commit() {
    const items = rows
      .filter((r) => r.choice !== "skip")
      .map((r) => {
        if (r.choice === "manual") {
          return { media: null, manualTitle: r.cleanName, status: r.status, tier: r.tier, sourceRawName: r.rawName };
        }
        const media = r.candidates.find((c) => c.id === r.choice) ?? null;
        return { media, manualTitle: r.cleanName, status: r.status, tier: r.tier, sourceRawName: r.rawName };
      });
    const res = await fetch("/api/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = (await res.json()) as { imported: number };
    setImportedCount(data.imported);
    setPhase("done");
  }

  const keepCount = rows.filter((r) => r.choice !== "skip").length;
  const reviewCount = rows.filter((r) => !r.autoAccept && r.choice !== "skip").length;

  if (phase === "done") {
    return (
      <div className="panel p-10 text-center rise mt-8 max-w-lg mx-auto">
        <div
          className="w-12 h-12 rounded-full grid place-items-center mx-auto mb-4"
          style={{ background: "var(--accent-dim)" }}
        >
          <Check size={22} className="text-[var(--accent)]" strokeWidth={2.5} />
        </div>
        <h1 className="display text-2xl mb-2">{importedCount} added to the empire</h1>
        <p className="text-[var(--muted)] text-sm mb-7">
          Now the fun part — swipe through them and drop each into a bucket.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/swipe" className="btn btn-primary">
            <GalleryHorizontalEnd size={15} strokeWidth={2} /> Start swiping
          </Link>
          <button
            className="btn"
            onClick={() => {
              setText("");
              setRows([]);
              setPhase("input");
            }}
          >
            Paste more
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 rise">
      <div>
        <div className="label mb-1">import</div>
        <h1 className="display text-2xl md:text-3xl">Bring in your list</h1>
        <p className="text-[var(--muted)] text-sm mt-1.5">
          Paste anything — rankings, statuses, bullets, commas. The parser figures it out.
        </p>
      </div>

      {phase !== "review" && (
        <div className="panel p-4 space-y-3">
          <textarea
            className="input font-mono text-sm min-h-[230px] resize-y leading-relaxed"
            placeholder={SAMPLE}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={phase === "loading"}
          />
          <div className="flex items-center gap-3 flex-wrap">
            <button className="btn btn-primary" onClick={parse} disabled={phase === "loading" || !text.trim()}>
              {phase === "loading" ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Parsing + matching
                </>
              ) : (
                <>
                  <Wand2 size={15} strokeWidth={2} /> Parse my list
                </>
              )}
            </button>
            {phase !== "loading" && !text && (
              <button className="btn btn-ghost text-sm text-[var(--muted)]" onClick={() => setText(SAMPLE)}>
                Try a sample
              </button>
            )}
            {error && <span className="text-[var(--tier-s)] text-sm">{error}</span>}
          </div>
          <p className="label leading-relaxed">
            no ai key → local parser handles it · cover art + episode counts from anilist either way
          </p>
        </div>
      )}

      {phase === "review" && (
        <>
          <div className="panel p-3.5 flex items-center justify-between flex-wrap gap-3 sticky top-14 z-20">
            <div className="flex items-center gap-3 text-sm">
              <span>
                <span className="readout font-semibold">{keepCount}</span>{" "}
                <span className="text-[var(--muted)]">to import</span>
              </span>
              <span className="text-[var(--faint)]">·</span>
              <span className="text-[var(--muted)]">
                {reviewCount > 0 ? `${reviewCount} need a look` : "all matched cleanly"}
              </span>
              <span className="chip">
                {engine === "claude" ? <Bot size={12} /> : <Cpu size={12} />}
                {engine === "claude" ? "AI parse" : "local parse"}
              </span>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost text-sm" onClick={() => setPhase("input")}>
                <ChevronLeft size={15} /> Back
              </button>
              <button className="btn btn-primary text-sm" onClick={commit} disabled={keepCount === 0}>
                Import {keepCount} <ArrowRight size={15} strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {rows.map((r, i) => {
              const chosen =
                typeof r.choice === "number" ? r.candidates.find((c) => c.id === r.choice) : null;
              const skipped = r.choice === "skip";
              return (
                <div
                  key={i}
                  className={`panel p-3 flex gap-3 items-start ${skipped ? "opacity-40" : ""}`}
                  style={
                    r.autoAccept && !skipped
                      ? { borderColor: "color-mix(in oklab, var(--accent) 35%, var(--border))" }
                      : undefined
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={chosen?.coverImage ?? ""}
                    alt=""
                    className="w-11 h-16 object-cover rounded bg-[var(--surface-2)] border border-[var(--border)] shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="readout text-xs text-[var(--faint)] truncate">{r.rawName}</span>
                      {r.autoAccept && !skipped && (
                        <span className="chip" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>
                          <Check size={11} strokeWidth={2.5} /> matched
                        </span>
                      )}
                    </div>

                    <select
                      className="input text-sm py-1.5"
                      value={String(r.choice)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRow(i, { choice: v === "manual" || v === "skip" ? (v as Choice) : Number(v) });
                      }}
                    >
                      {r.candidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                          {c.seasonYear ? ` (${c.seasonYear})` : ""} · {c.format ?? "?"} ·{" "}
                          {Math.round(c.score * 100)}%
                        </option>
                      ))}
                      <option value="manual">+ Add “{r.cleanName}” manually (no metadata)</option>
                      <option value="skip">× Skip this one</option>
                    </select>

                    {!skipped && (
                      <div className="flex gap-2 flex-wrap">
                        <select
                          className="input text-xs py-1 w-auto"
                          value={r.status}
                          onChange={(e) => setRow(i, { status: e.target.value as Status })}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_META[s].label}
                            </option>
                          ))}
                        </select>
                        <select
                          className="input text-xs py-1 w-auto"
                          value={r.tier}
                          onChange={(e) => setRow(i, { tier: e.target.value as Tier })}
                        >
                          {TIERS.map((t) => (
                            <option key={t} value={t}>
                              Tier {TIER_META[t].label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
