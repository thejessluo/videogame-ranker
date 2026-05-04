import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type FriendPageProps = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ genre?: string }>;
};

function readGame(value: unknown) {
  if (Array.isArray(value)) return value[0] ?? null;
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return null;
}

export default async function FriendProfilePage({ params, searchParams }: FriendPageProps) {
  const { userId } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");
  if (userId === user.id) redirect("/");

  const pair =
    user.id < userId
      ? { user_a_id: user.id, user_b_id: userId }
      : { user_a_id: userId, user_b_id: user.id };

  const { data: friendship, error: friendshipError } = await supabase
    .from("friendships")
    .select("id")
    .eq("user_a_id", pair.user_a_id)
    .eq("user_b_id", pair.user_b_id)
    .maybeSingle();

  if (friendshipError) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <p className="text-sm text-red-300">{friendshipError.message}</p>
      </main>
    );
  }
  if (!friendship) notFound();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id,username")
    .eq("id", userId)
    .maybeSingle();

  const { data: rankingRows } = await supabase
    .from("user_game_rankings")
    .select(
      "rank_position,score,broad_rating,notes,tags,game:games(id,name,cover_url,genres_json)",
    )
    .eq("user_id", userId)
    .eq("list_scope", "global")
    .eq("list_key", "all")
    .order("rank_position", { ascending: true });

  const allGenres = Array.from(
    new Set(
      (rankingRows ?? [])
        .flatMap((row) => {
          const game = readGame(row.game) as { genres_json?: Array<{ name?: string }> } | null;
          return game?.genres_json ?? [];
        })
        .map((genre) => genre?.name)
        .filter(Boolean),
    ),
  ) as string[];

  const selectedGenre = query.genre?.trim();
  const filteredRows = selectedGenre
    ? (rankingRows ?? []).filter((row) =>
        (((readGame(row.game)?.genres_json as Array<{ name?: string }>) ?? [])).some(
          (genre) => genre?.name === selectedGenre,
        ),
      )
    : (rankingRows ?? []);

  const { data: bookmarks } = await supabase
    .from("user_game_bookmarks")
    .select("id,created_at,game:games(id,name,cover_url,genres_json)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Friend</h1>
          <p className="text-sm text-white/70">
            {profile?.username ? `@${profile.username}` : userId}
          </p>
        </div>
        <Link href="/friends" className="text-sm text-[var(--accent-2)]">
          Back to friends
        </Link>
      </div>

      <section className="panel mb-4 p-4">
        <p className="mb-3 text-sm text-white/70">Filter rankings by genre</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/friends/${userId}`}
            className={`btn text-sm ${!selectedGenre ? "btn-primary" : "btn-secondary"}`}
          >
            All
          </Link>
          {allGenres.map((genre) => (
            <Link
              key={genre}
              href={`/friends/${userId}?genre=${encodeURIComponent(genre)}`}
              className={`btn text-sm ${genre === selectedGenre ? "btn-primary" : "btn-secondary"}`}
            >
              {genre}
            </Link>
          ))}
        </div>
      </section>

      <section className="panel mb-4 p-4">
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
                  </div>
                </div>
              </div>
            );
          })}
          {filteredRows.length === 0 ? (
            <p className="text-sm text-white/70">No ranked games yet.</p>
          ) : null}
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 text-lg font-medium">Bookmarked games</h2>
        <div className="space-y-2">
          {(bookmarks ?? []).map((bookmark) => {
            const game = readGame(bookmark.game) as
              | { name?: string; cover_url?: string | null; genres_json?: Array<{ name?: string }> }
              | null;
            return (
              <div key={bookmark.id} className="rounded-xl bg-black/20 px-3 py-3">
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
                    <p className="truncate text-sm font-medium">{game?.name ?? "Unknown game"}</p>
                    <p className="mt-1 text-xs text-white/70">
                      {(game?.genres_json ?? [])
                        .map((g) => g.name)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {(bookmarks ?? []).length === 0 ? (
            <p className="text-sm text-white/70">No bookmarks yet.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
