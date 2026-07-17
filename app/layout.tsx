import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import Link from "next/link";
import { Club } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "river-street-poker.pages.dev";
  const protocol = host.includes("localhost") ? "http" : "https";
  const metadataBase = new URL(`${protocol}://${host}`);
  const description = "Cash games, tournament results, player stats, and friendly rivalries—all in one place.";

  return {
    metadataBase,
    title: {
      default: "River Street Poker Club",
      template: "%s · River Street Poker",
    },
    description,
    openGraph: {
      type: "website",
      title: "River Street Poker Club",
      description,
      images: [{ url: "/og.png", width: 1728, height: 909, alt: "River Street Poker Club — The ledger behind the legend." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "River Street Poker Club",
      description,
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SiteHeader />
        <main>{children}</main>
        <footer className="mt-20 border-t bg-card/70">
          <div className="page-shell flex flex-col gap-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-foreground">
              <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Club className="size-3.5 fill-current" aria-hidden="true" />
              </span>
              <span className="font-semibold">River Street Poker Club</span>
            </div>
            <p>Good hands. Better stories. Tracked since 2025.</p>
            <div className="flex gap-4">
              <Link href="/standings" className="hover:text-foreground">Standings</Link>
              <Link href="/players" className="hover:text-foreground">Players</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
