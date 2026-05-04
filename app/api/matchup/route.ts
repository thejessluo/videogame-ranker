import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type GameRow = {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
  released: string | null;
};

type RatingRow = {
  game_id: string;
  rating_mu: number | string;
  comparisons_count: number;
};

export const runtime = "nodejs";

function pickTwoGames(games: GameRow[], ratingsByGameId: Map<string, RatingRow>) {
  const scored = games.map((game) => {
    const rating = ratingsByGameId.get(game.id);
    const comparisons = rating?.comparisons_count ?? 0;
    return {
      game,
      score: comparisons + Math.random() * 0.5,
    };
  });

  scored.sort((a, b) => a.score - b.score);
  return [scored[0]?.game, scored[1]?.game].filter(Boolean) as GameRow[];
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const genreSlug = searchParams.get("genre");

    if (!genreSlug) {
      return NextResponse.json(
        { error: "Missing genre query parameter." },
        { status: 400 },
      );
    }

    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("id,name,slug,cover_url,released")
      .contains("genres_json", [{ slug: genreSlug }])
      .limit(80);

    if (gamesError) {
      return NextResponse.json({ error: gamesError.message }, { status: 500 });
    }

    if (!games || games.length < 2) {
      return NextResponse.json(
        {
          error: "Not enough games in this genre. Run /api/rawg/sync first.",
        },
        { status: 409 },
      );
    }

    const gameIds = games.map((game) => game.id);
    const { data: ratings, error: ratingsError } = await supabase
      .from("genre_ratings")
      .select("game_id,rating_mu,comparisons_count")
      .eq("user_id", user.id)
      .eq("genre_slug", genreSlug)
      .in("game_id", gameIds);

    if (ratingsError) {
      return NextResponse.json({ error: ratingsError.message }, { status: 500 });
    }

    const ratingsByGameId = new Map(
      (ratings ?? []).map((row) => [row.game_id, row as RatingRow]),
    );
    const pair = pickTwoGames(games as GameRow[], ratingsByGameId);

    if (pair.length < 2) {
      return NextResponse.json(
        { error: "Could not generate matchup." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      genre: genreSlug,
      games: pair.map((game) => ({
        ...game,
        rating:
          Number(ratingsByGameId.get(game.id)?.rating_mu ?? 1200) || 1200,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
