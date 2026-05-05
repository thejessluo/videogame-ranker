import { NextResponse } from "next/server";
import {
  type BroadRating,
  normalizeBroadRating,
  scoreFromSentimentOrdinal,
  tierInsertInclusiveBounds,
} from "@/lib/ranking/beli";
import { resolveRankingDbCtx } from "@/lib/ranking/request-actor";
import { RANKING_GUEST_UNAVAILABLE } from "@/lib/ranking/guest-messages";
import { applyGlobalRankingOrder } from "@/lib/ranking/session-engine";
import { createAdminClientOrNull } from "@/lib/supabase/admin";

type RerankBody = {
  gameId: string;
  broadRating?: BroadRating;
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
            error: RANKING_GUEST_UNAVAILABLE,
          },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as RerankBody;
    if (!body.gameId) return NextResponse.json({ error: "Missing gameId." }, { status: 400 });
    if (!body.broadRating) {
      return NextResponse.json({ error: "Missing broadRating." }, { status: 400 });
    }

    const rankingsTable = ctx.mode === "user" ? "user_game_rankings" : "guest_game_rankings";
    const sessionsTable = ctx.mode === "user" ? "ranking_insert_sessions" : "guest_ranking_insert_sessions";
    const ownerCol = ctx.mode === "user" ? "user_id" : "guest_id";
    const ownerId = ctx.mode === "user" ? ctx.userId : ctx.guestId;
    const ownerRow = ctx.mode === "user" ? { user_id: ctx.userId } : { guest_id: ctx.guestId };

    const { data: rankedRows, error: rankedError } = await ctx.client
      .from(rankingsTable)
      .select("game_id,status,broad_rating,notes,tags")
      .eq(ownerCol, ownerId)
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
    const br = normalizeBroadRating(body.broadRating);

    if (remaining.length === 0) {
      const { error: singleUpdateError } = await ctx.client
        .from(rankingsTable)
        .update({
          rank_position: 1,
          score: scoreFromSentimentOrdinal(0, 1, br),
          status: target.status ?? "played",
          broad_rating: br,
          notes: target.notes ?? null,
          tags: target.tags ?? [],
          updated_at: new Date().toISOString(),
        })
        .eq(ownerCol, ownerId)
        .eq("list_scope", "global")
        .eq("list_key", "all")
        .eq("game_id", target.game_id);
      if (singleUpdateError) {
        return NextResponse.json({ error: singleUpdateError.message }, { status: 500 });
      }
      return NextResponse.json({ status: "reranked_directly" });
    }

    const { minG, maxG } = tierInsertInclusiveBounds(remaining, br);

    if (minG === maxG) {
      const merged = [
        ...remaining.map((r) => ({
          game_id: r.game_id,
          status: r.status ?? "played",
          broad_rating: r.broad_rating,
          notes: r.notes,
          tags: r.tags ?? [],
        })),
      ];
      merged.splice(minG, 0, {
        game_id: target.game_id,
        status: target.status ?? "played",
        broad_rating: br,
        notes: target.notes,
        tags: target.tags ?? [],
      });
      await applyGlobalRankingOrder(ctx, merged);
      return NextResponse.json({ status: "reranked_directly" });
    }

    const { data: session, error: sessionError } = await ctx.client
      .from(sessionsTable)
      .insert({
        ...ownerRow,
        game_id: target.game_id,
        list_scope: "global",
        list_key: "all",
        low: 0,
        high: Math.max(0, remaining.length - 1),
        broad_rating: br,
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
