"use client";

import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";

export default function UnlockPage() {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (res.ok) {
      window.location.href = "/";
    } else {
      setError("Wrong passphrase");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh]">
      <form onSubmit={submit} className="panel p-8 w-full max-w-sm text-center space-y-5 rise">
        <div
          className="w-11 h-11 rounded-lg grid place-items-center mx-auto"
          style={{ background: "var(--accent-dim)" }}
        >
          <Lock size={19} className="text-[var(--accent)]" strokeWidth={2} />
        </div>
        <div>
          <div className="display text-xl">OtakuOps</div>
          <div className="label mt-1">private command center</div>
        </div>
        <input
          type="password"
          className="input text-center"
          placeholder="passphrase"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoFocus
        />
        {error && <div className="text-[var(--tier-s)] text-sm">{error}</div>}
        <button className="btn btn-primary w-full" disabled={busy || !key}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : "Unlock"}
        </button>
      </form>
    </div>
  );
}
