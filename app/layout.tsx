import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { AnimatedLadderLogo } from "@/components/animated-ladder-logo";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeaderNav } from "@/components/site-header-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Game Ladder",
  description: "Rank games head-to-head inside each genre.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="shrink-0 border-b border-white/10">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <Link
              href="/"
              className="-ml-0.5 flex items-center gap-1 text-xl font-semibold tracking-tight text-white transition-opacity hover:opacity-90"
            >
              <AnimatedLadderLogo className="h-10 shrink-0 [aspect-ratio:34/38] w-auto" />
              Game Ladder
            </Link>
            <SiteHeaderNav />
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col pb-16">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
