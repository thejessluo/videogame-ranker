import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_ELO, updateEloRatings } from "@/lib/ranking/elo";

type VoteBody = {
  genreSlug?: string;
  gameAId?: string;
  gameBId?: string;
  winnerGameId?: string;
};

type RatingRow = {
  game_id: string;
  rating_mu: number | string;
  comparisons_count: number;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as VoteBody;
    const { genreSlug, gameAId, gameBId, winnerGameId } = body;

    if (!genreSlug || !gameAId || !gameBId || !winnerGameId) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    if (gameAId === gameBId || (winnerGameId !== gameAId && winnerGameId !== gameBId)) {
      return NextResponse.json({ error: "Invalid game selection." }, { status: 400 });
    }

    const loserGameId = winnerGameId === gameAId ? gameBId : gameAId;

    const { data: existingRatings, error: ratingReadError } = await supabase
      .from("genre_ratings")
      .select("game_id,rating_mu,comparisons_count")
      .eq("user_id", user.id)
      .eq("genre_slug", genreSlug)
      .in("game_id", [winnerGameId, loserGameId]);

    if (ratingReadError) {
      return NextResponse.json({ error: ratingReadError.message }, { status: 500 });
    }

    const byGameId = new Map(
      (existingRatings ?? []).map((row) => [row.game_id, row as RatingRow]),
    );

    const winnerCurrent = Number(byGameId.get(winnerGameId)?.rating_mu ?? DEFAULT_ELO);
    const loserCurrent = Number(byGameId.get(loserGameId)?.rating_mu ?? DEFAULT_ELO);
    const winnerComparisons = byGameId.get(winnerGameId)?.comparisons_count ?? 0;
    const loserComparisons = byGameId.get(loserGameId)?.comparisons_count ?? 0;

    const { winner, loser } = updateEloRatings({
      winnerRating: winnerCurrent,
      loserRating: loserCurrent,
    });

    const { error: comparisonError } = await supabase.from("comparisons").insert({
      user_id: user.id,
      genre_slug: genreSlug,
      game_a_id: gameAId,
      game_b_id: gameBId,
      winner_game_id: winnerGameId,
    });

    if (comparisonError) {
      return NextResponse.json({ error: comparisonError.message }, { status: 500 });
    }

    const { error: upsertError } = await supabase.from("genre_ratings").upsert(
      [
        {
          user_id: user.id,
          genre_slug: genreSlug,
          game_id: winnerGameId,
          rating_mu: winner,
          rating_sigma: 350,
          comparisons_count: winnerComparisons + 1,
        },
        {
          user_id: user.id,
          genre_slug: genreSlug,
          game_id: loserGameId,
          rating_mu: loser,
          rating_sigma: 350,
          comparisons_count: loserComparisons + 1,
        },
      ],
      { onConflict: "user_id,genre_slug,game_id" },
    );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      updatedRatings: {
        [winnerGameId]: winner,
        [loserGameId]: loser,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
