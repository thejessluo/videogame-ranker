import { NextResponse } from "next/server";
import { displayScoresForOrderedList, initialBoundsFromSentiment } from "@/lib/ranking/beli";
import { resolveRankingDbCtx } from "@/lib/ranking/request-actor";
import { createAdminClientOrNull } from "@/lib/supabase/admin";

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
    const ctx = await resolveRankingDbCtx();
    if (!ctx) {
      const admin = createAdminClientOrNull();
      if (!admin) {
        return NextResponse.json(
          {
            error:
              "Sign in to continue, or set SUPABASE_SERVICE_ROLE_KEY on the server for anonymous rankings.",
          },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as FollowupBody;
    if (!body.sessionId || !body.action) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const rankingsTable = ctx.mode === "user" ? "user_game_rankings" : "guest_game_rankings";
    const sessionsTable = ctx.mode === "user" ? "ranking_insert_sessions" : "guest_ranking_insert_sessions";
    const ownerCol = ctx.mode === "user" ? "user_id" : "guest_id";
    const ownerId = ctx.mode === "user" ? ctx.userId : ctx.guestId;
    const ownerRow = ctx.mode === "user" ? { user_id: ctx.userId } : { guest_id: ctx.guestId };

    const { data: session, error: sessionError } = await ctx.client
      .from(sessionsTable)
      .select("id,game_id,broad_rating,status,notes,tags,completed")
      .eq("id", body.sessionId)
      .eq(ownerCol, ownerId)
      .single();
    if (sessionError || !session) {
      return NextResponse.json({ error: sessionError?.message ?? "Session not found." }, { status: 404 });
    }

    if (body.action === "save_unranked") {
      await ctx.client
        .from(sessionsTable)
        .update({ completed: true, updated_at: new Date().toISOString() })
        .eq("id", session.id);
      return NextResponse.json({ status: "saved_unranked" });
    }

    const { data: existing } = await ctx.client
      .from(rankingsTable)
      .select("id")
      .eq(ownerCol, ownerId)
      .eq("list_scope", "global")
      .eq("list_key", "all")
      .eq("game_id", session.game_id)
      .maybeSingle();
    if (existing) return NextResponse.json({ status: "already_ranked" });

    const { data: rankedRows, error: rankedError } = await ctx.client
      .from(rankingsTable)
      .select("game_id,status,broad_rating,notes,tags")
      .eq(ownerCol, ownerId)
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

    const scores = displayScoresForOrderedList(finalList);
    const payload = finalList.map((row, index) => ({
      ...ownerRow,
      list_scope: "global",
      list_key: "all",
      game_id: row.game_id,
      rank_position: index + 1,
      score: scores[index]!,
      status: row.status ?? "played",
      broad_rating: row.broad_rating ?? "okay",
      notes: row.notes ?? null,
      tags: row.tags ?? [],
      updated_at: new Date().toISOString(),
    }));

    const { error: deleteError } = await ctx.client
      .from(rankingsTable)
      .delete()
      .eq(ownerCol, ownerId)
      .eq("list_scope", "global")
      .eq("list_key", "all");
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    const { error: insertError } = await ctx.client.from(rankingsTable).insert(payload);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    await ctx.client
      .from(sessionsTable)
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
