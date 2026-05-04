import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { discoverRawgGamesByGenre, getRawgGenres, toGameRecord } from "@/lib/rawg";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = (await request.json().catch(() => ({}))) as {
      genreSlug?: string;
      limit?: number;
    };

    const limit = Math.min(Math.max(body.limit ?? 25, 5), 50);
    const genreSlug = body.genreSlug;

    const genres = await getRawgGenres();
    const targetGenre =
      genres.find((genre) => genre.slug === genreSlug) ?? genres[0];

    if (!targetGenre) {
      return NextResponse.json(
        { error: "No RAWG genres found." },
        { status: 404 },
      );
    }

    const rawgGames = await discoverRawgGamesByGenre(targetGenre.slug, limit);
    const rows = rawgGames.map(toGameRecord);

    if (rows.length === 0) {
      return NextResponse.json({ synced: 0, genre: targetGenre.slug });
    }

    const { error } = await supabase
      .from("games")
      .upsert(rows, { onConflict: "rawg_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      synced: rows.length,
      genre: targetGenre.slug,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
