import Link from "next/link";
import { RankingGameRows } from "@/components/ranking-game-rows";
import { fetchMyRankings, type HomeRankingRow } from "@/lib/ranking/home-data";
import { createClient } from "@/lib/supabase/server";

type RankingsPageProps = {
  searchParams: Promise<{
    genre?: string;
  }>;
};

function readGame(value: unknown) {
  if (Array.isArray(value)) return value[0] ?? null;
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return null;
}

export default async function RankingsPage({ searchParams }: RankingsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rankingRows = (await fetchMyRankings()) as HomeRankingRow[];

  const allGenres = Array.from(
    new Set(
      rankingRows
        .flatMap((row) => {
          const game = readGame(row.game) as { genres_json?: Array<{ name?: string }> } | null;
          return game?.genres_json ?? [];
        })
        .map((genre: { name?: string }) => genre?.name)
        .filter(Boolean),
    ),
  ) as string[];

  const selectedGenre = params.genre?.trim();
  const filteredRows = selectedGenre
    ? rankingRows.filter((row) =>
        (((readGame(row.game)?.genres_json as Array<{ name?: string }>) ?? [])).some(
          (genre: { name?: string }) => genre?.name === selectedGenre,
        ),
      )
    : rankingRows;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Your global ranking</h1>
          <p className="text-sm text-white/70">Binary-search inserted order is source of truth.</p>
        </div>
        <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-end sm:gap-3">
          {user ? (
            <Link href="/friends" className="text-sm text-[var(--accent-2)]">
              Friends
            </Link>
          ) : null}
          <Link href="/" className="text-sm text-[var(--accent-2)]">
            Add another game
          </Link>
        </div>
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
        {filteredRows.length === 0 ? (
          <p className="text-sm text-white/70">
            {selectedGenre && rankingRows.length > 0 ? (
              <>
                No games tagged &ldquo;{selectedGenre}&rdquo; in your ranking. Try{" "}
                <Link href="/rankings" className="text-[var(--accent-2)]">
                  All
                </Link>
                .
              </>
            ) : (
              <>
                No ranked games yet. Add one from the{" "}
                <Link href="/" className="text-[var(--accent-2)]">
                  home page
                </Link>
                .
              </>
            )}
          </p>
        ) : (
          <RankingGameRows rows={filteredRows} showRowActions />
        )}
      </section>
    </main>
  );
}
