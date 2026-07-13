import type { Metadata, Viewport } from "next";
import { DM_Sans, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

const sans = DM_Sans({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "OtakuOps — Anime Command Center",
  description: "Your personal anime empire: import, swipe, rank, track.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "OtakuOps", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavBar />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 pb-28 pt-5 md:pt-8">
          {children}
        </main>
      </body>
    </html>
  );
}
