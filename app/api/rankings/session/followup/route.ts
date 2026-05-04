import { NextResponse } from "next/server";
import { initialBoundsFromSentiment, scoreFromRank } from "@/lib/ranking/beli";
import { createClient } from "@/lib/supabase/server";

type FollowupBody = {
  sessionId: string;
  action: "rank_globally_anyway" | "save_unranked";
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

    const body = (await request.json()) as FollowupBody;
    if (!body.sessionId || !body.action) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabase
      .from("ranking_insert_sessions")
      .select("id,game_id,broad_rating,status,notes,tags,completed")
      .eq("id", body.sessionId)
      .eq("user_id", user.id)
      .single();
    if (sessionError || !session) {
      return NextResponse.json({ error: sessionError?.message ?? "Session not found." }, { status: 404 });
    }

    if (body.action === "save_unranked") {
      await supabase
        .from("ranking_insert_sessions")
        .update({ completed: true, updated_at: new Date().toISOString() })
        .eq("id", session.id);
      return NextResponse.json({ status: "saved_unranked" });
    }

    const { data: existing } = await supabase
      .from("user_game_rankings")
      .select("id")
      .eq("user_id", user.id)
      .eq("list_scope", "global")
      .eq("list_key", "all")
      .eq("game_id", session.game_id)
      .maybeSingle();
    if (existing) return NextResponse.json({ status: "already_ranked" });

    const { data: rankedRows, error: rankedError } = await supabase
      .from("user_game_rankings")
      .select("game_id,status,broad_rating,notes,tags")
      .eq("user_id", user.id)
      .eq("list_scope", "global")
      .eq("list_key", "all")
      .order("rank_position", { ascending: true });
    if (rankedError) return NextResponse.json({ error: rankedError.message }, { status: 500 });

    const fullRanked = (rankedRows ?? []) as RankedRow[];
    const bounds = initialBoundsFromSentiment(fullRanked.length, session.broad_rating);
    const insertAt = Math.max(
      0,
      Math.min(
        fullRanked.length,
        Math.floor((Math.max(bounds.low, 0) + Math.max(bounds.high, 0)) / 2),
      ),
    );

    const finalList = [...fullRanked];
    finalList.splice(insertAt, 0, {
      game_id: session.game_id,
      status: session.status,
      broad_rating: session.broad_rating,
      notes: session.notes,
      tags: session.tags ?? [],
    });

    const payload = finalList.map((row, index) => ({
      user_id: user.id,
      list_scope: "global",
      list_key: "all",
      game_id: row.game_id,
      rank_position: index + 1,
      score: scoreFromRank(index, finalList.length),
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

    const { error: insertError } = await supabase
      .from("user_game_rankings")
      .insert(payload);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    await supabase
      .from("ranking_insert_sessions")
      .update({ completed: true, updated_at: new Date().toISOString() })
      .eq("id", session.id);

    return NextResponse.json({ status: "ranked_globally_anyway" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
