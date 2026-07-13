import Link from "next/link";
import { Radio, ExternalLink, ClipboardPaste } from "lucide-react";
import { getFeed } from "@/lib/feed";
import { StatusBadge } from "@/components/badges";
import type { Status } from "@/lib/enums";

export const dynamic = "force-dynamic";

function when(h: number | null): string {
  if (h == null) return "";
  if (h < 0) return "aired recently";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

export default async function FeedPage() {
  const { items } = await getFeed();

  return (
    <div className="space-y-4 rise">
      <div>
        <div className="label mb-1">airing</div>
        <h1 className="display text-2xl md:text-3xl">Living feed</h1>
        <p className="text-[var(--muted)] text-sm mt-1.5">
          Next episodes for shows in your collection. Refreshes when you open it.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="panel p-10 text-center max-w-lg mx-auto">
          <Radio size={22} className="text-[var(--faint)] mx-auto mb-3" strokeWidth={1.75} />
          <p className="text-[var(--muted)] text-sm mb-5">
            Nothing airing from your list right now. Add currently-airing shows and they show up here.
          </p>
          <Link href="/import" className="btn">
            <ClipboardPaste size={15} strokeWidth={2} /> Import
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <a
              key={it.animeId}
              href={it.siteUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="panel p-3 flex items-center gap-3 hover:border-[var(--border-2)] transition group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.coverImage ?? ""} alt="" className="w-11 h-16 object-cover rounded shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-1.5">
                  {it.title}
                  <ExternalLink
                    size={12}
                    className="text-[var(--faint)] opacity-0 group-hover:opacity-100 transition"
                  />
                </div>
                <div className="text-sm text-[var(--muted)] readout mt-0.5">
                  ep {it.episode ?? "?"}
                </div>
                <div className="mt-1.5">
                  <StatusBadge status={it.status as Status} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="readout text-lg font-semibold text-[var(--accent)]">
                  {when(it.airsInHours)}
                </div>
                <div className="label">until air</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
