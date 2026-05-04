import { NextResponse } from "next/server";
import { resolveRankingDbCtx } from "@/lib/ranking/request-actor";
import { rankGloballyFromPendingSession } from "@/lib/ranking/session-engine";
import { RANKING_GUEST_UNAVAILABLE } from "@/lib/ranking/guest-messages";
import { createAdminClientOrNull } from "@/lib/supabase/admin";

type FollowupBody = {
  sessionId: string;
  action: "rank_globally_anyway" | "save_unranked";
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

    const body = (await request.json()) as FollowupBody;
    if (!body.sessionId || !body.action) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const sessionsTable = ctx.mode === "user" ? "ranking_insert_sessions" : "guest_ranking_insert_sessions";
    const ownerCol = ctx.mode === "user" ? "user_id" : "guest_id";
    const ownerId = ctx.mode === "user" ? ctx.userId : ctx.guestId;

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

    await rankGloballyFromPendingSession(ctx, body.sessionId);
    return NextResponse.json({ status: "ranked_globally_anyway" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
