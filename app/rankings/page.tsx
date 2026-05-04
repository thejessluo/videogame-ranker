import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RerankButton } from "@/components/rerank-button";
import { createClient } from "@/lib/supabase/server";

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

  const { data: rankingRows } = await supabase
    .from("user_game_rankings")
    .select(
      "rank_position,score,status,broad_rating,notes,tags,game:games(id,name,cover_url,genres_json)",
    )
    .eq("user_id", user.id)
    .eq("list_scope", "global")
    .eq("list_key", "all")
    .order("rank_position", { ascending: true });

  const allGenres = Array.from(
    new Set(
      (rankingRows ?? [])
        .flatMap((row) => {
          const game = Array.isArray(row.game) ? row.game[0] : row.game;
          return (game as { genres_json?: Array<{ name?: string }> } | null)
            ?.genres_json ?? [];
        })
        .map((genre: { name?: string }) => genre?.name)
        .filter(Boolean),
    ),
  ) as string[];

  const selectedGenre = params.genre?.trim();
  const readGame = (value: unknown) => {
    if (Array.isArray(value)) return value[0] ?? null;
    if (value && typeof value === "object") return value as Record<string, unknown>;
    return null;
  };
  const filteredRows = selectedGenre
    ? (rankingRows ?? []).filter((row) =>
        (((readGame(row.game)?.genres_json as Array<{ name?: string }>) ?? [])).some(
          (genre: { name?: string }) => genre?.name === selectedGenre,
        ),
      )
    : (rankingRows ?? []);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your global ranking</h1>
          <p className="text-sm text-white/70">Binary-search inserted order is source of truth.</p>
        </div>
        <Link href="/" className="text-sm text-[var(--accent-2)]">
          Add another game
        </Link>
      </div>

      <section className="panel mb-4 p-4">
        <p className="mb-3 text-sm text-white/70">Filter by genre</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/rankings"
            className={`btn text-sm ${!selectedGenre ? "btn-primary" : "btn-secondary"}`}
          >
            All
          </Link>
          {allGenres.map((genre) => (
            <Link
              key={genre}
              href={`/rankings?genre=${encodeURIComponent(genre)}`}
              className={`btn text-sm ${genre === selectedGenre ? "btn-primary" : "btn-secondary"}`}
            >
              {genre}
            </Link>
          ))}
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 text-lg font-medium">
          Ranked games {selectedGenre ? `· ${selectedGenre}` : ""}
        </h2>
        <div className="space-y-2">
          {filteredRows.map((row) => {
            const game = readGame(row.game) as
              | { id?: string; name?: string; cover_url?: string | null }
              | null;
            return (
              <div
                key={`${game?.id ?? "game"}-${row.rank_position}`}
                className="rounded-xl bg-black/20 px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  {game?.cover_url ? (
                    <Image
                      src={game.cover_url}
                      alt={game?.name ?? "Game cover"}
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-md bg-white/10" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      <span className="mr-2 text-white/60">#{row.rank_position}</span>
                      {game?.name ?? "Unknown game"}
                    </p>
                    <p className="mt-1 text-xs text-white/70">
                      Score {row.score} · {row.broad_rating}
                    </p>
                    {game?.id ? <RerankButton gameId={game.id} /> : null}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredRows.length === 0 ? (
            <p className="text-sm text-white/70">No ranked games yet. Add one from the home page.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
