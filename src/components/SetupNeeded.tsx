"use client";

import { useState } from "react";
import { Database } from "lucide-react";

// Shown when the app is authenticated but the Postgres DB isn't reachable yet
// (e.g. DATABASE_URL not set). Keeps first-run from crashing into a 500.
export function SetupNeeded() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Ask the server whether the database answers yet, so finishing setup doesn't
  // mean guessing when to reload.
  async function recheck() {
    setChecking(true);
    try {
      const res = await fetch("/api/status");
      const { db } = (await res.json()) as { db?: string };
      setResult(
        db === "up"
          ? "Database answered. Reload the page."
          : "Still no answer from the database.",
      );
    } catch {
      setResult("Could not reach the app to ask.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="panel p-10 text-center mt-8 max-w-lg mx-auto rise">
      <div
        className="w-11 h-11 rounded-lg grid place-items-center mx-auto mb-4"
        style={{ background: "var(--accent-dim)" }}
      >
        <Database size={19} className="text-[var(--accent)]" strokeWidth={2} />
      </div>
      <div className="label mb-2">setup // database not connected</div>
      <h1 className="display text-2xl mb-2">Almost there</h1>
      <p className="text-[var(--muted)] text-sm mb-3">
        You&apos;re signed in - auth works. The last step is connecting a Postgres database so your
        empire has somewhere to live.
      </p>
      <p className="text-[var(--faint)] text-xs">
        Set <span className="readout">DATABASE_URL</span> (a Neon connection string) in{" "}
        <span className="readout">.env</span>, then run{" "}
        <span className="readout">pnpm prisma db push</span>.
      </p>
      <button
        onClick={recheck}
        disabled={checking}
        className="mt-5 text-xs underline text-[var(--muted)] disabled:opacity-50"
      >
        {checking ? "Checking..." : "Check connection"}
      </button>
      {result && <p className="text-[var(--faint)] text-xs mt-2">{result}</p>}
    </div>
  );
}
