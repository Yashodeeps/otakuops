"use client";

import { Share2 } from "lucide-react";

// Opens a pre-filled tweet. No Twitter API, no auth, no cost — just an intent URL.
export function ShareToX({
  hours,
  watched,
  total,
}: {
  hours: string;
  watched: number;
  total: number;
}) {
  function share() {
    const text = `My anime empire: ${watched} shows watched, ${hours} sunk, ${total} tracked. 🎴 built with OtakuOps`;
    const url = typeof window !== "undefined" ? window.location.origin : "";
    const intent = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}${
      url ? `&url=${encodeURIComponent(url)}` : ""
    }`;
    window.open(intent, "_blank", "noopener,noreferrer");
  }

  return (
    <button className="btn text-sm" onClick={share}>
      <Share2 size={15} strokeWidth={2} /> Share to X
    </button>
  );
}
