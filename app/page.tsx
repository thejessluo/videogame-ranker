import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { getRawgGenres } from "@/lib/rawg";
import { createClient } from "@/lib/supabase/server";

const fallbackGenres = [
  { slug: "action", name: "Action" },
  { slug: "role-playing-games-rpg", name: "RPG" },
  { slug: "strategy", name: "Strategy" },
  { slug: "adventure", name: "Adventure" },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const genres = await getRawgGenres().catch(() => fallbackGenres);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Game Ladder</h1>
          <p className="text-sm text-white/70">
            Rank games head-to-head by genre, Beli style.
          </p>
        </div>
        <SignOutButton />
      </header>

      <section className="panel p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Pick a genre to compare</h2>
          <Link href="/rankings" className="text-sm text-[var(--accent-2)]">
            View rankings
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {genres.slice(0, 18).map((genre) => (
            <Link
              key={genre.slug}
              href={`/compare?genre=${genre.slug}`}
              className="btn btn-secondary text-center text-sm"
            >
              {genre.name}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
