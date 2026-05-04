import { NextResponse } from "next/server";
import { searchRawgGames } from "@/lib/rawg";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ games: [] });
  }

  try {
    const games = await searchRawgGames(query, 10);
    return NextResponse.json({
      games: games.map((game) => ({
        rawgId: game.id,
        name: game.name,
        slug: game.slug,
        coverUrl: game.background_image,
        released: game.released,
        genres: game.genres.map((genre) => ({
          id: genre.id,
          name: genre.name,
          slug: genre.slug,
        })),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed." },
      { status: 500 },
    );
  }
}
