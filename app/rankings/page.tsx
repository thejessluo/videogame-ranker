import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type RatingRow = {
  rating_mu: number | string;
  comparisons_count: number;
  game: Array<{ name: string; cover_url: string | null }> | null;
};

type RecentRow = {
  created_at: string;
  game: Array<{ name: string }> | null;
};

type RankingsPageProps = {
  searchParams: Promise<{
    genre?: string;
  }>;
};

export default async function RankingsPage({ searchParams }: RankingsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: genreRows } = await supabase
    .from("genre_ratings")
    .select("genre_slug")
    .eq("user_id", user.id)
    .limit(300);

  const genres = Array.from(new Set((genreRows ?? []).map((row) => row.genre_slug)));
  const selectedGenre = params.genre ?? genres[0];

  const { data: ratings } = selectedGenre
    ? await supabase
        .from("genre_ratings")
        .select("rating_mu,comparisons_count,game:games(name,cover_url)")
        .eq("user_id", user.id)
        .eq("genre_slug", selectedGenre)
        .order("rating_mu", { ascending: false })
        .limit(25)
    : { data: [] as RatingRow[] };

  const { data: recent } = await supabase
    .from("comparisons")
    .select("created_at,game:games!comparisons_winner_game_id_fkey(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your rankings</h1>
          <p className="text-sm text-white/70">Per-genre leaderboard</p>
        </div>
        <Link href="/" className="text-sm text-[var(--accent-2)]">
          Back to genres
        </Link>
      </div>

      <section className="panel mb-4 p-4">
        <p className="mb-3 text-sm text-white/70">Genre</p>
        <div className="flex flex-wrap gap-2">
          {genres.length === 0 ? (
            <p className="text-sm text-white/70">No rankings yet. Start comparing first.</p>
          ) : (
            genres.map((genre) => (
              <Link
                key={genre}
                href={`/rankings?genre=${genre}`}
                className={`btn text-sm ${genre === selectedGenre ? "btn-primary" : "btn-secondary"}`}
              >
                {genre}
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="panel mb-4 p-4">
        <h2 className="mb-3 text-lg font-medium">Top in {selectedGenre ?? "genre"}</h2>
        <div className="space-y-2">
          {(ratings ?? []).map((row, index) => {
            const game = row.game?.[0];
            return (
              <div
                key={`${game?.name ?? "game"}-${index}`}
              className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2"
            >
              <p className="truncate text-sm">
                <span className="mr-2 text-white/60">#{index + 1}</span>
                {game?.name ?? "Unknown game"}
              </p>
              <p className="text-xs text-white/70">
                Elo {Math.round(Number(row.rating_mu))} · {row.comparisons_count} battles
              </p>
              </div>
            );
          })}
          {(ratings ?? []).length === 0 ? (
            <p className="text-sm text-white/70">No data in this genre yet.</p>
          ) : null}
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 text-lg font-medium">Recently compared winners</h2>
        <div className="space-y-2">
          {(recent as RecentRow[] | null)?.map((row, index) => {
            const game = row.game?.[0];
            return (
              <p key={index} className="text-sm text-white/80">
                {game?.name ?? "Unknown game"} ·{" "}
                {new Date(row.created_at).toLocaleDateString()}
              </p>
            );
          })}
          {(recent ?? []).length === 0 ? (
            <p className="text-sm text-white/70">No recent comparisons yet.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
