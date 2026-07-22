// Dynamic, shareable stat cards rendered as PNG via Satori (next/og).
// One endpoint, many variants: /api/share-card?variant=empire|hours|collection|tiers|taste
//
// Signed-in requests render the caller's real empire; signed-out requests render
// DEMO_STATS so the URL is always a valid image (handy as a generic OG image and
// for previewing without a session). Satori only supports flexbox + a CSS subset,
// so every container sets display:flex and we avoid grid/custom fonts entirely —
// these images must always render, everywhere they're pasted.
import { ImageResponse } from "next/og";
import { auth } from "@clerk/nextjs/server";
import { getStats } from "@/lib/collection";
import {
  deriveCardStats,
  loadMascot,
  DEMO_STATS,
  OG,
  TIER_KEYS,
  type CardStats,
  type TierKey,
} from "@/lib/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIZE = { width: 1200, height: 630 };

type Variant = "empire" | "hours" | "collection" | "tiers" | "taste";
const VARIANTS: Variant[] = ["empire", "hours", "collection", "tiers", "taste"];

const KICKER: Record<Variant, string> = {
  empire: "Anime Empire",
  hours: "Hours Committed",
  collection: "The Collection",
  tiers: "Certified Taste",
  taste: "Anime DNA",
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("variant") ?? "empire";
  const variant: Variant = (VARIANTS as string[]).includes(raw) ? (raw as Variant) : "empire";

  const { userId } = await auth();
  let s: CardStats;
  try {
    s = userId ? deriveCardStats(await getStats(userId)) : DEMO_STATS;
  } catch {
    s = DEMO_STATS;
  }
  const mascot = await loadMascot();

  return new ImageResponse(<Card variant={variant} s={s} mascot={mascot} />, {
    ...SIZE,
    // Per-user stats — never let a browser cache one user's card for another,
    // and keep in-app previews fresh as the empire changes.
    headers: { "cache-control": "no-store, max-age=0" },
  });
}

// ---- shared pieces ------------------------------------------------------------

function Card({ variant, s, mascot }: { variant: Variant; s: CardStats; mascot: string | null }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        backgroundColor: OG.bg,
        backgroundImage: `radial-gradient(720px 520px at 100% -5%, ${hex(OG.accent, 0.14)}, transparent 62%)`,
        color: OG.text,
        padding: 52,
        fontFamily: "sans-serif",
      }}
    >
      {/* left: the readout. Three bands — kicker (top), content (fills + centers),
          footer (bottom). The middle band is flex:1 so tall content can never
          overlap the kicker/footer the way justify-content:space-between would. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          paddingRight: 44,
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", flexShrink: 0 }}>
          <Kicker>{KICKER[variant]}</Kicker>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            gap: 24,
            minHeight: 0,
          }}
        >
          {variant === "empire" && <Empire s={s} />}
          {variant === "hours" && <Hours s={s} />}
          {variant === "collection" && <Collection s={s} />}
          {variant === "tiers" && <Tiers s={s} />}
          {variant === "taste" && <Taste s={s} />}
        </div>

        <div style={{ display: "flex", flexShrink: 0 }}>
          <Footer />
        </div>
      </div>

      {/* right: the mascot */}
      <Mascot mascot={mascot} />
    </div>
  );
}

function Kicker({ children }: { children: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 26, height: 4, borderRadius: 2, backgroundColor: OG.accent, display: "flex" }} />
      <div
        style={{
          fontSize: 22,
          letterSpacing: 5,
          textTransform: "uppercase",
          color: OG.accent,
          fontWeight: 600,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Big number + unit, baseline-aligned. The signature "readout" of every card.
function Hero({ num, unit, size = 168 }: { num: string; unit: string; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
      <div style={{ fontSize: size, fontWeight: 800, lineHeight: 0.86, letterSpacing: -3, color: OG.text }}>
        {num}
      </div>
      <div style={{ fontSize: size * 0.24, fontWeight: 700, color: OG.accent, paddingBottom: size * 0.1 }}>
        {unit}
      </div>
    </div>
  );
}

function Subline({ children }: { children: string }) {
  return <div style={{ fontSize: 30, color: OG.muted, fontWeight: 500, display: "flex" }}>{children}</div>;
}

function StatRow({ items }: { items: { num: string; label: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "row", gap: 40, marginTop: 6 }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1, color: OG.text, lineHeight: 1 }}>
            {it.num}
          </div>
          <div
            style={{
              fontSize: 17,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: OG.faint,
              fontWeight: 600,
            }}
          >
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function TierRow({ counts }: { counts: Record<TierKey, number> }) {
  return (
    <div style={{ display: "flex", flexDirection: "row", gap: 12, marginTop: 4 }}>
      {TIER_KEYS.map((t) => (
        <div key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 58,
              height: 58,
              borderRadius: 13,
              backgroundColor: OG.tier[t],
              color: "#1a0f0f",
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            {t}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: OG.muted, display: "flex" }}>{counts[t]}</div>
        </div>
      ))}
    </div>
  );
}

// ---- variants -----------------------------------------------------------------

// NB: every variant returns a SINGLE flex <div>, never a Fragment — Satori
// doesn't lay Fragment children out as flex items (they collapse onto each other).
function Col({ gap, children }: { gap: number; children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap }}>{children}</div>;
}

function Empire({ s }: { s: CardStats }) {
  return (
    <Col gap={26}>
      <Col gap={8}>
        <Hero num={s.hoursNum} unit={s.hoursUnit} size={120} />
        <Subline>{`${s.watched} watched · ${s.total} tracked · ${fmt(s.episodes)} episodes`}</Subline>
      </Col>
      <TierRow counts={s.tierCounts} />
    </Col>
  );
}

function Hours({ s }: { s: CardStats }) {
  return (
    <Col gap={22}>
      <Hero num={s.hoursNum} unit={s.hoursUnit} size={168} />
      <Subline>{`≈ ${fmt(s.days)} days of my life — no regrets`}</Subline>
      <StatRow
        items={[
          { num: fmt(s.episodes), label: "episodes" },
          { num: fmt(s.watched), label: "shows finished" },
        ]}
      />
    </Col>
  );
}

function Collection({ s }: { s: CardStats }) {
  return (
    <Col gap={22}>
      <Hero num={fmt(s.total)} unit="anime" size={168} />
      <Subline>tracked, ranked & triaged in the empire</Subline>
      <StatRow
        items={[
          { num: fmt(s.watched), label: "watched" },
          { num: fmt(s.watching), label: "watching" },
          { num: fmt(s.backlog), label: "backlog" },
        ]}
      />
    </Col>
  );
}

function Tiers({ s }: { s: CardStats }) {
  return (
    <Col gap={26}>
      <Hero num={fmt(s.sCount)} unit="S-tier" size={150} />
      <Subline>shows I&apos;d stake my whole reputation on</Subline>
      <TierRow counts={s.tierCounts} />
    </Col>
  );
}

function Taste({ s }: { s: CardStats }) {
  const max = Math.max(1, ...s.topGenres.map((g) => g.count));
  const genres = s.topGenres.length ? s.topGenres : [{ name: "—", count: 0 }];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      {genres.map((g) => (
        <div key={g.name} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 18 }}>
          <div style={{ width: 190, fontSize: 30, fontWeight: 700, color: OG.text, display: "flex" }}>
            {g.name}
          </div>
          <div
            style={{
              display: "flex",
              flex: 1,
              height: 18,
              borderRadius: 9,
              backgroundColor: OG.surface2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                width: `${Math.round((g.count / max) * 100)}%`,
                height: "100%",
                borderRadius: 9,
                backgroundColor: OG.accent,
              }}
            />
          </div>
          <div style={{ width: 52, fontSize: 24, fontWeight: 700, color: OG.muted, display: "flex" }}>
            {g.count}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- footer + mascot ----------------------------------------------------------

function Footer() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: -0.5, color: OG.text, display: "flex" }}>
        OtakuOps
      </div>
      <div style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: OG.faint, display: "flex" }} />
      <div style={{ fontSize: 22, color: OG.faint, fontWeight: 500, display: "flex" }}>
        your anime command center
      </div>
    </div>
  );
}

function Mascot({ mascot }: { mascot: string | null }) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        width: 366,
        borderRadius: 22,
        border: `1px solid ${OG.border2}`,
        backgroundColor: OG.surface,
        backgroundImage: `linear-gradient(180deg, ${hex(OG.accent, 0.1)} 0%, ${OG.surface} 45%, ${OG.bg} 100%)`,
        overflow: "hidden",
      }}
    >
      {mascot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mascot}
          alt=""
          width={366}
          height={526}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        // Designed empty slot — reads as an intentional brand panel, not a broken
        // image. Drop public/mascot/momo.png to fill it (see that dir's README).
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundImage: `radial-gradient(circle at 50% 40%, ${hex(OG.accent, 0.55)}, ${hex(OG.accent, 0)} 70%)`,
              fontSize: 92,
            }}
          >
            🎴
          </div>
        </div>
      )}

      {/* handle chip, floats over whichever background is showing */}
      <div style={{ display: "flex", padding: 20, position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 999,
            backgroundColor: hex("#000000", 0.55),
            border: `1px solid ${OG.border2}`,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: OG.accent, display: "flex" }} />
          <div style={{ fontSize: 20, fontWeight: 700, color: OG.text, display: "flex" }}>otakuops</div>
        </div>
      </div>
    </div>
  );
}

// ---- utils --------------------------------------------------------------------

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

// hex + alpha -> rgba() string (Satori is happiest with explicit rgba).
function hex(h: string, a: number): string {
  const v = h.replace("#", "");
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
