import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicProfileFriendCta } from "@/components/public-profile-friend-cta";
import { getPublicProfileFriendCtaInitial } from "@/lib/friends/public-profile-cta";
import { broadRatingDisplayLabel } from "@/lib/ranking/beli";
import { createAdminClientOrNull } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ genre?: string }>;
};

/** Session/cookies must be read per request so friend CTA is not cached as anonymous. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username: raw } = await params;
  const handle = raw.trim().toLowerCase();
  return {
    title: handle ? `@${handle} · Game Ladder` : "Profile · Game Ladder",
    description: `Video game rankings for @${handle} on Game Ladder.`,
  };
}

function readGame(value: unknown) {
  if (Array.isArray(value)) return value[0] ?? null;
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return null;
}

export default async function PublicRankingPage({ params, searchParams }: Props) {
  const { username: raw } = await params;
  const query = await searchParams;
  const username = raw.trim().toLowerCase();
  if (username.length < 3) notFound();

  const admin = createAdminClientOrNull();
  if (!admin) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <p className="text-sm text-white/70">
          Public rankings are not available (missing server configuration).
        </p>
      </main>
    );
  }

  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("id,username")
    .eq("username", username)
    .maybeSingle();

  if (profileError || !profile?.id) notFound();

  const userId = profile.id;

  const supabase = await createClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const friendCtaInitial = await getPublicProfileFriendCtaInitial(
    supabase,
    viewer?.id ?? null,
    userId,
  );

  const { data: rankingRows } = await admin
    .from("user_game_rankings")
    .select(
      "rank_position,score,broad_rating,notes,tags,game:games(id,name,cover_url,genres_json)",
    )
    .eq("user_id", userId)
    .eq("list_scope", "global")
    .eq("list_key", "all")
    .order("rank_position", { ascending: true });

  const rows = rankingRows ?? [];

  const allGenres = Array.from(
    new Set(
      rows
        .flatMap((row) => {
          const game = readGame(row.game) as { genres_json?: Array<{ name?: string }> } | null;
          return game?.genres_json ?? [];
        })
        .map((genre: { name?: string }) => genre?.name)
        .filter(Boolean),
    ),
  ) as string[];

  const selectedGenre = query.genre?.trim();
  const filteredRows = selectedGenre
    ? rows.filter((row) =>
        (((readGame(row.game)?.genres_json as Array<{ name?: string }>) ?? [])).some(
          (genre: { name?: string }) => genre?.name === selectedGenre,
        ),
      )
    : rows;

  const displayName = profile.username ?? username;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            @{displayName}&apos;s ranking
          </h1>
          <p className="mt-1 text-sm text-white/70">Shared game ladder · read-only</p>
          {friendCtaInitial.kind !== "signed_out" && friendCtaInitial.kind !== "self" ? (
            <div className="mt-3">
              <PublicProfileFriendCta profileUserId={userId} initial={friendCtaInitial} />
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {friendCtaInitial.kind === "signed_out" ? (
            <p className="text-sm text-white/60">
              <Link href="/auth" className="text-[var(--accent-2)]">
                Sign in
              </Link>{" "}
              to add this person as a friend.
            </p>
          ) : null}
          {friendCtaInitial.kind === "self" ? (
            <p className="text-sm text-white/60">This is your public share page.</p>
          ) : null}
          <Link href="/" className="text-sm text-[var(--accent-2)]">
            Game Ladder home
          </Link>
        </div>
      </div>

      <section className="panel mb-4 p-4">
        <p className="mb-3 text-sm text-white/70">Filter by genre</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/u/${encodeURIComponent(username)}`}
            className={`btn text-sm ${!selectedGenre ? "btn-primary" : "btn-secondary"}`}
          >
            All
          </Link>
          {allGenres.map((genre) => (
            <Link
              key={genre}
              href={`/u/${encodeURIComponent(username)}?genre=${encodeURIComponent(genre)}`}
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
          <p className="text-sm text-white/70">No ranked games yet.</p>
        ) : (
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
                        Score {row.score} · {broadRatingDisplayLabel(row.broad_rating)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
