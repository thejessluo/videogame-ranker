import { NextResponse } from "next/server";
import { displayScoresForOrderedList } from "@/lib/ranking/beli";
import { resolveRankingDbCtx } from "@/lib/ranking/request-actor";
import { createAdminClientOrNull } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RemoveBody = {
  gameId: string;
};

type RankedRow = {
  game_id: string;
  status: string;
  broad_rating: string;
  notes: string | null;
  tags: string[];
};

/**
 * Removes one game and rewrites the whole global list: rank 1..n and fresh scores
 * from sentiment bands + order within each band (same rules as insert/rerank).
 */
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

    const body = (await request.json()) as RemoveBody;
    if (!body.gameId) return NextResponse.json({ error: "Missing gameId." }, { status: 400 });

    const rankingsTable = ctx.mode === "user" ? "user_game_rankings" : "guest_game_rankings";
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
    const remaining = fullRanked.filter((row) => row.game_id !== body.gameId);
    if (remaining.length === fullRanked.length) {
      return NextResponse.json({ error: "Game is not currently ranked." }, { status: 404 });
    }

    const scores = displayScoresForOrderedList(remaining);
    const rebuiltPayload = remaining.map((row, index) => ({
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

    if (rebuiltPayload.length > 0) {
      const { error: insertError } = await ctx.client.from(rankingsTable).insert(rebuiltPayload);
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ status: "removed", remaining: remaining.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
