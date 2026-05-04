import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About · Game Ladder",
  description: "Why Game Ladder exists and how it works.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl">About</h1>

      <div className="panel space-y-5 p-6 text-sm leading-relaxed text-white/85 sm:p-8 sm:text-base">
        <p>Hi, I&apos;m Jess, and I love video games.</p>
        <p>
          For a long time I wanted a simple way to rank which games I liked most by comparing games
          head-to-head (aka, exactly like Beli). That way you learn what your real &quot;favorite
          games&quot; are by choosing between pairs, as opposed to giving them stars, numbers, or
          otherwise assigning an arbitrary number yourself.
        </p>
        <p>
          I also wanted to share that list with friends so we could compare tastes and discover what
          to play next. I looked around and couldn&apos;t find an app that did exactly that the way I
          pictured it, so I built Game Ladder (with the help of my best friend, Cursor!)
        </p>
        <p>
          Here you can build your ladder, filter by genre, and (when you sign in) keep rankings on
          your account, bookmark games you haven&apos;t yet played, and connect with friends. Thanks for
          stopping by {' <3'}
        </p>
      </div>

      <p className="mt-8 text-center text-sm text-white/55">
        <Link href="/" className="text-[var(--accent-2)] hover:underline">
          ← Back to home
        </Link>
      </p>
    </main>
  );
}
