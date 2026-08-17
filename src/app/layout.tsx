import type { Metadata, Viewport } from "next";
import { DM_Sans, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { StickerField } from "@/components/StickerField";

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
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// Theme Clerk's UI to match the sakura palette (no @clerk/themes dep needed).
const clerkAppearance = {
  variables: {
    colorPrimary: "#ff4d8d",
    colorBackground: "#141316",
    colorText: "#f3f3f4",
    colorTextSecondary: "#b8b0b6",
    colorInputBackground: "#1b191d",
    colorInputText: "#f3f3f4",
    colorNeutral: "#f3f3f4",
    borderRadius: "10px",
  },
  elements: {
    // Our pages render their own branded header, so hide Clerk's duplicate.
    header: { display: "none" },
    // Make the card read as a distinct panel on the near-black background.
    card: { border: "1px solid #332e37", boxShadow: "none", backgroundColor: "#141316" },
    socialButtonsBlockButton: { borderColor: "#332e37" },
    dividerLine: { backgroundColor: "#242127" },
    footer: { background: "transparent" },
    footerActionText: { color: "#a29aa0" },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html
        lang="en"
        className={`${sans.variable} ${mono.variable} ${display.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <StickerField />
          <NavBar />
          <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 pb-28 pt-5 md:pt-8">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}
