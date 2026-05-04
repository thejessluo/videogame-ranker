import { NextResponse } from "next/server";
import {
  initialBoundsFromSentiment,
  scoreFromRank,
  type BroadRating,
} from "@/lib/ranking/beli";
import { createClient } from "@/lib/supabase/server";

type RerankBody = {
  gameId: string;
};

type RankedRow = {
  game_id: string;
  status: string;
  broad_rating: string;
  notes: string | null;
  tags: string[];
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = (await request.json()) as RerankBody;
    if (!body.gameId) return NextResponse.json({ error: "Missing gameId." }, { status: 400 });

    const { data: rankedRows, error: rankedError } = await supabase
      .from("user_game_rankings")
      .select("game_id,status,broad_rating,notes,tags")
      .eq("user_id", user.id)
      .eq("list_scope", "global")
      .eq("list_key", "all")
      .order("rank_position", { ascending: true });
    if (rankedError) return NextResponse.json({ error: rankedError.message }, { status: 500 });

    const fullRanked = (rankedRows ?? []) as RankedRow[];
    const target = fullRanked.find((row) => row.game_id === body.gameId);
    if (!target) {
      return NextResponse.json({ error: "Game is not currently ranked." }, { status: 404 });
    }

    const remaining = fullRanked.filter((row) => row.game_id !== body.gameId);
    const rebuiltPayload = remaining.map((row, index) => ({
      user_id: user.id,
      list_scope: "global",
      list_key: "all",
      game_id: row.game_id,
      rank_position: index + 1,
      score: scoreFromRank(index, remaining.length),
      status: row.status ?? "played",
      broad_rating: row.broad_rating ?? "okay",
      notes: row.notes ?? null,
      tags: row.tags ?? [],
      updated_at: new Date().toISOString(),
    }));

    const { error: deleteError } = await supabase
      .from("user_game_rankings")
      .delete()
      .eq("user_id", user.id)
      .eq("list_scope", "global")
      .eq("list_key", "all");
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    if (rebuiltPayload.length > 0) {
      const { error: rebuildError } = await supabase
        .from("user_game_rankings")
        .insert(rebuiltPayload);
      if (rebuildError) return NextResponse.json({ error: rebuildError.message }, { status: 500 });
    }

    if (remaining.length === 0) {
      const { error: singleInsertError } = await supabase.from("user_game_rankings").insert({
        user_id: user.id,
        list_scope: "global",
        list_key: "all",
        game_id: target.game_id,
        rank_position: 1,
        score: 10,
        status: target.status ?? "played",
        broad_rating: target.broad_rating ?? "okay",
        notes: target.notes ?? null,
        tags: target.tags ?? [],
      });
      if (singleInsertError) {
        return NextResponse.json({ error: singleInsertError.message }, { status: 500 });
      }
      return NextResponse.json({ status: "reranked_directly" });
    }

    const bounds = initialBoundsFromSentiment(
      remaining.length,
      target.broad_rating as BroadRating,
    );
    const { data: session, error: sessionError } = await supabase
      .from("ranking_insert_sessions")
      .insert({
        user_id: user.id,
        game_id: target.game_id,
        list_scope: "global",
        list_key: "all",
        low: bounds.low,
        high: Math.min(bounds.high, remaining.length - 1),
        broad_rating: target.broad_rating,
        status: target.status,
        notes: target.notes ?? null,
        tags: target.tags ?? [],
      })
      .select("id")
      .single();
    if (sessionError || !session) {
      return NextResponse.json({ error: sessionError?.message }, { status: 500 });
    }

    return NextResponse.json({ status: "session_started", sessionId: session.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
