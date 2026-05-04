import { NextResponse } from "next/server";
import {
  initialBoundsFromSentiment,
  type BroadRating,
  scoreFromSentimentOrdinal,
  slugify,
} from "@/lib/ranking/beli";
import { resolveRankingDbCtx } from "@/lib/ranking/request-actor";
import { createAdminClientOrNull } from "@/lib/supabase/admin";
import type { RankingDbCtx } from "@/lib/ranking/db-ctx";

export const dynamic = "force-dynamic";

type AddBody = {
  mode: "rawg" | "manual";
  broadRating: BroadRating;
  notes?: string;
  tags?: string[];
  rawgGame?: {
    rawgId: number;
    name: string;
    slug: string;
    coverUrl: string | null;
    released: string | null;
    genres: Array<{ id?: number; name: string; slug?: string }>;
  };
  manualGame?: {
    title: string;
    releaseYear?: string;
    genres?: string[];
  };
};

async function resolveGameId(ctx: RankingDbCtx, body: AddBody): Promise<
  | { ok: true; gameId: string }
  | { ok: false; status: number; error: string }
> {
  if (body.mode === "rawg" && body.rawgGame) {
    const { data, error } = await ctx.client
      .from("games")
      .upsert(
        {
          rawg_id: body.rawgGame.rawgId,
          name: body.rawgGame.name,
          slug: body.rawgGame.slug,
          cover_url: body.rawgGame.coverUrl,
          released: body.rawgGame.released,
          genres_json: body.rawgGame.genres,
          cached_at: new Date().toISOString(),
        },
        { onConflict: "rawg_id" },
      )
      .select("id")
      .single();
    if (error || !data) return { ok: false, status: 500, error: error?.message ?? "Game upsert failed." };
    return { ok: true, gameId: data.id };
  }

  if (body.mode === "manual" && body.manualGame?.title) {
    const cleanGenres = (body.manualGame.genres ?? [])
      .filter(Boolean)
      .map((genre) => ({ name: genre, slug: slugify(genre) }));
    const release = body.manualGame.releaseYear
      ? `${body.manualGame.releaseYear}-01-01`
      : null;

    const { data, error } = await ctx.client
      .from("games")
      .insert({
        rawg_id: null,
        name: body.manualGame.title,
        slug: `${slugify(body.manualGame.title)}-${Date.now()}`,
        released: release,
        genres_json: cleanGenres,
        cached_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, status: 500, error: error?.message ?? "Game insert failed." };
    return { ok: true, gameId: data.id };
  }

  return { ok: false, status: 400, error: "Invalid game input." };
}

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

    const body = (await request.json()) as AddBody;

    const gameResult = await resolveGameId(ctx, body);
    if (!gameResult.ok) {
      return NextResponse.json({ error: gameResult.error }, { status: gameResult.status });
    }
    const gameId = gameResult.gameId;

    const rankingsTable = ctx.mode === "user" ? "user_game_rankings" : "guest_game_rankings";
    const sessionsTable = ctx.mode === "user" ? "ranking_insert_sessions" : "guest_ranking_insert_sessions";
    const ownerCol = ctx.mode === "user" ? "user_id" : "guest_id";
    const ownerId = ctx.mode === "user" ? ctx.userId : ctx.guestId;

    const existingQuery = ctx.client
      .from(rankingsTable)
      .select("id")
      .eq(ownerCol, ownerId)
      .eq("list_scope", "global")
      .eq("list_key", "all")
      .eq("game_id", gameId)
      .maybeSingle();
    const { data: existing } = await existingQuery;
    if (existing) {
      return NextResponse.json({ status: "already_ranked" });
    }

    const { data: ranked, error: rankedError } = await ctx.client
      .from(rankingsTable)
      .select("id,game_id,rank_position,score,status,broad_rating,notes,tags")
      .eq(ownerCol, ownerId)
      .eq("list_scope", "global")
      .eq("list_key", "all")
      .order("rank_position", { ascending: true });
    if (rankedError) return NextResponse.json({ error: rankedError.message }, { status: 500 });

    const current = ranked ?? [];
    const ownerRow =
      ctx.mode === "user" ? { user_id: ctx.userId } : { guest_id: ctx.guestId };

    if (current.length === 0) {
      const { error } = await ctx.client.from(rankingsTable).insert({
        ...ownerRow,
        game_id: gameId,
        list_scope: "global",
        list_key: "all",
        rank_position: 1,
        score: scoreFromSentimentOrdinal(0, 1, body.broadRating),
        status: "played",
        broad_rating: body.broadRating,
        notes: body.notes ?? null,
        tags: body.tags ?? [],
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ status: "inserted", done: true });
    }

    const bounds = initialBoundsFromSentiment(current.length, body.broadRating);
    const { data: session, error: sessionError } = await ctx.client
      .from(sessionsTable)
      .insert({
        ...ownerRow,
        game_id: gameId,
        list_scope: "global",
        list_key: "all",
        low: bounds.low,
        high: Math.min(bounds.high, current.length - 1),
        broad_rating: body.broadRating,
        status: "played",
        notes: body.notes ?? null,
        tags: body.tags ?? [],
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
