import { NextResponse } from "next/server";
import {
  initialBoundsFromSentiment,
  type BroadRating,
  scoreFromRank,
  slugify,
} from "@/lib/ranking/beli";
import { createClient } from "@/lib/supabase/server";

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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = (await request.json()) as AddBody;
    let gameId = "";

    if (body.mode === "rawg" && body.rawgGame) {
      const { data, error } = await supabase
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
      if (error || !data) return NextResponse.json({ error: error?.message }, { status: 500 });
      gameId = data.id;
    } else if (body.mode === "manual" && body.manualGame?.title) {
      const cleanGenres = (body.manualGame.genres ?? [])
        .filter(Boolean)
        .map((genre) => ({ name: genre, slug: slugify(genre) }));
      const release = body.manualGame.releaseYear
        ? `${body.manualGame.releaseYear}-01-01`
        : null;

      const { data, error } = await supabase
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
      if (error || !data) return NextResponse.json({ error: error?.message }, { status: 500 });
      gameId = data.id;
    } else {
      return NextResponse.json({ error: "Invalid game input." }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("user_game_rankings")
      .select("id")
      .eq("user_id", user.id)
      .eq("list_scope", "global")
      .eq("list_key", "all")
      .eq("game_id", gameId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ status: "already_ranked" });
    }

    const { data: ranked, error: rankedError } = await supabase
      .from("user_game_rankings")
      .select("id,game_id,rank_position,score,status,broad_rating,notes,tags")
      .eq("user_id", user.id)
      .eq("list_scope", "global")
      .eq("list_key", "all")
      .order("rank_position", { ascending: true });
    if (rankedError) return NextResponse.json({ error: rankedError.message }, { status: 500 });

    const current = ranked ?? [];
    if (current.length === 0) {
      const { error } = await supabase.from("user_game_rankings").insert({
        user_id: user.id,
        game_id: gameId,
        list_scope: "global",
        list_key: "all",
        rank_position: 1,
        score: scoreFromRank(0, 1),
        status: "played",
        broad_rating: body.broadRating,
        notes: body.notes ?? null,
        tags: body.tags ?? [],
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ status: "inserted", done: true });
    }

    const bounds = initialBoundsFromSentiment(current.length, body.broadRating);
    const { data: session, error: sessionError } = await supabase
      .from("ranking_insert_sessions")
      .insert({
        user_id: user.id,
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
