import { NextResponse } from "next/server";
import { syncRawgCatalog } from "@/lib/rawg-sync";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = (await request.json().catch(() => ({}))) as {
      genreSlug?: string;
      genreSlugs?: string[];
      genresLimit?: number;
      perGenreLimit?: number;
    };
    const perGenreLimit = Math.min(Math.max(body.perGenreLimit ?? 30, 5), 50);
    const genresLimit = Math.min(Math.max(body.genresLimit ?? 1, 1), 16);
    const genreSlugs = body.genreSlug
      ? [body.genreSlug]
      : body.genreSlugs?.length
        ? body.genreSlugs
        : undefined;

    const result = await syncRawgCatalog({
      supabase,
      genreSlugs,
      genresLimit,
      perGenreLimit,
    });

    return NextResponse.json({
      syncedGames: result.syncedGames,
      syncedGenres: result.syncedGenres,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
