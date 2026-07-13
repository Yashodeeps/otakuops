import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ClipboardPaste } from "lucide-react";
import { getCollection } from "@/lib/collection";
import { SetupNeeded } from "@/components/SetupNeeded";
import { TIER_META } from "@/lib/enums";
import type { Tier } from "@/lib/enums";

export const dynamic = "force-dynamic";

const ORDER: Tier[] = ["S", "A", "B", "C", "D", "unranked"];

export default async function TiersPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const rows = await getCollection(userId).catch(() => null);
  if (!rows) return <SetupNeeded />;

  if (rows.length === 0) {
    return (
      <div className="panel p-10 text-center mt-8 max-w-lg mx-auto">
        <div className="label mb-3">no rankings yet</div>
        <h1 className="display text-2xl mb-2">Nothing tiered</h1>
        <p className="text-[var(--muted)] text-sm mb-6">
          Rank shows on the swipe deck (the S/A/B row on each card) and they line up here.
        </p>
        <Link href="/import" className="btn btn-primary">
          <ClipboardPaste size={15} strokeWidth={2} /> Import a list
        </Link>
      </div>
    );
  }

  const byTier = ORDER.map((t) => ({
    tier: t,
    items: rows.filter((r) => r.tier === t && r.coverImage),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-3 rise">
      <div className="mb-1">
        <div className="label mb-1">rankings</div>
        <h1 className="display text-2xl md:text-3xl">Tier board</h1>
        <p className="text-[var(--muted)] text-sm mt-1.5">
          Your rankings at a glance. Set tiers on the swipe deck.
        </p>
      </div>

      {byTier.map(({ tier, items }) => (
        <div key={tier} className="panel flex items-stretch overflow-hidden">
          <div
            className="readout flex items-center justify-center shrink-0 w-14 text-2xl font-bold"
            style={{
              background: tier === "unranked" ? "var(--surface-2)" : TIER_META[tier].color,
              color: tier === "unranked" ? "var(--faint)" : "#0a0a0c",
            }}
          >
            {TIER_META[tier].label}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar p-3">
            {items.map((it) => (
              <div key={it.id} className="shrink-0 w-[66px]" title={it.title}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.coverImage ?? ""}
                  alt={it.title}
                  className="w-[66px] h-[94px] object-cover rounded-md border border-[var(--border)]"
                />
                <div className="text-[10px] mt-1 truncate text-[var(--muted)]">{it.title}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
