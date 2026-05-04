import { NextResponse } from "next/server";
import { getRawgGenres } from "@/lib/rawg";

export const runtime = "nodejs";

export async function GET() {
  try {
    const genres = await getRawgGenres();
    return NextResponse.json({ genres });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
