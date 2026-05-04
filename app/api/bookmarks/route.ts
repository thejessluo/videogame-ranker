import { NextResponse } from "next/server";
import { slugify } from "@/lib/ranking/beli";
import { createClient } from "@/lib/supabase/server";

type BookmarkBody = {
  mode: "rawg" | "manual";
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

async function resolveGameId(body: BookmarkBody, userId: string) {
  const supabase = await createClient();
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
    if (error || !data) throw new Error(error?.message ?? "Could not resolve RAWG game.");
    return data.id;
  }

  if (body.mode === "manual" && body.manualGame?.title) {
    const cleanGenres = (body.manualGame.genres ?? [])
      .filter(Boolean)
      .map((genre) => ({ name: genre, slug: slugify(genre) }));
    const release = body.manualGame.releaseYear ? `${body.manualGame.releaseYear}-01-01` : null;
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
    if (error || !data) throw new Error(error?.message ?? "Could not create manual game.");
    return data.id;
  }

  throw new Error(`Invalid bookmark input for ${userId}.`);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data, error } = await supabase
      .from("user_game_bookmarks")
      .select("id,created_at,game:games(id,name,cover_url,genres_json,released)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bookmarks: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = (await request.json()) as BookmarkBody;
    const gameId = await resolveGameId(body, user.id);

    const { error } = await supabase
      .from("user_game_bookmarks")
      .upsert({ user_id: user.id, game_id: gameId }, { onConflict: "user_id,game_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ status: "bookmarked" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const { error } = await supabase
      .from("user_game_bookmarks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: "removed" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
