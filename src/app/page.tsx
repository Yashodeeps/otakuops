import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  Library,
  Check,
  Play,
  Bookmark,
  GalleryHorizontalEnd,
  ArrowRight,
  ClipboardPaste,
} from "lucide-react";
import { getStats, getCollection } from "@/lib/collection";
import { formatHours } from "@/lib/hours";
import { STATUS_META, STATUSES, type Status } from "@/lib/enums";
import { TierPill } from "@/components/badges";
import { STATUS_ICON } from "@/components/statusIcon";
import { ShareToX } from "@/components/ShareToX";
import { SetupNeeded } from "@/components/SetupNeeded";

export const dynamic = "force-dynamic";

function EmptyState() {
  return (
    <div className="panel p-10 md:p-14 text-center rise mt-8 max-w-xl mx-auto">
      <div className="label mb-4">no data // empire not initialized</div>
      <h1 className="display text-2xl md:text-3xl mb-3">Build your anime empire</h1>
      <p className="text-[var(--muted)] max-w-sm mx-auto mb-7 text-sm leading-relaxed">
        Paste the list rotting in your notes app. OtakuOps parses it, matches every title to real
        cover art, and hands you a deck to triage the whole backlog.
      </p>
      <Link href="/import" className="btn btn-primary">
        <ClipboardPaste size={15} strokeWidth={2} /> Import a list
      </Link>
    </div>
  );
}

function StatCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: typeof Library;
}) {
  return (
    <div className="panel p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <Icon size={14} className="text-[var(--faint)]" strokeWidth={2} />
      </div>
      <div className="readout text-3xl md:text-[2.1rem] font-semibold leading-none">{value}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const data = await Promise.all([getStats(userId), getCollection(userId)]).catch(() => null);
  if (!data) return <SetupNeeded />;
  const [stats, collection] = data;
  if (stats.total === 0) return <EmptyState />;

  const untriaged = stats.byStatus["untriaged"] ?? 0;
  const maxStatus = Math.max(1, ...STATUSES.map((s) => stats.byStatus[s] ?? 0));
  const topShows = collection
    .filter((c) => c.tier !== "unranked" && c.coverImage)
    .sort((a, b) => "SABCD".indexOf(a.tier) - "SABCD".indexOf(b.tier))
    .slice(0, 6);

  return (
    <div className="space-y-6 rise">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="label mb-1">overview</div>
          <h1 className="display text-2xl md:text-3xl">The Empire</h1>
        </div>
        <div className="flex items-center gap-2">
          <ShareToX
            hours={formatHours(stats.totalHours)}
            watched={stats.watchedCount}
            total={stats.total}
          />
          {untriaged > 0 && (
            <Link href="/swipe" className="btn btn-primary text-sm">
              <GalleryHorizontalEnd size={15} strokeWidth={2} /> Triage {untriaged}
            </Link>
          )}
        </div>
      </div>

      {/* hero readout */}
      <div className="panel p-6 md:p-8 relative">
        <span
          className="absolute left-0 top-6 bottom-6 w-[3px] rounded-full"
          style={{ background: "var(--accent)" }}
        />
        <div className="label mb-3 pl-4">total hours committed</div>
        <div className="pl-4 flex items-baseline gap-2">
          <span className="readout text-6xl md:text-7xl font-bold leading-none">
            {formatHours(stats.totalHours).replace(/[hm]$/, "")}
          </span>
          <span className="readout text-2xl text-[var(--accent)] font-semibold">
            {stats.totalHours < 1 ? "min" : "hrs"}
          </span>
        </div>
        <div className="pl-4 mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--muted)] readout">
          <span>{stats.watchedCount} watched</span>
          <span>{stats.totalEpisodes.toLocaleString()} episodes</span>
          <span>{Math.round(stats.totalHours / 24)} days of your life</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="collection" value={String(stats.total)} Icon={Library} />
        <StatCard label="watched" value={String(stats.watchedCount)} Icon={Check} />
        <StatCard label="watching" value={String(stats.byStatus["watching"] ?? 0)} Icon={Play} />
        <StatCard label="backlog" value={String(stats.byStatus["watchlist"] ?? 0)} Icon={Bookmark} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* status breakdown — monochrome bars */}
        <div className="panel p-5">
          <div className="label mb-4">by status</div>
          <div className="space-y-2.5">
            {STATUSES.map((s) => {
              const n = stats.byStatus[s] ?? 0;
              const Icon = STATUS_ICON[s as Status];
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-sm w-32 shrink-0 text-[var(--muted)]">
                    <Icon size={13} strokeWidth={2} />
                    {STATUS_META[s as Status].label}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--muted)]"
                      style={{ width: `${(n / maxStatus) * 100}%` }}
                    />
                  </div>
                  <span className="readout text-sm text-[var(--muted)] w-6 text-right">{n}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* tiers + genres */}
        <div className="panel p-5 space-y-5">
          <div>
            <div className="label mb-3">tier spread</div>
            <div className="flex gap-2.5 flex-wrap">
              {(["S", "A", "B", "C", "D"] as const).map((t) => (
                <div key={t} className="flex flex-col items-center gap-1.5">
                  <TierPill tier={t} />
                  <span className="readout text-xs text-[var(--muted)]">{stats.tiers[t] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-[var(--border)] pt-4">
            <div className="label mb-3">top genres</div>
            <div className="flex flex-wrap gap-1.5">
              {stats.genres.length === 0 ? (
                <span className="text-sm text-[var(--faint)]">
                  Mark shows watched to reveal your taste.
                </span>
              ) : (
                stats.genres.map((g) => (
                  <span key={g.name} className="chip">
                    {g.name} <span className="readout text-[var(--faint)]">{g.count}</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {topShows.length > 0 && (
        <div className="panel p-5">
          <div className="label mb-4">top ranked</div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {topShows.map((s) => (
              <div key={s.id} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.coverImage ?? ""}
                  alt={s.title}
                  className="w-full aspect-[2/3] object-cover rounded-md border border-[var(--border)]"
                />
                <div className="absolute top-1.5 left-1.5">
                  <TierPill tier={s.tier} size="sm" />
                </div>
                <div className="text-[11px] mt-1.5 truncate text-[var(--muted)]">{s.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-1">
        <Link href="/import" className="btn btn-ghost text-sm text-[var(--muted)]">
          Add more to the empire <ArrowRight size={14} strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}
