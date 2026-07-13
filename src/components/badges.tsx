import { TIER_META, STATUS_META, type Status, type Tier } from "@/lib/enums";
import { STATUS_ICON } from "@/components/statusIcon";

export function StatusBadge({ status, muted = true }: { status: Status; muted?: boolean }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className="chip" style={muted ? undefined : { color: "var(--text)" }}>
      <Icon size={12} strokeWidth={2} />
      {STATUS_META[status].label}
    </span>
  );
}

export function TierPill({ tier, size = "md" }: { tier: Tier; size?: "sm" | "md" | "lg" }) {
  const m = TIER_META[tier];
  const dim = size === "lg" ? 40 : size === "sm" ? 22 : 30;
  const font = size === "lg" ? "1.05rem" : size === "sm" ? "0.7rem" : "0.85rem";
  const unranked = tier === "unranked";
  return (
    <span
      className="readout inline-flex items-center justify-center font-bold"
      style={{
        width: dim,
        height: dim,
        fontSize: font,
        borderRadius: 7,
        color: unranked ? "var(--faint)" : "#0a0a0c",
        background: unranked ? "transparent" : m.color,
        border: unranked ? "1px solid var(--border-2)" : "none",
      }}
    >
      {m.label}
    </span>
  );
}
