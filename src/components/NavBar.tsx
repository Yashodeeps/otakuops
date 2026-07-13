"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  ClipboardPaste,
  GalleryHorizontalEnd,
  Trophy,
  Radio,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Empire", icon: LayoutDashboard },
  { href: "/import", label: "Import", icon: ClipboardPaste },
  { href: "/swipe", label: "Swipe", icon: GalleryHorizontalEnd },
  { href: "/tiers", label: "Tiers", icon: Trophy },
  { href: "/feed", label: "Feed", icon: Radio },
  { href: "/ask", label: "Ask", icon: Sparkles },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function NavBar() {
  const pathname = usePathname();
  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span
              className="grid place-items-center w-6 h-6 rounded-md readout text-[13px] font-bold"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              尾
            </span>
            <span className="display text-[15px] tracking-tight">OtakuOps</span>
            <span className="label hidden sm:inline ml-1">command center</span>
          </Link>
          <div className="flex items-center gap-2">
            <nav className="hidden md:flex items-center gap-0.5">
              {TABS.map((t) => {
                const active = isActive(pathname, t.href);
                const Icon = t.icon;
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition ${
                      active
                        ? "text-[var(--text)] bg-[var(--surface-2)]"
                        : "text-[var(--muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    <Icon size={15} strokeWidth={2} color={active ? "var(--accent)" : "currentColor"} />
                    {t.label}
                  </Link>
                );
              })}
            </nav>
            <div className="md:ml-1">
              <UserButton
                appearance={{ elements: { avatarBox: { width: 28, height: 28 } } }}
              />
            </div>
          </div>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur">
        <div className="grid grid-cols-6">
          {TABS.map((t) => {
            const active = isActive(pathname, t.href);
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className="relative flex flex-col items-center gap-1 py-2.5 text-[10px]"
                style={{ color: active ? "var(--text)" : "var(--faint)" }}
              >
                {active && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[var(--accent)]" />
                )}
                <Icon size={18} strokeWidth={2} color={active ? "var(--accent)" : "currentColor"} />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
