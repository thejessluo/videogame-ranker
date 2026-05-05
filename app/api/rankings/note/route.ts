import { NextResponse } from "next/server";
import { resolveRankingDbCtx } from "@/lib/ranking/request-actor";
import { RANKING_GUEST_UNAVAILABLE } from "@/lib/ranking/guest-messages";
import { createAdminClientOrNull } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type NoteBody = {
  gameId: string;
  notes?: string;
};

export async function POST(request: Request) {
  try {
    const ctx = await resolveRankingDbCtx();
    if (!ctx) {
      const admin = createAdminClientOrNull();
      if (!admin) {
        return NextResponse.json({ error: RANKING_GUEST_UNAVAILABLE }, { status: 503 });
      }
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as NoteBody;
    const gameId = body.gameId?.trim();
    if (!gameId) return NextResponse.json({ error: "Missing gameId." }, { status: 400 });

    const rankingsTable = ctx.mode === "user" ? "user_game_rankings" : "guest_game_rankings";
    const ownerCol = ctx.mode === "user" ? "user_id" : "guest_id";
    const ownerId = ctx.mode === "user" ? ctx.userId : ctx.guestId;
    const normalizedNote = body.notes?.trim().slice(0, 100) || null;

    const { data: rankedRow, error: rankedError } = await ctx.client
      .from(rankingsTable)
      .select("id")
      .eq(ownerCol, ownerId)
      .eq("list_scope", "global")
      .eq("list_key", "all")
      .eq("game_id", gameId)
      .maybeSingle();

    if (rankedError) return NextResponse.json({ error: rankedError.message }, { status: 500 });
    if (!rankedRow) return NextResponse.json({ error: "Game is not currently ranked." }, { status: 404 });

    const { error: updateError } = await ctx.client
      .from(rankingsTable)
      .update({
        notes: normalizedNote,
        updated_at: new Date().toISOString(),
      })
      .eq(ownerCol, ownerId)
      .eq("list_scope", "global")
      .eq("list_key", "all")
      .eq("game_id", gameId);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ status: "updated", notes: normalizedNote });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
