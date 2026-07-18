import type { Metadata } from "next";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const metadataBase = new URL(`${protocol}://${host}`);
  const description = "Tournament and cash-game results for A-Town Poker.";

  return {
    metadataBase,
    title: {
      default: "A-Town Poker",
      template: "%s · A-Town Poker",
    },
    description,
    openGraph: {
      type: "website",
      title: "A-Town Poker",
      description,
      images: [{ url: "/og.png", width: 1728, height: 909, alt: "A-Town Poker results and standings." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "A-Town Poker",
      description,
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
