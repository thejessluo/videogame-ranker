import { NextResponse } from "next/server";
import { syncRawgCatalog } from "@/lib/rawg-sync";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const result = await syncRawgCatalog({
      supabase,
      genresLimit: 10,
      perGenreLimit: 25,
    });

    return NextResponse.json({
      ok: true,
      syncedGames: result.syncedGames,
      syncedGenres: result.syncedGenres,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
