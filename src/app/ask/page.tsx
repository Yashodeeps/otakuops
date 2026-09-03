"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowUp, Loader2, RotateCw } from "lucide-react";

const SUGGESTIONS = [
  "What should I watch next from my watchlist?",
  "Build me a weekend binge from my S and A tiers.",
  "My S-tier is all shonen - recommend something different I already have.",
  "Which half-finished shows are worth finishing?",
];

type Turn = { q: string; a: string | null; error?: string };

export default function AskPage() {
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const lastTurnRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pin the newest question near the top on ask (not on every answer edit,
  // or a long answer would drag the view past its own start).
  useEffect(() => {
    lastTurnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [turns.length]);

  async function ask(question: string, replaceLast = false) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setQ("");
    const history = (replaceLast ? turns.slice(0, -1) : turns)
      .filter((t) => t.a)
      .map((t) => ({ q: t.q, a: t.a as string }));
    setTurns((t) => [...(replaceLast ? t.slice(0, -1) : t), { q: question, a: null }]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      const data = await res.json();
      setTurns((t) =>
        t.map((turn, idx) =>
          idx === t.length - 1
            ? { ...turn, a: res.ok ? data.answer : null, error: res.ok ? undefined : data.error }
            : turn,
        ),
      );
    } catch {
      setTurns((t) => t.map((turn, idx) => (idx === t.length - 1 ? { ...turn, error: "Request failed" } : turn)));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="space-y-4 rise">
      <div>
        <div className="label mb-1 flex items-center gap-1.5">
          <Sparkles size={12} className="text-[var(--accent)]" /> companion
        </div>
        <h1 className="display text-2xl md:text-3xl">Ask your list</h1>
        <p className="text-[var(--muted)] text-sm mt-1.5">
          Knows your whole collection - statuses, tiers, taste.
        </p>
      </div>

      {turns.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="chip hover:border-[var(--faint)] hover:text-[var(--text)] transition"
              onClick={() => ask(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {turns.map((t, i) => (
          <div
            key={i}
            ref={i === turns.length - 1 ? lastTurnRef : undefined}
            className="space-y-2 scroll-mt-20"
          >
            <div className="flex justify-end">
              <span className="panel-2 px-3 py-2 text-sm max-w-[80%]">{t.q}</span>
            </div>
            <div className="panel p-3.5 text-sm whitespace-pre-wrap leading-relaxed">
              {t.a ?? (t.error ? (
                <div className="space-y-2">
                  <span className="text-[var(--tier-s)]">{t.error}</span>
                  <button
                    className="btn btn-ghost !py-1 !px-2 text-xs flex"
                    onClick={() => ask(t.q, true)}
                    disabled={busy}
                  >
                    <RotateCw size={12} /> Retry
                  </button>
                </div>
              ) : (
                <span className="flex items-center gap-2 text-[var(--faint)]">
                  <Loader2 size={14} className="animate-spin" /> thinking
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <form
        className="sticky bottom-14 md:bottom-0 z-10 flex gap-2 bg-[var(--bg)] py-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <input
          ref={inputRef}
          className="input"
          placeholder="Ask about your anime empire…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          enterKeyHint="send"
        />
        <button className="btn btn-primary px-3" disabled={busy || !q.trim()} aria-label="Ask">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} strokeWidth={2.5} />}
        </button>
      </form>
    </div>
  );
}
